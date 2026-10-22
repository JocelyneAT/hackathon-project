import json

import httpx
from fastapi.testclient import TestClient

from backend.app import llm
from backend.app.main import app


class ProviderClient:
    captured = None
    text = "The pathway combines the supplied skill evidence and interests. Learning feasibility remains an assumption."

    def __init__(self, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def post(self, url, **kwargs):
        ProviderClient.captured = kwargs
        return httpx.Response(
            200,
            request=httpx.Request("POST", url),
            json={
                "output": [
                    {
                        "content": [
                            {
                                "type": "output_text",
                                "text": json.dumps({"text": ProviderClient.text, "source_ids": []}),
                            }
                        ]
                    }
                ]
            },
        )


def test_optional_provider_receives_only_grounded_nonidentifying_calculation(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-placeholder-not-a-real-key")
    monkeypatch.setattr(llm.httpx, "AsyncClient", ProviderClient)
    monkeypatch.setattr(
        ProviderClient,
        "text",
        "This pathway reflects the supplied factors. Learning feasibility remains an assumption.",
    )
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/insights/explain-career-score",
            json={
                "profile": {
                    "background": "A private CV paragraph about SQL",
                    "education": "A private education record",
                },
                "occupation_id": "data-analyst",
            },
        )
    assert response.status_code == 200
    assert response.json()["explanation"]["metadata"]["fallback"] is False
    body = ProviderClient.captured["json"]
    assert body["store"] is False
    assert "private CV" not in body["input"] and "private education" not in body["input"]
    assert "test-placeholder" not in json.dumps(response.json())


def test_llm_numeric_claims_rejected_without_changing_score(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-placeholder-not-a-real-key")
    monkeypatch.setattr(llm.httpx, "AsyncClient", ProviderClient)
    monkeypatch.setattr(ProviderClient, "text", "You have a 99% chance of getting hired.")
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/insights/explain-career-score", json={"profile": {}, "occupation_id": "data-analyst"}
        )
    assert response.status_code == 200
    assert response.json()["explanation"]["metadata"]["fallback"] is True
    assert "99%" not in response.json()["explanation"]["text"]
