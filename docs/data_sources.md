# Data sources and evidence boundaries

The shipped `my-demo-2026.10.21-v1` catalogue contains 11 country records, eight occupational planning examples, nine skill definitions, 24 occupational tasks, nine learning references, nine fictional employer-role records, two synthetic dated observations and ten SDG mappings. Counts in the running application come from the database rather than these descriptive totals.

Malaysia is operational for the planning workflow using curated examples. No verified Malaysian occupational-demand dataset, official MASCO crosswalk, salary series, employer vacancy feed or work-authorisation dataset has been imported. Other ASEAN markets are architecture placeholders with capabilities disabled. Malaysian data must never be substituted for them.

## Evidence categories

| Category | Meaning in this catalogue |
|---|---|
| Source-backed | The linked provider/reference exists and its subject was checked on 21 October 2026. This does not verify SHIFT//OS scoring assumptions. |
| Curated illustrative | Team-authored occupational requirements, task weights/exposure, skill levels, learning effort and SDG interpretations. These require domain review. |
| Synthetic demonstration | Fictional employers, their requirements and dated market fixtures. They are not vacancies or market observations. |
| Unavailable | No applicable local evidence has been imported. |

The two synthetic market observations exist solely to exercise dated-snapshot comparisons. They are explicitly excluded from market-outlook claims and career scoring. Their change does not describe the Malaysian labour market.

## Verified primary links

All links below were opened through web retrieval on 21 October 2026. Kaggle and Khan Academy returned JavaScript pages without extractable text; their canonical course pages resolved. Microsoft and United Nations pages returned readable source content.

| Skill or context | Reference | What it supports |
|---|---|---|
| SQL | [SQLBolt](https://sqlbolt.com/) | Interactive lessons from SELECT/filtering to joins and aggregates. |
| Python | [Kaggle Learn Python](https://www.kaggle.com/learn/python) | Canonical Python course link; browser/JavaScript access may be required. |
| Excel | [Microsoft Excel help and learning](https://support.microsoft.com/en-us/excel/) | Official formulas, data analysis and PivotTable guidance. |
| Statistics | [Khan Academy Statistics and probability](https://www.khanacademy.org/math/statistics-probability) | Canonical learning collection link. |
| Business Analysis | [Microsoft Learn: Work with requirements](https://learn.microsoft.com/en-us/training/modules/work-with-requirements/) | Requirements capture and stakeholder context in Microsoft products. |
| Power BI | [Microsoft Learn Power BI](https://learn.microsoft.com/en-us/training/powerplatform/power-bi) | Official connected-data, modelling and reporting learning paths. |
| Workflow Automation | [Microsoft Learn Power Automate](https://learn.microsoft.com/en-us/training/powerplatform/power-automate) | Official workflow automation learning paths. |
| Communication | [Microsoft Teams help and learning](https://support.microsoft.com/en-us/teams/) | Collaboration-tool reference, not a comprehensive communication qualification. |
| Sustainability | [United Nations SDG 12](https://sdgs.un.org/goals/goal12) | Reporting context and SDG target 12.6, not a professional reporting certification. |
| Skill development | [United Nations SDG 4](https://sdgs.un.org/goals/goal4) | Target 4.4 supports relevant technical and vocational skill development. |
| Technological improvement | [United Nations SDG 8](https://sdgs.un.org/goals/goal8) | Target 8.2 concerns productivity through upgrading and innovation. |
| Taxonomy architecture | [European Commission ESCO](https://esco.ec.europa.eu/en/classification/occupation_main) | Architectural context for occupation/skill relations. No taxonomy records or exact crosswalks are claimed. |

Learning durations include team-estimated practice time; they are not provider-certified durations. Reference collections are labelled as collections or references instead of invented course titles. Free learning content may require separately licensed software or paid optional exams. Learning completion does not itself establish assessed competency.

## Updating the data

Use `datasets/seed/catalog.json` as the editable full-catalogue example. Every imported collection uses stable IDs, and occupational/role requirements embed `skill_id`, `required_level` and `weight` mappings. These mappings are normalised into relational foreign-key tables during import. Changing data does not require editing the algorithms.

From the repository root, with the backend dependencies installed:

```powershell
.\.venv\Scripts\python.exe scripts/seed_database.py
.\.venv\Scripts\python.exe scripts/import_dataset.py datasets/seed/catalog.json
.\.venv\Scripts\python.exe scripts/import_dataset.py path/to/resources.csv --collection resources --version my-reviewed-2026.10.22-v2
```

JSON imports require a complete object with the collections `countries`, `sources`, `skills`, `occupations`, `tasks`, `resources`, `employer_roles`, `market_signals`, `scenarios`, `sdg_mappings` and `dataset_versions`. CSV imports replace one named collection in the current catalogue. Use JSON-encoded cells for list/object fields such as `requirements`, `aliases`, `skill_ids` and `assumptions`; normal CSV quoting still applies. Version IDs are immutable: changing an existing dataset version is rejected; pass a new `--version` or include a new version record in the JSON.

Imports validate collection shape, duplicate IDs, required fields, supported country codes, source/occupation/skill references, proficiency ranges, task exposure ranges, positive weights and HTTPS learning links before writes. A full import runs in one database transaction. A SHA-256 content hash makes repeated identical imports no-ops, and import history records counts, version and UTC time. Relational constraints enforce important foreign keys and numeric bounds independently of Python validation. SQLite enables foreign-key enforcement; a SQLAlchemy `DATABASE_URL` can target PostgreSQL with the appropriate installed driver.

Validation also rejects non-finite numbers anywhere in the JSON, malformed string arrays, prerequisite cycles, invalid dates, conflicting employer identities and non-numeric scenario multipliers. Market observations require a metric, unit, source and observation date so changes can be compared within a consistent series. Imports do not silently reactivate an older inactive snapshot: restoring historical contents requires a new version ID. The `--version` flag records the snapshot version; record-level `dataset_version` values remain authored provenance, so update them in changed CSV records when appropriate.

The active scenario engine applies `priority_multipliers` and `learning_multiplier` from the imported scenario records. These assumptions change requirement importance, learning ordering and estimated learning effort. Legacy fixture fields named `adaptation_weight` and `exposure_multiplier` are retained in the immutable seed catalogue but are not active model parameters; System Insights reports the applied fields. Neither scenario changes the underlying illustrative exposure measurements into an adoption forecast.

Do not import private CVs or personal profiles into the public catalogue. Original documents are not part of this pipeline. Public System Insights may inspect the public catalogue and synthetic fixtures only.

## Research and expansion priorities

Before making real labour-market claims, add permitted MASCO/ESCO/O*NET mappings and dated DOSM or other official observations with publication dates, exact methodology and licensing. Task exposure needs reviewed research mappings and occupational validation; the existing numbers are illustrative. Real employer matching requires specific, dated, permission-compatible employer role descriptions plus a current vacancy status and independent eligibility checks. Importing a source URL alone does not convert an illustrative record into verified evidence.
