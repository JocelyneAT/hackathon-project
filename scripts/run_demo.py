"""Exercise the real HTTP API with three synthetic career-planning profiles."""

from __future__ import annotations

import argparse
import json
from copy import deepcopy
from pathlib import Path

import httpx

PROFILES = {
    "A: Career starter": {
        "career_stage": "starter",
        "direction": "explore",
        "education": "Synthetic university student, no professional experience",
        "background": "Used Excel for a group assignment and presented findings with communication skills.",
        "projects": "Academic project comparing local recycling survey responses.",
        "skill_ids": ["excel", "communication"],
        "interests": ["analytics", "sustainability"],
        "weekly_hours": 6,
        "budget": "free",
        "experience_years": 0,
    },
    "B: Working professional": {
        "career_stage": "professional",
        "direction": "explore",
        "education": "Synthetic business diploma",
        "occupation_id": "admin-assistant",
        "background": "Administration: prepare reports in Excel, schedule meetings and support colleagues.",
        "skill_ids": ["excel", "communication", "sql"],
        "reported_experience": {
            "sql": "Studied SQL; no independently completed SQL activities yet"
        },
        "interests": ["operations", "analytics"],
        "weekly_hours": 4,
        "budget": "free",
        "experience_years": 4,
    },
    "C: Target career": {
        "career_stage": "starter",
        "direction": "target",
        "occupation_id": "data-analyst",
        "education": "Synthetic computing graduate",
        "background": "Academic SQL and Python project with Excel charts.",
        "projects": "Cleaned a public dataset and explained exploratory findings.",
        "skill_ids": ["sql", "python", "excel"],
        "interests": ["analytics", "technology"],
        "weekly_hours": 8,
        "budget": "free",
        "experience_years": 0,
    },
}


def request(client: httpx.Client, path: str, payload: dict) -> dict:
    response = client.post("/api/v1/" + path, json=payload)
    response.raise_for_status()
    return response.json()


def complete_synthetic_sql_assessment(client: httpx.Client) -> str:
    # Fixture answers belong to this explicitly synthetic demonstration. The
    # production assessment API does not send its keys before submission.
    fixture_answers = {"sql-f1": "b", "sql-a1": "c", "sql-a2": "d"}
    state = request(client, "assessments/start", {"skill_id": "sql"})
    for _ in range(3):
        question = state["question"]
        assert "expected_answer" not in question and "rubric" not in question
        if question["id"] not in fixture_answers:
            raise AssertionError(
                "The SQL demonstration fixture must be updated for the current question bank."
            )
        state = request(
            client,
            "assessments/submit",
            {
                "assessment_id": state["assessment_id"],
                "question_id": question["id"],
                "answer": fixture_answers[question["id"]],
            },
        )
    assert state["status"] == "completed"
    assert state["result"]["estimated_proficiency"] == 2
    assert state["result"]["assessment_status"] == "provisional"
    return state["assessment_id"]


def run_demo(base_url: str) -> dict:
    results = []
    with httpx.Client(
        base_url=base_url.rstrip("/"), timeout=30, trust_env=False
    ) as client:
        health = client.get("/health")
        health.raise_for_status()
        assert health.json()["database"]["status"] == "connected"
        coverage = client.get("/api/v1/system/coverage").json()
        assert coverage["supported_countries"] == ["MY"]
        upload = client.post(
            "/api/v1/cv/extract",
            files={
                "file": (
                    "synthetic.txt",
                    b"Education\nComputing diploma\nProjects\nUsed SQL and MS Excel for an academic project.",
                    "text/plain",
                )
            },
        )
        upload.raise_for_status()
        assert all(
            skill["estimated_proficiency"] is None for skill in upload.json()["skills"]
        )
        for name, fixture in PROFILES.items():
            profile = {"country": "MY", "employment_country": "MY", **deepcopy(fixture)}
            payload = {"profile": profile, "scenario": "moderate"}
            before = request(client, "profiles/analyze", payload)
            assert all(
                skill["estimated_proficiency"] is None for skill in before["skills"]
            )
            if profile["career_stage"] == "professional":
                current = client.get("/api/v1/occupations/admin-assistant").json()
                profile["task_ids"] = [task["id"] for task in current["tasks"][:2]]
            if profile["direction"] == "target":
                profile["assessment_ids"] = [complete_synthetic_sql_assessment(client)]
                after = request(client, "profiles/analyze", payload)
                sql = next(
                    skill for skill in after["skills"] if skill["skill_id"] == "sql"
                )
                assert sql["estimated_proficiency"] == 2
            intelligence = request(client, "profiles/analyze", payload)
            careers = request(client, "careers/recommend", payload)
            selected = careers["selected_occupation_id"]
            if profile["direction"] == "target":
                assert selected == "data-analyst"
            payload["occupation_id"] = selected
            gaps = request(client, "careers/skill-gaps", payload)
            impact = request(client, "ai-impact/analyze", payload)
            if profile["career_stage"] == "professional":
                assert impact["occupation_id"] == "admin-assistant"
                assert {task["id"] for task in impact["tasks"]} == set(
                    profile["task_ids"]
                )
            scenarios = request(client, "scenarios/compare", payload)
            assert any(row["difference"] != 0 for row in scenarios["comparisons"])
            roadmap = request(client, "roadmaps/generate", payload)
            milestones = roadmap["milestones"]
            assert milestones and roadmap["total_hours"] > 0
            simulation = request(
                client,
                "skills/impact",
                {**payload, "skill_id": "sql", "target_level": 3},
            )
            assert simulation["modified_skills"] == ["sql"]
            assert any(row["difference"] > 0 for row in simulation["occupations"])
            empty_projection = request(
                client, "employers/match", {**payload, "milestone_ids": []}
            )
            employers = request(
                client,
                "employers/match",
                {
                    **payload,
                    "milestone_ids": [milestone["id"] for milestone in milestones],
                },
            )
            assert employers["roles"]
            baseline = {role["id"]: role["fit"] for role in empty_projection["roles"]}
            assert any(
                role["fit"] > baseline[role["id"]] for role in employers["roles"]
            )
            assert all(
                "synthetic" in role["vacancy_status"].lower()
                for role in employers["roles"]
            )
            inspector = request(client, "insights/explain-career-score", payload)
            assert inspector["calculation"]["occupation_id"] == selected
            chosen = next(
                career
                for career in careers["careers"]
                if career["occupation_id"] == selected
            )
            results.append(
                {
                    "profile": name,
                    "selected_career": chosen["title"],
                    "career_fit": chosen["fit"],
                    "career_fit_range": chosen["fit_range"],
                    "evidence_skills": len(intelligence["skills"]),
                    "uncertain_requirements": sum(
                        skill["status"] == "unverified" for skill in gaps["skills"]
                    ),
                    "task_exposure": impact["exposure_index"],
                    "learning_milestones": len(milestones),
                    "estimated_weeks": roadmap["total_weeks"],
                    "projected_employer_fits": [
                        {"role": role["title"], "fit": role["fit"]}
                        for role in employers["roles"]
                    ],
                    "checks": "CV optional; evidence uncertainty; real assessment for C; scenario changes; one-skill simulation; selected-milestone employer projection",
                }
            )
        request_payload = {"profile": {"employment_country": "SG"}}
        assert (
            client.post("/api/v1/careers/recommend", json=request_payload).status_code
            == 422
        )
        insights = client.get("/api/v1/system/insights")
        insights.raise_for_status()
        assert insights.json()["counts"]["occupations"] >= 8
    assert (
        len(
            {
                (row["career_fit"], row["selected_career"], row["estimated_weeks"])
                for row in results
            }
        )
        == 3
    )
    return {
        "status": "passed",
        "base_url": base_url,
        "profiles": results,
        "boundary_checks": [
            "Unsupported market rejected",
            "System Insights uses database counts",
            "CV mention never establishes proficiency",
        ],
        "evidence_limitations": "Planning requirements and AI exposure are illustrative; employers and market snapshots are synthetic, not vacancies or forecasts.",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument(
        "--output",
        type=Path,
        help="Optionally save the non-sensitive synthetic result summary as JSON",
    )
    args = parser.parse_args()
    try:
        result = run_demo(args.base_url)
    except (httpx.HTTPError, AssertionError, KeyError, ValueError) as exc:
        parser.exit(1, f"Demo failed: {exc}\nStart the backend and inspect its logs.\n")
    output = json.dumps(result, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output + "\n", encoding="utf-8")
    print(output)
