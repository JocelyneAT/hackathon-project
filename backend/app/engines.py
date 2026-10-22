"""Deterministic planning indices. All uncertainty stays visible in the outputs."""

from __future__ import annotations

import math
import json
import os
import re
from copy import deepcopy
from typing import Any

from fastapi import HTTPException

from .schemas import IntelligenceRequest, Profile

MODEL_VERSION = "shiftos-rules-1.0"
WEIGHTS = json.loads(os.getenv("SCORING_WEIGHTS", '{"skills":0.55,"interests":0.25,"feasibility":0.20}'))
if (
    set(WEIGHTS) != {"skills", "interests", "feasibility"}
    or any(
        isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or v < 0
        for v in WEIGHTS.values()
    )
    or not math.isclose(sum(WEIGHTS.values()), 1)
):
    raise ValueError(
        "SCORING_WEIGHTS must contain finite nonnegative skills, interests and feasibility weights summing to 1."
    )
INTEREST_ALIASES = {
    "analysis": {"analytics"},
    "business": {"operations", "organisation", "problem-solving"},
    "people": {"people", "collaboration", "communication"},
}
LEVEL_NAMES = {
    1: "Awareness",
    2: "Basic application",
    3: "Independent application",
    4: "Complex application",
    5: "Advanced expertise",
}
PRACTICE_GUIDANCE = {
    "sql": (
        "Use two related sample tables. Write one query to filter rows, one to join the tables, "
        "and one to calculate totals by group.",
        "Save the three queries and their results. Check the results against the sample rows "
        "and explain what each query does.",
    ),
    "excel": (
        "Make a sample sales sheet with 20 rows. Fix missing or duplicate values, calculate "
        "totals with formulas, and make a pivot table comparing sales by category.",
        "Save the workbook with the original and cleaned data. Check the formulas and pivot "
        "table against a manual total.",
    ),
    "python": (
        "Create a list of sample sales records. Write a function and a loop that calculate "
        "totals by category and print the results.",
        "Save the code and its output. Test it with an empty list and one extra record, "
        "then check that both results are correct.",
    ),
    "statistics": (
        "Use a sample of 20 numbers split into two groups. Calculate each group's mean, "
        "median, and range. Write three sentences comparing the groups and one limitation.",
        "Keep the numbers and calculations. Check the results by hand and explain why "
        "this small sample cannot describe everyone.",
    ),
    "communication": (
        "Use results from a sample sales table. Write a five-sentence update with the main "
        "finding, one limitation, and one action. Present the update aloud in two minutes.",
        "Keep the written update or a recording. Ask someone to identify your main finding "
        "and next action, then revise anything unclear.",
    ),
    "business-analysis": (
        "Write a short request for a sample order-tracking tool. Name its users, list five "
        "things they need it to do, and write three acceptance checks.",
        "Save the request and checks. Walk through one sample order and show how each "
        "check would confirm that the tool works as requested.",
    ),
    "automation": (
        "Build a manually triggered flow that adds a sample request to a table and sends "
        "a confirmation. Test it with complete information and with a required value missing.",
        "Keep the flow steps and both test results. Confirm that a valid request is saved "
        "once and that missing information receives a clear response.",
    ),
    "power-bi": (
        "Load a small sample sales CSV into Power BI and clean a column. Make a one-page "
        "report with a total-sales measure, a category table, and a filter.",
        "Save the report. Match its total to the CSV, apply the filter, and explain "
        "how the filtered total changes.",
    ),
    "sustainability": (
        "Make a table of sample monthly waste amounts and activity totals. Calculate waste "
        "per unit of activity, compare two months, and propose one way to reduce waste.",
        "Keep the table, units, and calculations. Check one result by hand and label the "
        "figures as practice data rather than an organisation's measured results.",
    ),
}


def catalog() -> dict[str, Any]:
    from .data import get_catalog

    return get_catalog()


def require_market(profile: Profile) -> None:
    if profile.employment_country != "MY":
        raise HTTPException(
            422,
            detail={
                "code": "unsupported_market",
                "country": profile.employment_country,
                "message": "Country architecture is available; career and employer datasets currently support Malaysia only.",
            },
        )


def scenario_definitions(data: dict | None = None) -> dict[str, dict]:
    """The imported catalogue owns the assumptions applied by both planning engines."""
    data = data or catalog()
    return {
        item["id"]: {
            "name": item["name"],
            "priority_multipliers": item.get("priority_multipliers", {}),
            "learning_multiplier": item.get("learning_multiplier", 1),
            "assumptions": item["assumptions"],
            "evidence_status": item.get("evidence_status", "curated illustrative"),
            "applied_fields": ["priority_multipliers", "learning_multiplier"],
        }
        for item in data["scenarios"]
    }


def scenario_configuration(scenario_id: str, data: dict) -> dict:
    config = scenario_definitions(data).get(scenario_id)
    if config is None:
        raise HTTPException(503, "The selected scenario configuration has not been imported.")
    return config


def learning_effort(row: dict, skill: dict, config: dict) -> int:
    level = row["provisional_level"]
    if level is not None and level >= row["required_level"]:
        return 0
    assumed = 1 if level is None else level
    return math.ceil(
        max(1, row["required_level"] - assumed)
        * skill.get("hours_per_level", 12)
        * config["learning_multiplier"]
    )


def occupation(occupation_id: str | None, data: dict | None = None) -> dict:
    data = data or catalog()
    item = next((x for x in data["occupations"] if x["id"] == occupation_id), None)
    if item is None:
        raise HTTPException(404, "Occupation not found")
    return item


def skill_name(skill_id: str, data: dict) -> str:
    return next(
        (x.get("name", x.get("title", skill_id)) for x in data["skills"] if x["id"] == skill_id), skill_id
    )


def detect_skills(text: str, data: dict | None = None) -> list[dict]:
    data = data or catalog()
    found = []
    for skill in data["skills"]:
        aliases = [skill.get("name", skill["id"]), skill["id"], *skill.get("aliases", [])]
        for alias in aliases:
            match = re.search(r"(?<!\w)" + re.escape(alias) + r"(?!\w)", text, re.IGNORECASE)
            if match:
                found.append(
                    {
                        "skill_id": skill["id"],
                        "name": skill.get("name", skill["id"]),
                        "source_phrase": match.group(0),
                    }
                )
                break
    return found


def analyze_profile(profile: Profile, data: dict | None = None) -> dict:
    data = data or catalog()
    valid_ids = {s["id"] for s in data["skills"]}
    unknown = (
        set(profile.skill_ids) | set(profile.reported_experience) | {e.skill_id for e in profile.cv_evidence}
    ) - valid_ids
    if unknown:
        raise HTTPException(422, "Unknown skill identifiers: " + ", ".join(sorted(unknown)))
    detections = detect_skills(profile.background + "\n" + profile.projects, data)
    detected_by_id = {s["skill_id"]: s for s in detections}
    ids = (
        set(profile.skill_ids)
        | set(detected_by_id)
        | set(profile.reported_experience)
        | {e.skill_id for e in profile.cv_evidence}
    )
    from .assessment import lookup_results

    results = lookup_results(profile.assessment_ids)
    assessed: dict[str, dict] = {}
    for result in results:
        skill_id = result["skill_id"]
        previous = assessed.get(skill_id)
        if not previous or (result.get("estimated_proficiency") or 0) > (
            previous.get("estimated_proficiency") or 0
        ):
            assessed[skill_id] = result
        ids.add(skill_id)
    skills = []
    for sid in sorted(ids & valid_ids):
        result = assessed.get(sid)
        evidence = []
        if sid in profile.skill_ids:
            evidence.append("Manually reported skill; proficiency unknown")
        if sid in detected_by_id:
            evidence.append("Profile mention: " + detected_by_id[sid]["source_phrase"])
        evidence.extend(
            "User-reviewed CV mention: " + e.source_phrase for e in profile.cv_evidence if e.skill_id == sid
        )
        report = profile.reported_experience.get(sid)
        if report:
            evidence.append("Self-reported experience: " + report)
        if result:
            evidence.append(
                "Curated assessment: " + result.get("explanation", "Limited foundational assessment")
            )
        skills.append(
            {
                "skill_id": sid,
                "name": skill_name(sid, data),
                "detected": True,
                "reported_experience": report,
                "estimated_proficiency": result.get("estimated_proficiency") if result else None,
                "confidence": result.get("confidence", "Moderate") if result else "Low",
                "assessment_status": result.get("assessment_status", "provisional")
                if result
                else "Unverified",
                "evidence": evidence,
                "verification": "Limited tested competencies only" if result else "Not assessed",
                "proficiency_kind": "provisional foundational assessment" if result else "unknown",
            }
        )
    return {
        "skills": skills,
        "assessment_priorities": [x["skill_id"] for x in skills if x["estimated_proficiency"] is None][:3],
        "warnings": [
            "A skill mention or self-report does not establish demonstrated proficiency.",
            "Short assessments cover foundational competencies only.",
        ],
        "model_version": MODEL_VERSION,
    }


def requirements(occ: dict) -> list[dict]:
    return occ.get("requirements", occ.get("skills", []))


def gaps(profile: Profile, occ: dict, data: dict | None = None) -> dict:
    data = data or catalog()
    evidence = {s["skill_id"]: s for s in analyze_profile(profile, data)["skills"]}
    rows = []
    for req in requirements(occ):
        sid = req["skill_id"]
        e = evidence.get(sid, {})
        level = e.get("estimated_proficiency")
        needed = req["required_level"]
        rows.append(
            {
                "skill_id": sid,
                "name": skill_name(sid, data),
                "required_level": needed,
                "demonstrated_level": None,
                "provisional_level": level,
                "status": "unverified" if level is None else "provisional" if level >= needed else "gap",
                "gap": None,
                "provisional_gap": None if level is None else max(0, needed - level),
                "assessment_status": e.get("assessment_status", "Unverified"),
                "confidence": e.get("confidence", "Insufficient evidence"),
                "reported": sid in evidence,
                "weight": req.get("weight", 1),
            }
        )
    return {
        "occupation_id": occ["id"],
        "title": occ["title"],
        "skills": rows,
        "assessment_priorities": [
            r["skill_id"]
            for r in sorted(rows, key=lambda r: r["weight"], reverse=True)
            if r["status"] == "unverified"
        ][:3],
    }


def source_records(occ: dict, data: dict) -> list[dict]:
    source_ids = {occ.get("source_id")}
    return [s for s in data["sources"] if s["id"] in source_ids]


def career_score(profile: Profile, occ: dict, scenario: str, data: dict) -> dict:
    skill_rows = gaps(profile, occ, data)["skills"]
    scenario_config = scenario_configuration(scenario, data)
    total_weight = 0.0
    weighted = low = high = confirmed = 0.0
    for row in skill_rows:
        weight = row["weight"] * scenario_config["priority_multipliers"].get(row["skill_id"], 1)
        required = max(1, row["required_level"])
        level = row["provisional_level"]
        # Unknown remains null. 1-3 is a declared exploratory range, not an assessed result.
        lower, middle, upper = (1.0, 1.5, 3.0) if level is None else (level, level, level)
        weighted += weight * min(1, middle / required)
        low += weight * min(1, lower / required)
        high += weight * min(1, upper / required)
        confirmed += weight if level is not None and level >= required else 0
        total_weight += weight
    denominator = total_weight or 1
    skill_component = weighted / denominator * 100
    interest_tags = set(occ.get("interests", []))
    user_tags = set(profile.interests)
    interest_matches = [tag for tag in sorted(user_tags) if interest_tags & INTEREST_ALIASES.get(tag, {tag})]
    interest_component = 50 if not user_tags else 100 * len(interest_matches) / max(1, min(len(user_tags), 3))
    interest_component = min(100, interest_component)
    skill_lookup = {s["id"]: s for s in data["skills"]}
    estimated_hours = sum(
        learning_effort(row, skill_lookup[row["skill_id"]], scenario_config) for row in skill_rows
    )
    feasibility = max(20, 100 - estimated_hours / max(1, profile.weekly_hours) * 2)
    fixed = interest_component * WEIGHTS["interests"] + feasibility * WEIGHTS["feasibility"]
    score = round(skill_component * WEIGHTS["skills"] + fixed)
    sdgs = [x for x in data.get("sdg_mappings", []) if x.get("occupation_id") == occ["id"]]
    return {
        "occupation_id": occ["id"],
        "title": occ["title"],
        "fit": score,
        "fit_range": [
            round(low / denominator * 100 * WEIGHTS["skills"] + fixed),
            round(high / denominator * 100 * WEIGHTS["skills"] + fixed),
        ],
        "coverage": round(100 * confirmed / denominator),
        "matching_skills": [r["name"] for r in skill_rows if r["status"] in {"met", "provisional"}],
        "unverified_skills": [r["name"] for r in skill_rows if r["status"] == "unverified"],
        "missing_skills": [r["name"] for r in skill_rows if r["status"] == "gap"],
        "explanation": f"Planning index combines skill evidence ({WEIGHTS['skills']:.0%}), interests ({WEIGHTS['interests']:.0%}), and learning feasibility ({WEIGHTS['feasibility']:.0%}). Short-assessment levels remain provisional. Experience is not a pathway penalty.",
        "factors": {
            "skills": round(skill_component, 1),
            "interests": round(interest_component, 1),
            "feasibility": round(feasibility, 1),
        },
        "interest_matches": interest_matches,
        "factor_contributions": {
            "skills": round(skill_component * WEIGHTS["skills"], 2),
            "interests": round(interest_component * WEIGHTS["interests"], 2),
            "feasibility": round(feasibility * WEIGHTS["feasibility"], 2),
        },
        "estimated_learning_hours": round(estimated_hours),
        "transition_feasibility": "Within a shorter learning plan"
        if estimated_hours < 100
        else "A sustained learning plan is suggested",
        "market_outlook": "No verified occupation demand data imported. No market bonus is applied.",
        "sdgs": sdgs,
        "sources": source_records(occ, data),
        "evidence_status": occ.get("evidence_status", "curated illustrative"),
        "model_version": MODEL_VERSION,
    }


def recommend(request: IntelligenceRequest) -> dict:
    require_market(request.profile)
    data = catalog()
    careers = sorted(
        [
            career_score(request.profile, o, request.scenario, data)
            for o in data["occupations"]
            if o.get("country", "MY") == "MY"
        ],
        key=lambda c: c["fit"],
        reverse=True,
    )
    selected = request.occupation_id or (
        request.profile.occupation_id if request.profile.direction == "target" else None
    )
    if selected:
        occupation(selected, data)
    else:
        selected = careers[0]["occupation_id"] if careers else None
    return {
        "careers": careers,
        "selected_occupation_id": selected,
        "model_version": MODEL_VERSION,
        "scenario": request.scenario,
        "scoring_weights": WEIGHTS,
        "dataset_versions": [item["id"] for item in data["dataset_versions"]],
        "assumptions": [
            "Fit is an unvalidated planning index, not current vacancy eligibility or a hiring probability.",
            "Unknown skills use an illustrative level 1-3 range (midpoint 1.5 for ranking), never recorded as demonstrated skill.",
            *scenario_configuration(request.scenario, data)["assumptions"],
        ],
    }


def selected_occupation(request: IntelligenceRequest) -> dict:
    selected = request.occupation_id or (
        request.profile.occupation_id if request.profile.direction == "target" else None
    )
    if not selected:
        selected = recommend(request)["selected_occupation_id"]
    return occupation(selected)


def ai_impact(request: IntelligenceRequest) -> dict:
    require_market(request.profile)
    data = catalog()
    target = selected_occupation(request)
    # A professional's actual task inventory can refer to their current occupation.
    current_id = request.profile.current_occupation_id
    if current_id is None and request.profile.direction == "explore":
        current_id = request.profile.occupation_id  # Compatibility with original explore-mode payloads.
    impact_occ = (
        occupation(current_id, data)
        if request.profile.career_stage == "professional" and current_id
        else target
    )
    tasks = [dict(t) for t in data["tasks"] if t["occupation_id"] == impact_occ["id"]]
    if request.profile.task_ids:
        tasks = [t for t in tasks if t["id"] in request.profile.task_ids]
    usable = [t for t in tasks if t.get("weight", 0) > 0 and t.get("exposure") is not None]
    weights = sum(t["weight"] for t in usable)
    value = round(100 * sum(t["weight"] * t["exposure"] for t in usable) / weights) if weights else None
    for t in tasks:
        t["weighted_contribution"] = (
            round(100 * t.get("weight", 0) * t.get("exposure", 0) / weights, 2) if weights else None
        )
    return {
        "occupation_id": impact_occ["id"],
        "title": impact_occ["title"],
        "exposure_index": value,
        "category": "Insufficient task data"
        if value is None
        else "Higher exposure"
        if value >= 65
        else "Moderate exposure"
        if value >= 35
        else "Lower exposure",
        "tasks": tasks,
        "augmentation": [t.get("augmentation", "Review AI outputs before use") for t in tasks],
        "human_judgment": [t["description"] for t in tasks if t.get("human_judgment")],
        "adaptation_skills": sorted({s for t in tasks for s in t.get("adaptation_skills", [])}),
        "uncertainty": [
            "Illustrative task indicators are not measured research findings.",
            "Technical exposure does not establish adoption, demand decline, or job loss.",
            "A missing or empty task inventory produces no exposure estimate.",
        ],
        "formula": "100 × Σ(task weight × exposure) / Σ(task weight)",
        "evidence_status": "curated illustrative",
        "sources": source_records(impact_occ, data),
    }


def roadmap(request: IntelligenceRequest) -> dict:
    require_market(request.profile)
    data = catalog()
    occ = selected_occupation(request)
    rows = gaps(request.profile, occ, data)["skills"]
    skill_lookup = {s["id"]: s for s in data["skills"]}
    config = scenario_configuration(request.scenario, data)
    milestones = []
    for row in rows:
        if row["status"] in {"met", "provisional"}:
            continue
        sid = row["skill_id"]
        skill = skill_lookup[sid]
        exercise, verification = PRACTICE_GUIDANCE.get(
            sid,
            (
                f"Create a documented practical example using {row['name']} and explain your decisions.",
                "Keep your work and explain how you checked it. Completing this practice task "
                "does not establish verified proficiency.",
            ),
        )
        current = row["provisional_level"]
        assumed = 1 if current is None else current
        effort = learning_effort(row, skill, config)
        resources = [
            r
            for r in data["resources"]
            if sid in r.get("skill_ids", [])
            and (request.profile.budget == "paid" or r.get("cost", "free").lower() == "free")
        ]
        transferability = sum(any(r["skill_id"] == sid for r in requirements(o)) for o in data["occupations"])
        priority = (
            row["weight"]
            * (row["required_level"] - assumed + 1)
            * (1 + transferability / len(data["occupations"]))
            / max(1, math.sqrt(effort))
        )
        priority *= config["priority_multipliers"].get(sid, 1)
        milestones.append(
            {
                "id": f"{occ['id']}:{sid}",
                "skill_id": sid,
                "skill_name": row["name"],
                "title": ("Verify, then develop " if current is None else "Develop ") + row["name"],
                "target_level": row["required_level"],
                "target_descriptor": LEVEL_NAMES[row["required_level"]],
                "current_level": current,
                "status": "Optional verification first" if current is None else "Provisional assessment gap",
                "hours": effort,
                "weeks": math.ceil(effort / request.profile.weekly_hours),
                "prerequisites": skill.get("prerequisites", []),
                "resources": resources,
                "exercise": skill.get("exercise", exercise),
                "verification": skill.get("verification", verification),
                "priority": round(priority, 3),
            }
        )
    pending = sorted(milestones, key=lambda m: m["priority"], reverse=True)
    ordered: list[dict] = []
    needed = {m["skill_id"] for m in pending}
    while pending:
        ready = next(
            (m for m in pending if not (set(m["prerequisites"]) & needed - {x["skill_id"] for x in ordered})),
            pending[0],
        )
        ordered.append(ready)
        pending.remove(ready)
    total = sum(m["hours"] for m in ordered)
    return {
        "occupation_id": occ["id"],
        "title": occ["title"],
        "milestones": ordered,
        "total_hours": total,
        "total_weeks": math.ceil(total / request.profile.weekly_hours),
        "weekly_hours": request.profile.weekly_hours,
        "portfolio_project": occ.get(
            "portfolio_project",
            f"Build a small {occ['title'].lower()} portfolio project with a public dataset, documented decisions and an evaluation of its limitations.",
        ),
        "assumptions": [
            "For unknown proficiency, verify first; study hours assume level 1 only for scheduling and can be revised after assessment.",
            "Short-assessment estimates are provisional knowledge evidence, not full practical verification.",
            "Hours are curated effort estimates, not guaranteed completion times.",
            f"The scenario applies a {config['learning_multiplier']:g}× effort multiplier for additional adaptation practice.",
            *config["assumptions"],
        ],
    }


def scenario_comparison(request: IntelligenceRequest) -> dict:
    scenarios = []
    scores: dict[str, dict] = {}
    priorities = {}
    configurations = scenario_definitions()
    for sid in ["moderate", "accelerated"]:
        conf = configurations[sid]
        variant = request.model_copy(update={"scenario": sid})
        result = recommend(variant)
        scenarios.append(
            {
                "id": sid,
                "name": conf["name"],
                "assumptions": conf["assumptions"],
                "careers": result["careers"],
            }
        )
        scores[sid] = {c["occupation_id"]: c for c in result["careers"]}
        priorities[sid] = [m["skill_name"] for m in roadmap(variant)["milestones"]]
    comparisons = [
        {
            "occupation_id": oid,
            "title": c["title"],
            "moderate": c["fit"],
            "accelerated": scores["accelerated"][oid]["fit"],
            "difference": scores["accelerated"][oid]["fit"] - c["fit"],
        }
        for oid, c in scores["moderate"].items()
    ]
    return {
        "scenarios": scenarios,
        "comparisons": comparisons,
        "priorities": priorities,
        "model_version": MODEL_VERSION,
    }


def confirmed_coverage(reqs: list[dict], levels: dict[str, int | None]) -> tuple[float, int]:
    total = sum(r.get("weight", 1) for r in reqs)
    met = [
        r
        for r in reqs
        if levels.get(r["skill_id"]) is not None and levels[r["skill_id"]] >= r["required_level"]
    ]
    return (round(100 * sum(r.get("weight", 1) for r in met) / total) if total else 0), len(met)


def skill_impact(request: IntelligenceRequest) -> dict:
    require_market(request.profile)
    data = catalog()
    if request.skill_id not in {s["id"] for s in data["skills"]}:
        raise HTTPException(422, "Select a valid skill")
    levels = {
        s["skill_id"]: s["estimated_proficiency"] for s in analyze_profile(request.profile, data)["skills"]
    }
    projected = dict(levels)
    if levels.get(request.skill_id) is not None and request.target_level <= levels[request.skill_id]:
        raise HTTPException(
            422, "Choose a target above the current provisional estimate to simulate an improvement."
        )
    projected[request.skill_id] = max(request.target_level, levels.get(request.skill_id) or 0)
    rows = []
    for occ in data["occupations"]:
        if not any(r["skill_id"] == request.skill_id for r in requirements(occ)):
            continue
        before, count_before = confirmed_coverage(requirements(occ), levels)
        after, count_after = confirmed_coverage(requirements(occ), projected)
        rows.append(
            {
                "occupation_id": occ["id"],
                "title": occ["title"],
                "before": before,
                "after": after,
                "difference": after - before,
                "additional_requirements": count_after - count_before,
            }
        )
    return {
        "skill_id": request.skill_id,
        "target_level": request.target_level,
        "modified_skills": [request.skill_id],
        "occupations": rows,
        "assumptions": [
            f"Only {skill_name(request.skill_id, data)} is projected to level {request.target_level}; other skills are unchanged.",
            "Coverage counts requirements satisfied by provisional assessment estimates or explicitly projected levels. Unknown evidence is not demonstrated absence.",
            "This simulation does not update assessed evidence or imply employment.",
        ],
    }


def employers(request: IntelligenceRequest) -> dict:
    require_market(request.profile)
    data = catalog()
    occ = selected_occupation(request)
    plan = roadmap(request)
    profile_data = analyze_profile(request.profile, data)
    levels = {s["skill_id"]: s["estimated_proficiency"] for s in profile_data["skills"]}
    selected = [
        m for m in plan["milestones"] if request.milestone_ids is None or m["id"] in request.milestone_ids
    ]
    valid_ids = {m["id"] for m in plan["milestones"]}
    if request.milestone_ids is not None and set(request.milestone_ids) - valid_ids:
        raise HTTPException(422, "Milestone does not belong to the selected roadmap")
    for milestone in selected:
        levels[milestone["skill_id"]] = max(levels.get(milestone["skill_id"]) or 0, milestone["target_level"])
    roles = []
    for role in data["employer_roles"]:
        if (
            role.get("occupation_id") != occ["id"]
            or role.get("country") != request.profile.employment_country
        ):
            continue
        reqs = requirements(role)
        if not reqs:
            continue
        fit, _ = confirmed_coverage(reqs, levels)
        satisfied = [
            skill_name(r["skill_id"], data)
            for r in reqs
            if levels.get(r["skill_id"]) is not None and levels[r["skill_id"]] >= r["required_level"]
        ]
        remaining = [
            f"{skill_name(r['skill_id'], data)} level {r['required_level']}"
            for r in reqs
            if levels.get(r["skill_id"]) is None or levels[r["skill_id"]] < r["required_level"]
        ]
        required_experience = role.get("experience_years", 0)
        roles.append(
            {
                **deepcopy(role),
                "fit": fit,
                "requirements_satisfied": satisfied,
                "remaining_requirements": remaining,
                "education_eligibility": "Review documented requirement: "
                + str(role.get("education", "Not specified")),
                "experience_eligibility": "Meets the reported experience requirement"
                if request.profile.experience_years >= required_experience
                else f"Requires {required_experience} years; profile reports {request.profile.experience_years:g}",
                "work_authorization": role.get(
                    "work_authorization", "Not assessed; confirm eligibility with employer"
                ),
                "vacancy_status": "Synthetic demonstration; not an actual vacancy",
                "source_status": role.get("source_status", "synthetic demonstration"),
            }
        )
    roles.sort(key=lambda r: (-r["fit"], r.get("experience_years", 0)))
    evidence = gaps(request.profile, occ, data)["skills"]
    return {
        "occupation_id": occ["id"],
        "title": occ["title"],
        "roles": roles,
        "projection_assumption": f"Assumes future practical verification of {len(selected)} explicitly selected learning milestones. Current short-assessment levels remain provisional; projected skills are not yet demonstrated.",
        "projected_skill_ids": [m["skill_id"] for m in selected],
        "summary": {
            "selected_career": occ["title"],
            "supporting_competencies": [
                s["name"] + " (provisional)" for s in evidence if s["status"] in {"met", "provisional"}
            ],
            "unverified_skills": [s["name"] for s in evidence if s["status"] == "unverified"],
            "priority_milestones": [m["title"] for m in selected[:3]],
            "portfolio_project": plan["portfolio_project"],
            "potential_roles": [r["employer_name"] + ": " + r["title"] for r in roles[:3]],
            "next_action": "Verify one important uncertain skill, then complete the first selected milestone and produce portfolio evidence.",
        },
    }
