"""Optional OpenAI explanation adapter; deterministic engines own every score."""

import json
import os
import re

import httpx

from .schemas import Explanation


def configuration_status() -> dict:
    return {
        "configured": bool(os.getenv("OPENAI_API_KEY")),
        "provider": "OpenAI",
        "purpose": "Optional grounded explanations only",
        "scores": "Deterministic engines only",
    }


async def explain_calculation(calculation: dict) -> dict:
    fallback = {
        "text": calculation.get(
            "explanation", "This result comes from the documented deterministic planning rules."
        ),
        "source_ids": [],
        "metadata": {"provider": "deterministic", "fallback": True},
    }
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return Explanation.model_validate(fallback).model_dump()
    # The provider receives public occupational data and computed factors only, never a CV or profile.
    public_input = {
        key: calculation.get(key)
        for key in ["title", "factors", "explanation", "evidence_status", "market_outlook"]
    }
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers={"Authorization": "Bearer " + key},
                json={
                    "model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
                    "instructions": "Explain only the supplied planning calculation in two plain sentences. Do not add facts, numeric values, skill claims, forecasts, sources or employment promises. Return JSON with text and source_ids (an empty list).",
                    "input": json.dumps(public_input),
                    "text": {"format": {"type": "json_object"}},
                    "max_output_tokens": 250,
                    "store": False,
                },
            )
            response.raise_for_status()
            payload = response.json()
            output = "".join(
                c.get("text", "")
                for item in payload.get("output", [])
                for c in item.get("content", [])
                if c.get("type") == "output_text"
            )
            explanation = Explanation.model_validate_json(output)
            if explanation.source_ids or re.search(r"\d|%|https?://", explanation.text):
                return Explanation.model_validate(fallback).model_dump()
            explanation.metadata = {
                "provider": "OpenAI",
                "fallback": False,
                "label": "AI-assisted wording; deterministic values unchanged",
            }
            return explanation.model_dump()
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        fallback["metadata"]["reason"] = (
            "Optional explanation unavailable; deterministic explanation retained"
        )
        return Explanation.model_validate(fallback).model_dump()
