"""Assessment boundaries, adaptive selection and evidence semantics."""

import json

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from app import assessment


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(assessment.router)
    assessment._sessions.clear()
    with TestClient(app) as test_client:
        yield test_client
    assessment._sessions.clear()


def start(client, skill="sql"):
    response = client.post("/api/v1/assessments/start", json={"skill_id": skill})
    assert response.status_code == 200
    return response.json()


def answer(client, state, correct=True):
    question = next(
        item for item in assessment.QUESTION_BANK[state["skill_id"]] if item["id"] == state["question"]["id"]
    )
    option = (
        question["expected_answer"]
        if correct
        else next(item["id"] for item in question["options"] if item["id"] != question["expected_answer"])
    )
    response = client.post(
        "/api/v1/assessments/submit",
        json={"assessment_id": state["assessment_id"], "question_id": question["id"], "answer": option},
    )
    assert response.status_code == 200
    return response.json()


@pytest.mark.parametrize("skill", list(assessment.SKILL_NAMES))
def test_all_five_assessments_complete_with_provisional_cap(client, skill):
    state = start(client, skill)
    for _ in range(3):
        state = answer(client, state)
    assert state["status"] == "completed"
    assert state["question"] is None
    result = state["result"]
    assert result["estimated_proficiency"] == 2
    assert result["confidence"] == "moderate"
    assert result["assessment_status"] == "provisional"
    assert result["questions_attempted"] == 3
    assert result["correct_count"] == 3
    assert len(result["tested_competencies"]) == 3
    assert "not a professional certification" in result["limitations"]
    assert assessment.lookup_results([state["assessment_id"]])[0] == result


def test_correct_foundation_escalates_and_failure_returns_foundation(client):
    state = start(client)
    assert state["question"]["difficulty"] == 1
    state = answer(client, state, True)
    assert state["question"]["difficulty"] == 2
    state = answer(client, state, False)
    assert state["question"]["difficulty"] == 1


def test_wrong_foundation_keeps_equivalent_question(client):
    state = start(client)
    first_id = state["question"]["id"]
    state = answer(client, state, False)
    assert state["question"]["difficulty"] == 1
    assert state["question"]["id"] != first_id


def test_all_wrong_is_unknown_not_level_zero(client):
    state = start(client, "python")
    for _ in range(3):
        state = answer(client, state, False)
    assert state["result"]["estimated_proficiency"] is None
    assert state["result"]["assessment_status"] == "insufficient_evidence"
    assert state["result"]["confidence"] == "low"


def test_partial_foundation_cannot_award_advanced_level(client):
    state = start(client)
    for correct in [True, False, False]:
        state = answer(client, state, correct)
    assert state["result"]["estimated_proficiency"] == 1
    assert state["result"]["confidence"] == "low"


def test_no_answer_or_private_rubric_in_available_or_assigned_questions(client):
    state = start(client)
    payloads = [
        state,
        client.get("/api/v1/assessments/skills").json(),
        client.get(f"/api/v1/assessments/{state['assessment_id']}/question").json(),
    ]
    for payload in payloads:
        serialised = json.dumps(payload)
        for private in ["expected_answer", "rubric", "rationale", "correct_count"]:
            assert private not in serialised
    assert client.get(f"/api/v1/assessments/{state['assessment_id']}/result").status_code == 409


def test_cannot_choose_question_or_replay_answer(client):
    state = start(client)
    body = {"assessment_id": state["assessment_id"], "question_id": "sql-a2", "answer": "d"}
    assert client.post("/api/v1/assessments/submit", json=body).status_code == 409
    assert assessment._sessions[state["assessment_id"]]["attempts"] == []
    body["question_id"] = state["question"]["id"]
    body["answer"] = "b"
    assert client.post("/api/v1/assessments/submit", json=body).status_code == 200
    assert client.post("/api/v1/assessments/submit", json=body).status_code == 409


def test_invalid_or_code_answers_are_rejected_without_execution(client):
    state = start(client, "python")
    for value in ["import os", "__import__('os').system('echo unsafe')", "DROP TABLE users", "z"]:
        response = client.post(
            "/api/v1/assessments/submit",
            json={
                "assessment_id": state["assessment_id"],
                "question_id": state["question"]["id"],
                "answer": value,
            },
        )
        assert response.status_code == 422
    assert assessment._sessions[state["assessment_id"]]["attempts"] == []
    assert client.get("/api/v1/assessments/skills").json()["code_execution_supported"] is False


def test_unknown_forged_expired_or_incomplete_evidence_rejected(client, monkeypatch):
    state = start(client)
    assert client.get("/api/v1/assessments/unknown/result").status_code == 404
    with pytest.raises(Exception) as exc:
        assessment.lookup_results([state["assessment_id"]])
    assert exc.value.status_code == 409
    monkeypatch.setattr(
        assessment, "_now", lambda: assessment._sessions[state["assessment_id"]]["expires_at"] + 1
    )
    assert client.get(f"/api/v1/assessments/{state['assessment_id']}/result").status_code == 410


def test_completed_assessment_cannot_be_regraded(client):
    state = start(client)
    for _ in range(3):
        state = answer(client, state)
    response = client.post(
        "/api/v1/assessments/submit",
        json={"assessment_id": state["assessment_id"], "question_id": "sql-f1", "answer": "a"},
    )
    assert response.status_code == 409
    assert client.get(f"/api/v1/assessments/{state['assessment_id']}/result").json()["correct_count"] == 3


def test_skipped_assessments_return_no_evidence_and_duplicates_fail(client):
    assert assessment.lookup_results([]) == []
    state = start(client)
    with pytest.raises(Exception) as exc:
        assessment.lookup_results([state["assessment_id"], state["assessment_id"]])
    assert exc.value.status_code == 422


def test_start_rejects_unknown_skill_and_untrusted_extra_results(client):
    assert client.post("/api/v1/assessments/start", json={"skill_id": "unknown"}).status_code == 422
    assert (
        client.post(
            "/api/v1/assessments/start", json={"skill_id": "sql", "estimated_proficiency": 5}
        ).status_code
        == 422
    )


def test_session_capacity_is_bounded(client, monkeypatch):
    monkeypatch.setattr(assessment, "MAX_ACTIVE_SESSIONS", 1)
    start(client)
    assert client.post("/api/v1/assessments/start", json={"skill_id": "sql"}).status_code == 503
