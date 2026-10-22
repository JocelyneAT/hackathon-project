# SHIFT//OS

An evidence-aware career planning MVP for Malaysia, with country coverage architecture for all eleven ASEAN countries. The four-step application connects Your profile, Career options, Learning plan and Job options. System data explains the data and calculations. The user interface uses plain English and simple tables without charts.

The interface calls a real FastAPI backend backed by SQLite. Career matching, skill gaps, task exposure, scenarios, learning priorities, skill simulations and projected employer alignment are calculated by deterministic Python engines. The application works without an LLM key.

**Evidence limits:** occupational requirements and AI task indicators are curated illustrative data. Employer roles and dated market snapshots are synthetic demonstrations. They are not actual vacancies, national labour statistics, measured exposure findings or employment predictions. Official learning and UN links provide resource and SDG context; they do not validate the scoring model.

## Requirements

- Python 3.12 or newer.
- Node.js 22 or newer and npm.
- Two local ports: 8000 for FastAPI, 3000 for Next.js.
- Docker with Compose is optional.

Run commands from the repository root unless a command changes directory. Dependencies are declared in `backend/requirements.txt` and `frontend/package-lock.json`.

## Quick start on Windows

In PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
npm.cmd --prefix frontend ci
Copy-Item .env.example .env
.\scripts\start.ps1
```

Alternatively, `scripts/start.ps1 -InstallDependencies` installs missing dependencies before starting both servers. The script keeps server windows hidden, writes logs to `.local/logs`, and stops its own server process trees when you press Ctrl+C. It rejects ports already in use. If your PowerShell policy blocks scripts, use the two-terminal commands below instead of changing a machine-wide policy.

Run only one Next.js development server from this checkout at a time. Next.js also locks its development directory, so choosing another port does not allow a second server in the same checkout.

Open [the application](http://127.0.0.1:3000) and [interactive API documentation](http://127.0.0.1:8000/docs). The database schema and seed catalogue load automatically on first backend startup. No CV, professional experience or paid API key is required.

For separate terminals:

```powershell
# Terminal 1, repository root
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --env-file .env
```

```powershell
# Terminal 2, repository root
$env:BACKEND_URL = 'http://127.0.0.1:8000'
npm.cmd --prefix frontend run dev -- --hostname 127.0.0.1 --port 3000
```

## Quick start on Linux or macOS

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend ci
cp .env.example .env
```

Start the API in one terminal:

```bash
.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --env-file .env
```

Start Next.js in a second terminal:

```bash
BACKEND_URL=http://127.0.0.1:8000 npm --prefix frontend run dev -- --hostname 127.0.0.1 --port 3000
```

For a production frontend build, set `BACKEND_URL` **before** running `npm --prefix frontend run build`, then use `npm --prefix frontend run start`. The build script uses Next.js's supported Webpack compiler because the Turbopack production worker crashed on the development Windows host. Next.js evaluates the API rewrite destination at build time. Rebuild after changing the backend origin. `/api/*` requests go through Next.js to FastAPI, so browser code does not hold a provider API key.

## Demonstrate the complete workflow

Enter your background or use a synthetic profile in the interface. Uploading a CV and completing a skill assessment are optional. The target-career mode respects the chosen occupation. Working professionals can select their actual current tasks. Changing a scenario, skill projection or selected roadmap milestones triggers backend calculations.

With the API running, execute the HTTP demonstration:

```powershell
.\.venv\Scripts\python.exe scripts\run_demo.py --output .local\demo-results.json
```

On Linux/macOS, use `.venv/bin/python scripts/run_demo.py`. Add `--base-url http://127.0.0.1:8000` to select another backend.

The script sends three synthetic profiles through the API: a starter with unverified skills, an administrative professional with selected tasks and unverified SQL, and a graduate targeting Data Analyst who completes a short SQL assessment. It checks real CV extraction, unknown skill handling, target preservation, scenario differences, skill-only simulation, explicitly selected milestone projections, unsupported-country rejection and System Insights counts. It prints a computed summary and exits with a nonzero status if a check fails. The saved summary contains synthetic data only.

The real HTTP demonstration passed locally on 22 October 2026 against the running API, without an LLM key. In that run, profile A selected Sustainability Data Analyst, profile B selected Operations Analyst while analysing its current administrative tasks, and profile C retained Data Analyst after the SQL assessment. Scenario changes, single-skill projections, selected-milestone employer calculations and unsupported-country handling passed. The latest local result is saved in `.local/demo-results.json`; rerun the command to regenerate it. These are synthetic fixture outcomes, not evidence that the recommendation model predicts employment success.

## Verification commands

```powershell
# Python tests and style, from repository root
.\.venv\Scripts\python.exe -m pytest backend\tests -q
.\.venv\Scripts\ruff.exe check backend scripts
.\.venv\Scripts\ruff.exe format --check backend scripts

# Frontend static checks and production compilation
npm.cmd --prefix frontend run typecheck
npm.cmd --prefix frontend run format:check
npm.cmd --prefix frontend run build

# Browser tests (with application servers running; uses installed Microsoft Edge on Windows)
npm.cmd --prefix frontend run test:e2e
```

On Linux/macOS, replace `.venv\Scripts\python.exe` with `.venv/bin/python`, `ruff.exe` with `.venv/bin/ruff`, and `npm.cmd` with `npm`.

The Playwright configuration uses installed Microsoft Edge on Windows and bundled Chromium elsewhere. On Linux/macOS, first run `cd frontend && npx playwright install chromium`. Set `PLAYWRIGHT_CHANNEL` to override the browser channel, and `PLAYWRIGHT_BASE_URL` for a nondefault frontend port. Restricted Windows execution environments may block the loopback sockets used by TestClient and local servers; run the commands in a regular local terminal when necessary. Executed verification results belong in the delivery report; this command list does not imply that every platform or deployment mode has been tested.

## Docker

```bash
docker compose up --build
```

The default Compose configuration publishes the same loopback URLs, starts the frontend after backend health succeeds, and persists SQLite in the `shiftos-data` volume. It injects the internal API origin `http://backend:8000` during the frontend build. `docker compose down` stops the containers while retaining the database volume.

Docker files are provided for the team to verify. Docker was unavailable in the development environment, so image builds and Compose startup have not been executed there.

For PostgreSQL, set `DATABASE_URL` to a SQLAlchemy URL such as `postgresql+psycopg://user:password@host:5432/shiftos` before starting the API. The driver is included, and the models avoid SQLite-specific application queries. You must provide the database. PostgreSQL operation and migrations have not been verified; SQLite is the tested local target. Compose deliberately defaults to SQLite and overrides the host's `DATABASE_URL`.

## Configuration and privacy

`.env.example` lists the supported settings. The Windows launcher and the manual backend command above load root `.env`; Next.js uses its process environment for `BACKEND_URL`. Do not commit `.env` or place secrets in frontend source. Optional `OPENAI_API_KEY` and `OPENAI_MODEL` enable wording assistance for already calculated career explanations; deterministic results remain the source of numeric scores. Provider availability is not required for the app.

Profiles are processed per request. CVs are not permanently retained; framework upload handling may use temporary storage which closes after extraction. Assessment results are held in memory for two hours and disappear on restart. If evidence expires or the backend restarts, reload the page to begin a new local profile and retake any optional assessments; private profile fields intentionally do not survive reload. Do not enter sensitive real documents into a public deployment without adding authentication, upload limits, ownership controls and a retention policy. See [known limitations](docs/limitations.md).

## Data team workflow

```powershell
# Show actual loaded counts and seed an empty database idempotently
.\.venv\Scripts\python.exe scripts\seed_database.py

# Import a complete reviewed catalogue
.\.venv\Scripts\python.exe scripts\import_dataset.py datasets\seed\catalog.json

# Replace a collection from CSV; array/object cells contain JSON
.\.venv\Scripts\python.exe scripts\import_dataset.py new-resources.csv --collection resources --version team-resources-v2
```

Imports validate required fields, stable IDs, references, countries, requirement levels, task weights and source statuses before atomically replacing the public catalogue. Repeating an identical import is a no-op. Changed content needs a new immutable dataset version. Importing is a local CLI action; System Insights is read-only. Review [data sources and import guidance](docs/data_sources.md) before replacing data.

## Project map

| Location | Responsibility |
| --- | --- |
| `frontend/src/app` | Next.js application and shared visual tokens |
| `frontend/src/components` | Four-step planning workspace and reusable interface components |
| `frontend/src/lib` | Typed API integration and frontend helpers |
| `backend/app/main.py` | Versioned REST routes, health and safe diagnostics |
| `backend/app/engines.py` | Deterministic recommendation, gap, impact, scenario, roadmap, simulation and employer engines |
| `backend/app/assessment.py` | Curated adaptive knowledge checks and evidence estimation |
| `backend/app/cv.py` | Bounded PDF, DOCX and TXT extraction |
| `backend/app/models.py`, `data.py` | Relational schema, provenance, seeding and validated imports |
| `datasets/seed/catalog.json` | Versioned public planning catalogue |
| `backend/tests`, `frontend/tests` | Automated backend and browser checks |
| `scripts` | Startup, imports and real-HTTP synthetic demonstration |
| `docs` | Architecture, API contracts, methodologies, sources and limitations |

Start with [architecture](docs/architecture.md), [API contracts](docs/api_contracts.md), [scoring methodology](docs/scoring_methodology.md), [assessment methodology](docs/assessment_methodology.md), [AI impact methodology](docs/ai_impact_methodology.md), [source evidence](docs/data_sources.md), and [known limitations](docs/limitations.md). FastAPI also generates the running schema at `/openapi.json`.

See the [delivery status and executed checks](docs/delivery_status.md) for implemented, partial and missing capabilities, and the [UI verification record](docs/ui_verification.md) for browser coverage and design-gate evidence.
