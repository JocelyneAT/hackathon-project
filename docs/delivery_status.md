# Delivery status

Verified locally on 22 October 2026. The production frontend is served at http://127.0.0.1:3000 and the API at http://127.0.0.1:8000 while the local server processes remain running. Restart instructions are in the root README.

Hosted on Render at <https://hackathon-project-xewk.onrender.com>. The Linux container built and started successfully; all nine browser tests passed on the hosted site. See [hosting details](hosting.md) for the private repository, free service behavior and deployment notes.

## Implemented

- Next.js, React, TypeScript and Tailwind frontend with four connected planning stages and a separate read-only System data workspace. The current interface uses plain English, numbers and small tables without charts.
- FastAPI, typed Pydantic requests/responses, SQLAlchemy relational storage and SQLite startup seeding. OpenAPI exposes 26 paths and 35 component schemas.
- Eleven country records, with Malaysia operational and unsupported markets explicitly rejected. Eight occupations, nine skills, 24 tasks, nine learning references and nine synthetic employer roles.
- Adaptive career-stage and direction inputs, separate current and target occupations, interests, learning constraints, optional CV extraction and reviewed source phrases.
- PDF, DOCX and TXT extraction with validation and no intentional document retention. Extracted background can be reviewed and copied into editable fields.
- Five optional adaptive knowledge assessments, curated answer keys, server-owned grading, provisional evidence, expiration, replay rejection and no answer-key leakage.
- Backend career ranking, qualified fit ranges, skill gaps, task-weighted AI exposure, hypothetical scenario comparisons, prerequisite-aware roadmaps, single-skill simulations and selected-milestone employer projections.
- Employer eligibility considerations, SDG rationales, portfolio projects and a printable career action summary inside the fourth stage.
- Dataset import validation, atomic rollback, immutable versions, JSON/CSV support and dated market snapshot comparisons.
- Synthetic HTTP demonstration, environment configuration, Windows launcher, Docker/Compose files, methodology and API documentation.

## Partially implemented

- AI-assisted wording is optional and configured through environment variables. Mocked provider and fallback tests pass; no paid live provider call was made. Rule-based extraction works without a provider.
- Skill checks assess narrow foundational knowledge and establish provisional Levels 1–2. They do not verify practical workplace proficiency or advanced expertise.
- Learning effort and career weights are transparent planning heuristics. Resource difficulty is not individually calibrated; work-arrangement preference is collected but does not currently filter synthetic roles.
- SQLAlchemy and the PostgreSQL driver provide a configuration path. Only SQLite was exercised.
- The combined deployment container was built and started by Render. Local Docker and the separate Compose deployment were not exercised.

## Missing

- Reviewed local labour-market observations, real employer vacancies and validated recommendation outcomes.
- Local datasets for the other ten countries, multilingual content and cross-border eligibility analysis.
- OCR, secure practical code execution, human evidence review and externally validated assessment instruments.
- Authentication, durable user evidence, production rate limits, database migrations and cross-device profile storage.

## Evidence limitations

Occupation requirements, task exposure indicators, effort estimates and scenario multipliers are curated illustrative assumptions. Employer identities, role requirements and market snapshots are synthetic demonstrations. All visible role examples are labelled accordingly. No job-loss or hiring probability is claimed. Provider and UN links supply learning/goal context; they do not validate the model. See [data sources](data_sources.md) and [limitations](limitations.md).

## Test results

| Verification | Actual result |
|---|---|
| `python -m pytest backend/tests -q --basetemp=.pytest-verification` | 110 passed; one upstream Starlette TestClient deprecation warning |
| `ruff check backend scripts` | Passed |
| `ruff format --check backend scripts` | Passed; 19 files |
| `npm --prefix frontend run typecheck` | Passed |
| `npm --prefix frontend run format:check` | Passed |
| `npm --prefix frontend run build` | Passed with the supported Webpack compiler |
| `npm --prefix frontend run test:e2e` | Nine tests passed against the production build, including the complete workflow, control audit and failed-switch regression |
| Real HTTP `scripts/run_demo.py` | Passed for all three synthetic profiles |
| Premium strict UI audit | Passed; zero findings in `premium-audit.json` |
| DESIGN.md lint | Zero errors; advisory token-reference warnings |

Windows sandbox restrictions prevented local sockets/worker startup in restricted execution. Local verification commands requiring these facilities ran with approved host execution. A Turbopack production worker crash was resolved by using Next.js's supported Webpack build option. These environment issues did not require reducing application functionality.

## Next priorities

1. Have the dataset team review occupation mappings, task indicators and Malaysian source provenance.
2. Add permitted, dated employer evidence and suitable entry-level opportunities.
3. Review the assessment bank with subject experts, then add properly isolated practical evaluation.
4. Evaluate planning recommendations with representative students and professionals.
5. Verify Docker/PostgreSQL, add migration and deployment safeguards, and test additional browsers/devices before a public pilot.
