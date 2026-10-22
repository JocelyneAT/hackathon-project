import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import engines
from .assessment import get_assessment_result, router as assessment_router
from .cv import extract_upload
from .data import database_health, get_catalog, last_import
from .llm import configuration_status, explain_calculation
from .jobs import router as jobs_router
from .schemas import (
    APIResult,
    AssessmentExplanationRequest,
    IntelligenceRequest,
    ProfileAnalysis,
    RecommendationResult,
    SkillGapResult,
    AIImpactResult,
    RoadmapResult,
    SkillImpactResult,
    EmployerMatches,
    ScenarioResult,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_catalog()
    yield


app = FastAPI(
    title="SHIFT//OS Career Intelligence API",
    version="0.1.0",
    lifespan=lifespan,
    description="Evidence-aware deterministic planning. Seed occupations, exposure indicators and employer roles are illustrative, not verified vacancies or forecasts.",
)
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)
app.include_router(assessment_router)
app.include_router(jobs_router)


@app.get("/health")
def health():
    database = database_health()
    result = {
        "status": "healthy" if database["status"] == "connected" else "unavailable",
        "database": database,
        "model_version": engines.MODEL_VERSION,
    }
    return result if database["status"] == "connected" else JSONResponse(status_code=503, content=result)


def coverage_data() -> dict:
    data = get_catalog()
    countries = []
    for country in data["countries"]:
        code = country.get("code", country.get("id"))
        supported = code == "MY"
        countries.append(
            {
                **country,
                "code": code,
                "supported": supported,
                "capabilities": [
                    "illustrative_occupation_planning",
                    "skill_assessment",
                    "learning_resources",
                    "synthetic_employer_matching",
                ]
                if supported
                else [],
                "evidence_status": "Curated illustrative MVP; verified local labour observations unavailable"
                if supported
                else "Unavailable: no local dataset imported",
            }
        )
    return {
        "countries": countries,
        "supported_countries": ["MY"],
        "notes": "Malaysia-only operational planning dataset. No Malaysian statistics are applied to other countries.",
    }


@app.get("/api/v1/system/coverage")
def coverage():
    return coverage_data()


@app.get("/api/v1/occupations")
def occupations(country: str = "MY"):
    return {
        "occupations": [o for o in get_catalog()["occupations"] if o.get("country") == country],
        "country": country,
    }


@app.get("/api/v1/occupations/{occupation_id}")
def occupation_detail(occupation_id: str):
    data = get_catalog()
    occ = engines.occupation(occupation_id, data)
    return {**occ, "tasks": [t for t in data["tasks"] if t["occupation_id"] == occupation_id]}


@app.get("/api/v1/skills")
def skills():
    return {"skills": get_catalog()["skills"]}


@app.get("/api/v1/sources")
def sources():
    return {"sources": get_catalog()["sources"]}


@app.post("/api/v1/cv/extract", response_model=APIResult)
async def cv_extract(file: UploadFile = File(...)):
    return await extract_upload(file)


@app.post("/api/v1/profiles/analyze", response_model=ProfileAnalysis)
def profile_analyze(request: IntelligenceRequest):
    return engines.analyze_profile(request.profile)


@app.post("/api/v1/careers/recommend", response_model=RecommendationResult)
def careers_recommend(request: IntelligenceRequest):
    return engines.recommend(request)


@app.post("/api/v1/careers/skill-gaps", response_model=SkillGapResult)
def career_gaps(request: IntelligenceRequest):
    engines.require_market(request.profile)
    return engines.gaps(request.profile, engines.selected_occupation(request))


@app.post("/api/v1/ai-impact/analyze", response_model=AIImpactResult)
def ai_impact(request: IntelligenceRequest):
    return engines.ai_impact(request)


@app.post("/api/v1/scenarios/compare", response_model=ScenarioResult)
def scenarios_compare(request: IntelligenceRequest):
    return engines.scenario_comparison(request)


@app.post("/api/v1/roadmaps/generate", response_model=RoadmapResult)
def roadmap_generate(request: IntelligenceRequest):
    return engines.roadmap(request)


@app.post("/api/v1/skills/impact", response_model=SkillImpactResult)
def skills_impact(request: IntelligenceRequest):
    return engines.skill_impact(request)


@app.post("/api/v1/employers/match", response_model=EmployerMatches)
def employers_match(request: IntelligenceRequest):
    return engines.employers(request)


@app.get("/api/v1/system/insights", response_model=APIResult)
def system_insights():
    data = get_catalog()
    counts = {
        key: len(data[key])
        for key in ["occupations", "skills", "tasks", "resources", "employer_roles", "sources"]
    }
    return {
        "counts": counts,
        "countries": coverage_data()["countries"],
        "dataset_versions": data.get("dataset_versions", []),
        "last_import": last_import(),
        "backend_status": "healthy",
        "database": database_health(),
        "model_version": engines.MODEL_VERSION,
        "scoring_weights": engines.WEIGHTS,
        "scenario_definitions": engines.scenario_definitions(data),
        "llm": configuration_status(),
        "limitations": [
            "Illustrative planning dataset; no validated market-demand model.",
            "Synthetic employer records are not live vacancies.",
            "No CVs, private profiles, assessment answer keys, secrets or raw assessment sessions are exposed here.",
            "Python and SQL code execution is unsupported; assessments use curated objective interpretation questions.",
        ],
        "diagnostics": {
            "api": "healthy",
            "database": database_health()["status"],
            "import": "loaded",
            "private_profile_storage": False,
        },
        "catalog": data,
    }


@app.get("/api/v1/system/datasets")
def dataset_explorer(
    kind: str = Query(default="occupations"),
    country: str | None = None,
    occupation_id: str | None = None,
    evidence_status: str | None = None,
    version: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    from fastapi import HTTPException

    allowed = {
        "occupations",
        "skills",
        "tasks",
        "resources",
        "employer_roles",
        "sources",
        "market_signals",
        "sdg_mappings",
        "dataset_versions",
    }
    if kind not in allowed:
        raise HTTPException(422, "Unknown dataset kind")
    rows = get_catalog()[kind]
    rows = [
        r
        for r in rows
        if (not country or r.get("country") == country)
        and (not occupation_id or r.get("occupation_id", r.get("id")) == occupation_id)
        and (not evidence_status or r.get("evidence_status", r.get("source_status")) == evidence_status)
        and (not version or r.get("dataset_version") == version)
    ]
    total = len(rows)
    page = min(page, max(1, (total + page_size - 1) // page_size))
    return {
        "items": rows[(page - 1) * page_size : page * page_size],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@app.post("/api/v1/insights/explain-career-score", response_model=APIResult)
async def explain_career_score(request: IntelligenceRequest):
    engines.require_market(request.profile)
    occ = engines.selected_occupation(request)
    score = engines.career_score(request.profile, occ, request.scenario, get_catalog())
    return {
        "calculation": score,
        "weights": engines.WEIGHTS,
        "explanation": await explain_calculation(score),
        "model_version": engines.MODEL_VERSION,
    }


@app.post("/api/v1/insights/explain-skill-assessment", response_model=APIResult)
def explain_skill_assessment(request: AssessmentExplanationRequest | IntelligenceRequest):
    if isinstance(request, IntelligenceRequest):
        profile = engines.analyze_profile(request.profile)
        return {
            "skills": profile["skills"],
            "assessment_priorities": profile["assessment_priorities"],
            "questions_attempted": sum(
                get_assessment_result(aid)["questions_attempted"] for aid in request.profile.assessment_ids
            ),
            "rubric": "Curated objective questions; provisional foundational levels 1-2 only. A profile without assessment evidence remains unverified. Private answer keys are never returned.",
            "warnings": profile["warnings"],
        }
    return {
        "assessment": get_assessment_result(request.assessment_id),
        "rubric": "Curated objective questions; provisional foundational levels 1-2 only. Unattempted competencies remain unknown.",
    }


@app.post("/api/v1/insights/explain-ai-impact", response_model=APIResult)
def explain_ai_impact(request: IntelligenceRequest):
    return engines.ai_impact(request)


@app.get("/api/v1/market/changes")
def market_changes():
    signals = get_catalog().get("market_signals", [])
    grouped: dict[str, list[dict]] = {}
    for signal in signals:
        key = ":".join(
            str(signal.get(field, ""))
            for field in ["occupation_id", "skill_id", "metric", "indicator", "country", "source_id", "unit"]
        )
        grouped.setdefault(key, []).append(signal)
    changes = []
    for key, rows in grouped.items():
        rows.sort(key=lambda r: r.get("date", r.get("observed_at", "")))
        if len(rows) >= 2:
            changes.append(
                {
                    "series": key,
                    "source_id": rows[-1].get("source_id"),
                    "unit": rows[-1].get("unit"),
                    "previous": rows[-2],
                    "latest": rows[-1],
                    "difference": rows[-1]["value"] - rows[-2]["value"],
                }
            )
    return {
        "changes": changes,
        "observations": signals,
        "status": "imported_snapshot" if signals else "unavailable",
        "note": "Dated import snapshots only; not live real-time intelligence.",
    }
