"""Public dataset boundaries, snapshot comparability and source attribution."""

from copy import deepcopy

from fastapi.testclient import TestClient

from backend.app import main
from backend.app.data import get_catalog


client = TestClient(main.app)


def test_market_changes_preserve_source_units_and_dates():
    result = client.get("/api/v1/market/changes")
    assert result.status_code == 200
    body = result.json()
    assert body["status"] == "imported_snapshot"
    assert body["changes"]
    for change in body["changes"]:
        previous, latest = change["previous"], change["latest"]
        assert previous["date"] <= latest["date"]
        assert change["difference"] == latest["value"] - previous["value"]
        assert change["source_id"] == previous["source_id"] == latest["source_id"]
        assert change["unit"] == previous["unit"] == latest["unit"]
        assert previous["evidence_status"] == latest["evidence_status"] == "synthetic demonstration"


def test_market_changes_do_not_mix_sources_or_units(monkeypatch):
    data = deepcopy(get_catalog())
    base = data["market_signals"][0]
    data["market_signals"] = [
        {**base, "id": "latest", "date": "2026-10-01", "value": 105},
        {**base, "id": "previous", "date": "2026-09-01", "value": 100},
        {**base, "id": "different-source", "date": "2026-11-01", "value": 500, "source_id": "other-source"},
        {**base, "id": "different-unit", "date": "2026-12-01", "value": 1000, "unit": "other unit"},
    ]
    monkeypatch.setattr(main, "get_catalog", lambda: data)
    body = client.get("/api/v1/market/changes").json()
    assert len(body["changes"]) == 1
    assert body["changes"][0]["difference"] == 5
    assert body["changes"][0]["latest"]["id"] == "latest"


def test_empty_market_snapshots_return_unavailable(monkeypatch):
    monkeypatch.setattr(main, "get_catalog", lambda: {"market_signals": []})
    body = client.get("/api/v1/market/changes").json()
    assert body["status"] == "unavailable"
    assert body["observations"] == body["changes"] == []


def test_private_inputs_and_secrets_never_appear_in_public_diagnostics(monkeypatch):
    private_marker = "private-profile-unique-review-marker"
    secret_marker = "private-key-unique-review-marker"
    monkeypatch.setenv("OPENAI_API_KEY", secret_marker)
    response = client.post("/api/v1/profiles/analyze", json={"profile": {"background": private_marker}})
    assert response.status_code == 200
    for path in [
        "/health",
        "/api/v1/system/insights",
        "/api/v1/system/datasets?kind=sources",
        "/api/v1/market/changes",
    ]:
        public = client.get(path)
        assert public.status_code == 200
        assert private_marker not in public.text
        assert secret_marker not in public.text
        assert "expected_answer" not in public.text
        assert "question_bank" not in public.text.lower()
    for kind in [
        "assessment_questions",
        "assessment_rubrics",
        "assessment_results",
        "skill_evidence",
        "dataset_imports",
    ]:
        assert client.get("/api/v1/system/datasets", params={"kind": kind}).status_code == 422


def test_dataset_filters_preserve_provenance_and_pagination():
    seed = get_catalog()
    task = next(row for row in seed["tasks"] if row["occupation_id"] == "data-analyst")
    response = client.get(
        "/api/v1/system/datasets",
        params={
            "kind": "tasks",
            "occupation_id": "data-analyst",
            "country": "MY",
            "evidence_status": "curated illustrative",
            "version": task["dataset_version"],
            "page": 1,
            "page_size": 2,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3 and len(body["items"]) == 2
    assert all(row["occupation_id"] == "data-analyst" and row["source_id"] for row in body["items"])
    missing = client.get("/api/v1/system/datasets", params={"kind": "tasks", "country": "SG"}).json()
    assert missing["total"] == 0 and missing["items"] == [] and missing["page"] == 1
