"""Evidence and CV contracts for the redesigned career journey."""

import io

import pytest
from fastapi.testclient import TestClient

from backend.app import assessment
from backend.app.main import app

client = TestClient(app)


@pytest.mark.parametrize("skill", list(assessment.SKILL_NAMES))
def test_ten_unique_questions_keep_keys_private_and_use_all_answers(skill, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    state = client.post(
        "/api/v1/assessments/start", json={"skill_id": skill, "question_count": 10, "generate": True}
    ).json()
    seen = set()
    for index in range(10):
        question = state["question"]
        assert question["id"] not in seen
        assert "expected_answer" not in question
        seen.add(question["id"])
        assert state["progress"] == {"answered": index, "total": 10}
        item = next(q for q in assessment.QUESTION_BANK[skill] if q["id"] == question["id"])
        state = client.post(
            "/api/v1/assessments/submit",
            json={
                "assessment_id": state["assessment_id"],
                "question_id": question["id"],
                "answer": item["expected_answer"],
            },
        ).json()
    assert state["status"] == "completed"
    assert state["result"]["correct_count"] == 10
    assert state["result"]["estimated_proficiency"] == 2
    assert state["source"] == "Curated practice quiz"


def test_self_estimates_change_planning_without_becoming_tested_evidence():
    profile = {"skill_ids": ["excel"], "self_ratings": {"excel": 5}}
    analysis = client.post("/api/v1/profiles/analyze", json={"profile": profile}).json()
    skill = next(s for s in analysis["skills"] if s["skill_id"] == "excel")
    assert skill["estimated_proficiency"] is None
    assert skill["self_reported_level"] == 5
    gaps = client.post(
        "/api/v1/careers/skill-gaps", json={"profile": profile, "occupation_id": "data-analyst"}
    ).json()
    row = next(s for s in gaps["skills"] if s["skill_id"] == "excel")
    assert row["provisional_level"] == 5
    assert row["status"] == "self-reported"
    career = client.post("/api/v1/careers/recommend", json={"profile": profile}).json()
    assert all(c["coverage"] == 0 for c in career["careers"])
    roadmap = client.post(
        "/api/v1/roadmaps/generate", json={"profile": profile, "occupation_id": "data-analyst"}
    ).json()
    assert all(m["skill_id"] != "excel" and m["hours"] > 0 for m in roadmap["milestones"])
    assert (
        client.post("/api/v1/profiles/analyze", json={"profile": {"self_ratings": {"excel": 6}}}).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/profiles/analyze", json={"profile": {"self_ratings": {"invented": 3}}}
        ).status_code
        == 422
    )


def test_age_and_gender_do_not_change_career_rankings():
    base = {"skill_ids": ["excel"], "self_ratings": {"excel": 2}}
    first = client.post("/api/v1/careers/recommend", json={"profile": base}).json()
    second = client.post(
        "/api/v1/careers/recommend", json={"profile": {**base, "age": 55, "gender": "Woman"}}
    ).json()
    assert first == second


def test_cv_prefills_explicit_fields_and_does_not_infer_missing_demographics():
    text = b"Country: Singapore\nAge: 24\nGender: Female\n3 years of experience\nEducation\nDiploma in IT\nProjects\nPython and HTML project"
    result = client.post(
        "/api/v1/cv/extract", files={"file": ("profile.txt", io.BytesIO(text), "text/plain")}
    ).json()
    assert result["profile_fields"] == {
        "country": "SG",
        "age": 24,
        "gender": "Woman",
        "experience_years": 3,
        "career_stage": "professional",
    }
    assert {s["skill_id"] for s in result["skills"]} >= {"python", "html"}
    missing = client.post(
        "/api/v1/cv/extract",
        files={"file": ("profile.txt", io.BytesIO(b"Python and Excel skills"), "text/plain")},
    ).json()
    assert missing["profile_fields"] == {}


def test_generated_quiz_uses_private_server_keys(monkeypatch):
    from backend.app import llm

    async def generated(_):
        return [
            {
                "prompt": f"Distinct generated prompt {i}?",
                "options": ["Correct", "Wrong 1", "Wrong 2", "Wrong 3"],
                "correct_index": 0,
                "rationale": "Correct by definition",
                "competency": "Foundations",
                "difficulty": 1 if i % 2 == 0 else 2,
            }
            for i in range(10)
        ]

    monkeypatch.setattr(llm, "generate_quiz", generated)
    state = client.post(
        "/api/v1/assessments/start", json={"skill_id": "excel", "question_count": 10, "generate": True}
    ).json()
    assert state["source"] == "AI-generated practice quiz"
    assert "correct_index" not in str(state)
    for _ in range(10):
        state = client.post(
            "/api/v1/assessments/submit",
            json={
                "assessment_id": state["assessment_id"],
                "question_id": state["question"]["id"],
                "answer": "a",
            },
        ).json()
    assert state["result"]["correct_count"] == 10
    assert state["result"]["source"] == "AI-generated practice quiz"


def test_failed_retake_supersedes_high_score_and_self_estimate():
    attempts = []
    for correct in [True, False]:
        state = client.post(
            "/api/v1/assessments/start", json={"skill_id": "excel", "question_count": 10}
        ).json()
        for _ in range(10):
            question = next(
                q for q in assessment.QUESTION_BANK["excel"] if q["id"] == state["question"]["id"]
            )
            answer = (
                question["expected_answer"]
                if correct
                else next(o["id"] for o in question["options"] if o["id"] != question["expected_answer"])
            )
            state = client.post(
                "/api/v1/assessments/submit",
                json={
                    "assessment_id": state["assessment_id"],
                    "question_id": question["id"],
                    "answer": answer,
                },
            ).json()
        attempts.append(state["assessment_id"])
    profile = {"skill_ids": ["excel"], "self_ratings": {"excel": 5}, "assessment_ids": attempts}
    response = client.post("/api/v1/profiles/analyze", json={"profile": profile}).json()
    excel = next(s for s in response["skills"] if s["skill_id"] == "excel")
    assert excel["estimated_proficiency"] is None
    assert excel["assessment_status"] == "insufficient_evidence"
    gaps = client.post(
        "/api/v1/careers/skill-gaps", json={"profile": profile, "occupation_id": "data-analyst"}
    ).json()
    assert next(s for s in gaps["skills"] if s["skill_id"] == "excel")["provisional_level"] is None
