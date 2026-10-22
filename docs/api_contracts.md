# API contracts

The backend serves FastAPI Swagger documentation at `/docs` and the generated OpenAPI document at `/openapi.json`. Application endpoints are versioned under `/api/v1`. Requests and primary intelligence results use Pydantic models; assessment response models explicitly allowlist public fields so private answer keys cannot leak before submission.

## Shared planning request

```json
{
  "profile": {
    "career_stage": "starter",
    "direction": "target",
    "country": "MY",
    "employment_country": "MY",
    "education": "Current business student",
    "occupation_id": "data-analyst",
    "current_occupation_id": null,
    "experience_years": 0,
    "background": "Prepared a student club spreadsheet",
    "projects": "Presented budget findings",
    "skill_ids": ["excel", "communication"],
    "cv_evidence": [{"skill_id": "sql", "source_phrase": "Structured Query Language"}],
    "reported_experience": {"excel": "guided"},
    "interests": ["analytics", "business"],
    "weekly_hours": 6,
    "budget": "free",
    "work_arrangement": "any",
    "task_ids": [],
    "assessment_ids": []
  },
  "occupation_id": "data-analyst",
  "scenario": "moderate"
}
```

All profile fields have defaults. Career stage is `starter` or `professional`; direction is `explore` or `target`; scenario is `moderate` or `accelerated`. `occupation_id` inside the profile is the target for target mode. `current_occupation_id` separately identifies a professional's existing job. The top-level `occupation_id` chooses the occupation being inspected without forcing onboarding to restart. Residence can be any registered country, but only employment country `MY` has operational planning coverage.

No CV, education, professional experience, interest questionnaire or skill assessment is compulsory. Study availability must be between 1 and 60 hours per week. Education is at most 500 characters; background and projects are at most 12,000 each. CV evidence has at most 100 records and a phrase length of 1 to 200 characters. Unexpected profile fields, including client-provided numeric assessed levels, are rejected. Assessment IDs must refer to completed, unexpired server-held results.

## Endpoint catalogue

| Method and path | Input | Important result fields |
| --- | --- | --- |
| `GET /health` | None | Actual database status, backend status, scoring version; HTTP 503 when database is unavailable |
| `GET /api/v1/system/coverage` | None | Eleven country records, supported country list, actual capabilities and evidence limitations |
| `GET /api/v1/system/insights` | None | Catalogue-derived counts, import metadata, model weights, active scenarios, safe diagnostics, public reference catalogue |
| `GET /api/v1/sources` | None | Source records with provenance and evidence status |
| `GET /api/v1/occupations` | Optional `country` query | Occupation catalogue; unsupported market has no substituted occupations |
| `GET /api/v1/occupations/{id}` | Stable occupation ID | Occupation requirements, provenance and tasks |
| `GET /api/v1/skills` | None | Stable skills, aliases, descriptors and prerequisites |
| `POST /api/v1/cv/extract` | Multipart field `file` | Detected skills and original phrases, nullable proficiency, bounded extracted sections, warnings |
| `POST /api/v1/profiles/analyze` | Shared request | Evidence-aware skills, assessment priorities, warnings and version |
| `GET /api/v1/assessments/skills` | None | Five optional knowledge checks, scope and supported level descriptors |
| `POST /api/v1/assessments/start` | `{ "skill_id": "sql" }` | Opaque assessment ID and assigned public question |
| `GET /api/v1/assessments/{id}/question` | Opaque assessment ID | Current assigned question; no hidden grading data |
| `POST /api/v1/assessments/submit` | Assessment ID, assigned question ID, answer option ID | Next public question or completed provisional result |
| `GET /api/v1/assessments/{id}/result` | Completed assessment ID | Provisional level, confidence, attempts, tested competencies and limitations |
| `POST /api/v1/careers/recommend` | Shared request | Ranked careers, selected ID, fit/range, provisional coverage, factor contributions, SDGs, sources and assumptions |
| `POST /api/v1/careers/skill-gaps` | Shared request | Required, demonstrated and provisional levels; null confirmed gaps when unverified; provisional gaps and priorities |
| `POST /api/v1/ai-impact/analyze` | Shared request | Named task inventory, weighted exposure index, per-task contributions, augmentation, human judgment and uncertainty |
| `POST /api/v1/scenarios/compare` | Shared request | Moderate/accelerated scores, numerical differences, assumptions and recalculated roadmap priorities |
| `POST /api/v1/roadmaps/generate` | Shared request | Ordered milestones, target levels, prerequisites, real resources, hours/weeks, evidence tasks and portfolio project |
| `POST /api/v1/skills/impact` | Shared request plus `skill_id`, `target_level` | Current/projected requirement coverage and additional satisfied requirements; exactly one modified skill |
| `POST /api/v1/employers/match` | Shared request plus optional `milestone_ids` | Selected-milestone projection, synthetic role alignments, separate eligibility checks and action summary |
| `POST /api/v1/insights/explain-career-score` | Shared request | Same deterministic calculation as career endpoint, active weights, optional explanation wording |
| `POST /api/v1/insights/explain-skill-assessment` | Shared request or `{ "assessment_id": "..." }` | Evidence-aware synthetic profile inspection or completed result; no private answer keys |
| `POST /api/v1/insights/explain-ai-impact` | Shared request | Same deterministic task calculation as impact endpoint |
| `GET /api/v1/system/datasets` | Kind, filters, paging query | Public allowlisted dataset records, total, clamped page, page size |
| `GET /api/v1/market/changes` | None | Imported dated observations and comparable-series changes with source attribution; not live data |

For employer projection, omitting `milestone_ids` assumes completion of the proposed roadmap. Supplying an empty list projects no added skill. Supplying IDs projects only those milestones. IDs outside the selected roadmap are rejected. Planning never updates actual evidence.

The dataset explorer accepts `kind`, `country`, `occupation_id`, `evidence_status`, `version`, `page` and `page_size` (1 to 100). Private assessment tables are not valid kinds. Market comparisons group by occupation, skill, metric/indicator, country, source and unit, preventing subtraction of incompatible observations.

## Errors and upload boundaries

Validation errors use FastAPI's standard `{ "detail": ... }` structure with HTTP 422. An unsupported planning country returns a detail object with code `unsupported_market`, the selected country and an actionable message. Unknown occupations or assessment IDs return HTTP 404. Incomplete assessments and replayed/out-of-order answers return HTTP 409. Expired evidence returns HTTP 410. A backend restart removes in-memory assessment results; reassessment is needed.

CV extraction accepts UTF-8 TXT, text-based PDF and DOCX. It checks a 5 MB file limit, valid document signatures/containers, at most 50 PDF pages and a 20 MB total expanded DOCX size. Extracted text is capped at 100,000 characters. Empty or unreadable documents return 422; unsupported extensions return 415; oversized content returns 413. Scanned PDFs return an explicit OCR-not-implemented message. Temporary uploads are closed and documents are not retained. Production deployment still needs a proxy request-size cap before multipart parsing.

There is no arbitrary code execution endpoint. Assessment submission accepts only the assigned answer option ID. Diagnostic endpoints return no API keys, private profiles, CV text or assessment answer bank. The service has no public-user authentication yet; keep it in the intended local demo environment until the [deployment safeguards](limitations.md) are implemented.
