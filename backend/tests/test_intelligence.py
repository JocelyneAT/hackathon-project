import io
import math
from copy import deepcopy

import pytest
from docx import Document
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from backend.app import assessment, engines
from backend.app.data import get_catalog
from backend.app.main import app
from backend.app.schemas import IntelligenceRequest

client = TestClient(app)


def payload(**updates):
    value = {
        "profile": {
            "career_stage": "starter",
            "skill_ids": ["excel", "communication"],
            "interests": ["analysis"],
            "weekly_hours": 6,
        },
        "occupation_id": "data-analyst",
    }
    value.update(updates)
    return value


def post(path, body=None):
    response = client.post("/api/v1/" + path, json=body or payload())
    assert response.status_code == 200, response.text
    return response.json()


def complete_assessment(skill="sql"):
    state = client.post("/api/v1/assessments/start", json={"skill_id": skill}).json()
    while state["status"] != "completed":
        question = state["question"]
        answer = next(
            q["expected_answer"] for q in assessment.QUESTION_BANK[skill] if q["id"] == question["id"]
        )
        state = client.post(
            "/api/v1/assessments/submit",
            json={"assessment_id": state["assessment_id"], "question_id": question["id"], "answer": answer},
        ).json()
    return state["assessment_id"]


def test_health_and_database():
    result = client.get("/health").json()
    assert result["status"] == "healthy"
    assert result["database"]["status"] == "connected"


def test_no_experience_no_cv_no_assessment_user_works():
    body = payload()
    starter = post("careers/recommend", body)
    body["profile"]["experience_years"] = 8
    experienced = post("careers/recommend", body)
    assert starter["careers"] == experienced["careers"]
    assert len(starter["careers"]) >= 8


def test_mentions_normalized_but_never_grant_proficiency():
    result = post(
        "profiles/analyze",
        payload(
            profile={"background": "Used MS Excel and Structured Query Language, PowerBI in my project."}
        ),
    )
    assert {"excel", "sql", "power-bi"} <= {s["skill_id"] for s in result["skills"]}
    assert all(s["estimated_proficiency"] is None for s in result["skills"])


def test_self_report_stays_unverified():
    result = post(
        "profiles/analyze",
        payload(profile={"skill_ids": ["sql"], "reported_experience": {"sql": "Studied SQL"}}),
    )
    assert result["skills"][0]["assessment_status"] == "Unverified"
    assert result["skills"][0]["estimated_proficiency"] is None


def test_assessed_evidence_updates_all_downstream_calculations():
    aid = complete_assessment()
    body = payload(profile={"skill_ids": ["sql"], "assessment_ids": [aid]})
    analyzed = post("profiles/analyze", body)
    sql = next(s for s in analyzed["skills"] if s["skill_id"] == "sql")
    assert sql["estimated_proficiency"] == 2
    rows = post("careers/skill-gaps", body)["skills"]
    sql_gap = next(s for s in rows if s["skill_id"] == "sql")
    assert sql_gap["demonstrated_level"] is None
    assert sql_gap["provisional_level"] == 2
    assert sql_gap["gap"] is None
    assert sql_gap["provisional_gap"] == sql_gap["required_level"] - 2


def test_unknown_skill_is_null_and_uncertain_not_zero():
    rows = post("careers/skill-gaps")["skills"]
    assert all(
        r["demonstrated_level"] is None and r["gap"] is None and r["status"] == "unverified" for r in rows
    )


def test_career_target_is_respected_even_if_not_top_ranked():
    result = post(
        "careers/recommend",
        payload(
            profile={"direction": "target", "occupation_id": "sustainability-analyst"}, occupation_id=None
        ),
    )
    assert result["selected_occupation_id"] == "sustainability-analyst"


def test_score_contributions_explain_score():
    career = post("careers/recommend")["careers"][0]
    assert abs(career["fit"] - sum(career["factor_contributions"].values())) <= 0.51
    assert career["fit_range"][0] <= career["fit"] <= career["fit_range"][1]
    assert "probability" in post("careers/recommend")["assumptions"][0]


def test_ai_exposure_matches_weighted_task_calculation():
    result = post("ai-impact/analyze")
    tasks = result["tasks"]
    expected = round(100 * sum(t["weight"] * t["exposure"] for t in tasks) / sum(t["weight"] for t in tasks))
    assert result["exposure_index"] == expected
    assert result["evidence_status"] == "curated illustrative"


def test_actual_professional_tasks_override_target_task_inventory():
    data = get_catalog()
    task = next(t for t in data["tasks"] if t["occupation_id"] == "admin-assistant")
    body = payload(
        profile={"career_stage": "professional", "occupation_id": "admin-assistant", "task_ids": [task["id"]]}
    )
    result = post("ai-impact/analyze", body)
    assert result["occupation_id"] == "admin-assistant"
    assert len(result["tasks"]) == 1
    assert result["exposure_index"] == round(100 * task["exposure"])


def test_empty_task_inventory_no_divide_by_zero():
    result = post("ai-impact/analyze", payload(profile={"task_ids": ["not-a-task"]}))
    assert result["exposure_index"] is None


def test_scenario_changes_real_calculations():
    body = payload(
        profile={
            "skill_ids": ["excel"],
            "assessment_ids": [complete_assessment("excel")],
            "interests": ["analysis"],
        }
    )
    result = post("scenarios/compare", body)
    assert any(row["difference"] != 0 for row in result["comparisons"])
    assert result["scenarios"][0]["assumptions"] != result["scenarios"][1]["assumptions"]


def test_roadmap_time_uses_weekly_availability():
    slow = post("roadmaps/generate", payload(profile={"weekly_hours": 3}))
    fast = post("roadmaps/generate", payload(profile={"weekly_hours": 12}))
    assert slow["total_hours"] == fast["total_hours"]
    assert slow["total_weeks"] == math.ceil(slow["total_hours"] / 3)
    assert fast["total_weeks"] <= slow["total_weeks"]
    assert all(m["status"] == "Optional verification first" for m in fast["milestones"])


def test_roadmap_respects_prerequisite_order_and_real_resources():
    plan = post("roadmaps/generate")
    ids = [m["skill_id"] for m in plan["milestones"]]
    for milestone in plan["milestones"]:
        for prerequisite in milestone["prerequisites"]:
            if prerequisite in ids:
                assert ids.index(prerequisite) < ids.index(milestone["skill_id"])
        assert all(r["url"].startswith("https://") and r["cost"] == "free" for r in milestone["resources"])


@pytest.mark.parametrize(
    "skill_id, task, output",
    [
        ("sql", "join the tables", "three queries"),
        ("excel", "pivot table", "workbook"),
        ("python", "function and a loop", "code and its output"),
        ("statistics", "mean, median, and range", "numbers and calculations"),
        ("communication", "five-sentence update", "written update or a recording"),
        ("business-analysis", "three acceptance checks", "request and checks"),
        ("automation", "required value missing", "both test results"),
        ("power-bi", "category table", "save the report"),
        ("sustainability", "waste per unit of activity", "practice data"),
    ],
)
def test_roadmap_gives_each_skill_a_specific_practice_task_and_output(skill_id, task, output):
    career = next(
        o for o in get_catalog()["occupations"] if any(r["skill_id"] == skill_id for r in o["requirements"])
    )
    plan = post("roadmaps/generate", payload(occupation_id=career["id"]))
    milestone = next(m for m in plan["milestones"] if m["skill_id"] == skill_id)
    assert task in milestone["exercise"].lower()
    assert output in milestone["verification"].lower()
    assert "create a documented practical example" not in milestone["exercise"].lower()
    assert milestone["current_level"] is None


def test_roadmap_practice_guidance_keeps_the_existing_schedule():
    plan = post("roadmaps/generate", payload(profile={"weekly_hours": 8}))
    assert [(m["skill_id"], m["hours"]) for m in plan["milestones"]] == [
        ("sql", 32),
        ("excel", 24),
        ("communication", 20),
        ("statistics", 36),
        ("python", 22),
    ]
    assert plan["total_hours"] == 134
    assert plan["total_weeks"] == 17
    assert all(m["resources"] and m["current_level"] is None for m in plan["milestones"])


def test_roadmap_supports_future_skills_and_imported_practice_guidance(monkeypatch):
    data = deepcopy(get_catalog())
    future_skill = {**data["skills"][0], "id": "future-skill", "name": "Future skill", "prerequisites": []}
    data["skills"].append(future_skill)
    career = next(o for o in data["occupations"] if o["id"] == "data-analyst")
    career["requirements"] = [{"skill_id": "future-skill", "required_level": 2, "weight": 1}]
    monkeypatch.setattr(engines, "catalog", lambda: data)
    request = IntelligenceRequest(occupation_id=career["id"])
    milestone = engines.roadmap(request)["milestones"][0]
    assert "Future skill" in milestone["exercise"]
    assert "does not establish verified proficiency" in milestone["verification"]
    assert milestone["resources"] == []

    future_skill.update(exercise="Build the imported practice task.", verification="Save its working output.")
    imported = engines.roadmap(request)["milestones"][0]
    assert imported["exercise"] == "Build the imported practice task."
    assert imported["verification"] == "Save its working output."
    assert imported["hours"] == milestone["hours"]


def test_simulation_changes_only_selected_skill_does_not_mutate_profile():
    body = payload(skill_id="sql", target_level=3)
    result = post("skills/impact", body)
    assert result["modified_skills"] == ["sql"]
    assert any(r["difference"] > 0 for r in result["occupations"])
    assert all(s["estimated_proficiency"] is None for s in post("profiles/analyze", payload())["skills"])


def test_employer_projection_uses_only_selected_milestones():
    plan = post("roadmaps/generate")
    milestone = plan["milestones"][0]
    result = post("employers/match", payload(milestone_ids=[milestone["id"]]))
    assert result["projected_skill_ids"] == [milestone["skill_id"]]
    assert all("synthetic" in r["source_status"] for r in result["roles"])
    assert all(r["remaining_requirements"] for r in result["roles"])
    assert all(r["source_url"] is None for r in result["roles"])


def test_employer_remaining_experience_separate_from_skills():
    result = post("employers/match")
    assert result["roles"]
    assert all(r["fit"] <= 100 for r in result["roles"])
    assert all(
        "education_eligibility" in r and "experience_eligibility" in r and "work_authorization" in r
        for r in result["roles"]
    )
    assert result["summary"]["selected_career"] == "Data Analyst"


def test_unselected_or_foreign_milestone_rejected():
    response = client.post("/api/v1/employers/match", json=payload(milestone_ids=["foreign:sql"]))
    assert response.status_code == 422


def test_sdg_mappings_have_explanations_and_sources():
    careers = post("careers/recommend")["careers"]
    sdgs = [s for c in careers for s in c["sdgs"]]
    assert sdgs and all(s["explanation"] and s["source_id"] and s["target"] for s in sdgs)


@pytest.mark.parametrize("country", ["SG", "ID", "TL"])
def test_unsupported_country_does_not_get_malaysian_scores(country):
    response = client.post("/api/v1/careers/recommend", json=payload(profile={"employment_country": country}))
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "unsupported_market"


def test_coverage_reports_all_countries_without_fabricating_support():
    result = client.get("/api/v1/system/coverage").json()
    assert len(result["countries"]) == 11
    assert {c["code"] for c in result["countries"] if c["supported"]} == {"MY"}


@pytest.mark.parametrize(
    "changes",
    [{"weekly_hours": 0}, {"employment_country": "XX"}, {"proficiency": 5}, {"assessment_ids": ["forged"]}],
)
def test_invalid_input_and_forged_evidence_rejected(changes):
    response = client.post("/api/v1/profiles/analyze", json=payload(profile=changes))
    assert response.status_code in {404, 410, 422}


def test_cv_txt_aliases_without_proficiency():
    response = client.post(
        "/api/v1/cv/extract",
        files={
            "file": (
                "cv.txt",
                b"Education\nStudied SQL and Microsoft Excel in university.\nProjects\nPowerBI dashboard",
                "text/plain",
            )
        },
    )
    assert response.status_code == 200
    assert response.json()["skills"]
    assert all(s["estimated_proficiency"] is None for s in response.json()["skills"])


def test_docx_extraction():
    document = Document()
    document.add_paragraph("Skills: Python and SQL")
    stream = io.BytesIO()
    document.save(stream)
    response = client.post("/api/v1/cv/extract", files={"file": ("cv.docx", stream.getvalue())})
    assert response.status_code == 200
    assert {s["skill_id"] for s in response.json()["skills"]} == {"python", "sql"}


def test_scanned_or_empty_pdf_returns_unsupported_extraction():
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    stream = io.BytesIO()
    writer.write(stream)
    response = client.post("/api/v1/cv/extract", files={"file": ("cv.pdf", stream.getvalue())})
    assert response.status_code == 422
    assert "OCR" in response.json()["detail"]


def test_actual_text_pdf_extracts_even_a_short_skill_mention():
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    font = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        }
    )
    page[NameObject("/Resources")] = DictionaryObject(
        {NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})}
    )
    content = DecodedStreamObject()
    content.set_data(b"BT /F1 12 Tf 40 700 Td (SQL) Tj ET")
    page[NameObject("/Contents")] = writer._add_object(content)
    output = io.BytesIO()
    writer.write(output)
    response = client.post("/api/v1/cv/extract", files={"file": ("short-cv.pdf", output.getvalue())})
    assert response.status_code == 200
    assert response.json()["skills"][0]["skill_id"] == "sql"
    assert response.json()["skills"][0]["estimated_proficiency"] is None


@pytest.mark.parametrize(
    "name,content,status",
    [
        ("cv.exe", b"SQL", 415),
        ("cv.txt", b"x" * (5 * 1024 * 1024 + 1), 413),
        ("cv.pdf", b"fake pdf SQL", 422),
        ("cv.txt", b"", 422),
    ],
    ids=["extension", "oversized", "signature", "empty"],
)
def test_unsafe_or_invalid_uploads_rejected(name, content, status):
    response = client.post("/api/v1/cv/extract", files={"file": (name, content)})
    assert response.status_code == status


def test_system_counts_calculated_and_diagnostics_public_only():
    result = client.get("/api/v1/system/insights").json()
    data = get_catalog()
    assert result["counts"]["occupations"] == len(data["occupations"])
    assert result["counts"]["skills"] == len(data["skills"])
    text = str(result).lower()
    assert "expected_answer" not in text and "openai_api_key" not in text and "question_bank" not in text
    assert result["diagnostics"]["private_profile_storage"] is False


def test_insight_score_matches_career_endpoint():
    normal = next(c for c in post("careers/recommend")["careers"] if c["occupation_id"] == "data-analyst")
    inspector = post("insights/explain-career-score")
    assert inspector["calculation"] == normal


def test_market_snapshot_changes_labelled_synthetic():
    result = client.get("/api/v1/market/changes").json()
    assert result["status"] == "imported_snapshot"
    assert all(o["evidence_status"] == "synthetic demonstration" for o in result["observations"])


def test_dataset_explorer_pagination():
    response = client.get("/api/v1/system/datasets?kind=occupations&page_size=3&page=99")
    assert response.status_code == 200
    result = response.json()
    assert result["page"] == 3 and len(result["items"]) == 2 and result["total"] == 8


def test_without_llm_key_deterministic_workflow(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    result = post("insights/explain-career-score")
    assert result["explanation"]["metadata"]["provider"] == "deterministic"
    assert post("roadmaps/generate")["milestones"]


def test_unknown_occupation_and_invalid_skill_errors():
    assert (
        client.post("/api/v1/careers/skill-gaps", json=payload(occupation_id="nonexistent")).status_code
        == 404
    )
    assert client.post("/api/v1/skills/impact", json=payload(skill_id="nonexistent")).status_code == 422


def test_entire_backend_vertical_slice():
    body = payload(
        profile={
            "direction": "target",
            "occupation_id": "data-analyst",
            "background": "SQL university project",
            "assessment_ids": [complete_assessment()],
            "weekly_hours": 6,
            "interests": ["analysis", "technology"],
        }
    )
    assert post("profiles/analyze", body)["skills"]
    assert post("careers/recommend", body)["selected_occupation_id"] == "data-analyst"
    assert post("ai-impact/analyze", body)["tasks"]
    assert post("scenarios/compare", body)["comparisons"]
    assert post("careers/skill-gaps", body)["skills"]
    assert post("roadmaps/generate", body)["milestones"]
    assert post("employers/match", body)["roles"]


def test_target_mode_requires_an_explicit_target():
    assert (
        client.post("/api/v1/careers/recommend", json={"profile": {"direction": "target"}}).status_code == 422
    )


def test_professional_current_role_stays_distinct_from_target():
    body = payload(
        profile={
            "career_stage": "professional",
            "direction": "target",
            "current_occupation_id": "admin-assistant",
            "occupation_id": "data-analyst",
        }
    )
    assert post("careers/recommend", body)["selected_occupation_id"] == "data-analyst"
    assert post("ai-impact/analyze", body)["occupation_id"] == "admin-assistant"
    assert post("roadmaps/generate", body)["occupation_id"] == "data-analyst"


def test_business_interest_maps_to_occupational_taxonomy():
    result = post("careers/recommend", payload(profile={"interests": ["business"]}))
    business = next(c for c in result["careers"] if c["occupation_id"] == "business-analyst")
    assert business["factors"]["interests"] == 100
    assert business["interest_matches"] == ["business"]


def test_learning_effort_consistent_between_matching_and_roadmap():
    for scenario in ["moderate", "accelerated"]:
        body = payload(scenario=scenario)
        career = next(
            c for c in post("careers/recommend", body)["careers"] if c["occupation_id"] == "data-analyst"
        )
        plan = post("roadmaps/generate", body)
        assert career["estimated_learning_hours"] == plan["total_hours"]


def test_active_scenario_configuration_matches_imported_dataset():
    result = client.get("/api/v1/system/insights").json()
    stored = {item["id"]: item for item in get_catalog()["scenarios"]}
    for key, config in result["scenario_definitions"].items():
        assert config["priority_multipliers"] == stored[key]["priority_multipliers"]
        assert config["learning_multiplier"] == stored[key]["learning_multiplier"]


def test_assessment_inspector_supports_synthetic_unassessed_profile():
    result = post("insights/explain-skill-assessment")
    assert result["questions_attempted"] == 0
    assert all(s["estimated_proficiency"] is None for s in result["skills"])
    assert "expected_answer" not in str(result)


def test_simulator_rejects_regression_disguised_as_improvement():
    body = payload(profile={"assessment_ids": [complete_assessment()]}, skill_id="sql", target_level=1)
    assert client.post("/api/v1/skills/impact", json=body).status_code == 422


def test_cv_phrase_survives_review_without_establishing_proficiency():
    result = post(
        "profiles/analyze",
        payload(profile={"cv_evidence": [{"skill_id": "sql", "source_phrase": "Structured Query Language"}]}),
    )
    skill = next(s for s in result["skills"] if s["skill_id"] == "sql")
    assert skill["estimated_proficiency"] is None
    assert "User-reviewed CV mention: Structured Query Language" in skill["evidence"]


def test_cv_phrase_bounds_and_unknown_identifier_rejected():
    for evidence in [
        {"skill_id": "sql", "source_phrase": "x" * 201},
        {"skill_id": "fake", "source_phrase": "SQL"},
    ]:
        assert (
            client.post(
                "/api/v1/profiles/analyze", json=payload(profile={"cv_evidence": [evidence]})
            ).status_code
            == 422
        )
