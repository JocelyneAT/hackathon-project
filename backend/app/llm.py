"""Optional OpenAI explanation adapter; deterministic engines own every score."""

import json
import os
import re

import httpx

from .schemas import Explanation
from pydantic import BaseModel, ConfigDict, Field


class QuizItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(min_length=10, max_length=600)
    options: list[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    rationale: str = Field(min_length=5, max_length=500)
    competency: str = Field(min_length=3, max_length=100)
    difficulty: int = Field(ge=1, le=2)


class GeneratedQuiz(BaseModel):
    model_config = ConfigDict(extra="forbid")
    questions: list[QuizItem] = Field(min_length=10, max_length=10)


async def generate_quiz(skill_name: str) -> list[dict] | None:
    """Only the public skill name is sent to the provider."""
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    try:
        async with httpx.AsyncClient(timeout=22) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers={"Authorization": "Bearer " + key},
                json={
                    "model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
                    "instructions": "Create exactly ten distinct foundational multiple-choice knowledge questions for the supplied skill. Cover recall (difficulty 1) and practical interpretation (difficulty 2). Each question has four distinct options and exactly one unambiguous correct answer. No trick questions, code execution, personal data, or links. Include a concise rationale. These questions are not a professional certification.",
                    "input": skill_name,
                    "text": {
                        "format": {
                            "type": "json_schema",
                            "name": "skill_quiz",
                            "strict": True,
                            "schema": GeneratedQuiz.model_json_schema(),
                        }
                    },
                    "max_output_tokens": 4500,
                    "store": False,
                },
            )
            response.raise_for_status()
            output = "".join(
                c.get("text", "")
                for item in response.json().get("output", [])
                for c in item.get("content", [])
                if c.get("type") == "output_text"
            )
            quiz = GeneratedQuiz.model_validate_json(output)
            if len({q.prompt.casefold() for q in quiz.questions}) != 10 or any(
                len(set(q.options)) != 4 for q in quiz.questions
            ):
                return None
            return [q.model_dump() for q in quiz.questions]
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return None


def configuration_status() -> dict:
    return {
        "configured": bool(os.getenv("OPENAI_API_KEY")),
        "provider": "OpenAI",
        "purpose": "Optional grounded explanations and ten-question skill quizzes",
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
