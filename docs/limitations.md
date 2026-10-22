# Known limitations and next priorities

SHIFT//OS is a functional local MVP with deliberately limited evidence coverage. Its calculations are explainable planning rules, not validated predictions of hiring, job loss or future occupational demand.

## Evidence and geographic coverage

Malaysia is the operational planning market. The other ten ASEAN countries are represented in the country architecture and coverage endpoint but have no local career or employer datasets. Unsupported-country planning requests are rejected rather than silently using Malaysian data.

Occupational requirements, learning effort, skill priorities, task weights and AI exposure indicators are curated illustrative assumptions. Employer organisations, role requirements and dated market observations are explicitly synthetic. They demonstrate calculations and imports; they are not available vacancies, employer endorsements, national labour figures or research estimates.

Official learning-provider links are curated resource records. Their duration and suggested proficiency mapping are planning assumptions unless specifically documented otherwise. UN SDG links support goal context; the occupation-to-target relationship is a team interpretation. ESCO and similar sources are architecture context until actual licensed taxonomy data and reviewed crosswalks are imported.

## Skill intelligence

CVs and profile descriptions are parsed with deterministic aliases and section headings. They detect possible skills and supporting phrases; they do not prove proficiency. Extraction supports text-based PDF, DOCX and UTF-8 TXT within size limits. Scanned or encrypted PDFs need a supported alternative; OCR is not implemented. Unusual formatting, synonyms, languages and sections may need manual correction.

Five short knowledge assessments are implemented. They have internally authored answer keys and deterministic adaptive selection. A result covers only the assigned competencies, remains provisional and cannot exceed Level 2. No external psychometric validation, identity verification, human evidence review, workplace performance assessment or professional certification is provided. Failing an item leaves uncertainty rather than proving the absence of skill.

Python and SQL submissions are not executed. All assessments use bounded answer choices and static interpretation. A separate isolated execution service would be needed for safe practical coding tasks. Learning completion does not establish verified proficiency.

## Planning and matching

Career-fit weights and unknown-skill ranges are configurable heuristic assumptions. Fit, evidence coverage, market outlook and role eligibility are separate concepts. A displayed fit percentage is not an employment probability. Lack of professional experience does not reduce pathway potential; explicit role experience requirements still matter.

Scenarios change skill emphasis and roadmap priorities using declared hypothetical assumptions. They do not forecast adoption timing. Task exposure measures only a weighted illustrative technical exposure index; it does not quantify job displacement.

Learning hours are estimates based on proficiency gaps and weekly availability. Unknown skills receive verification-first recommendations with clearly stated scheduling assumptions. Resource difficulty is not yet calibrated to each user's learning history. Milestone completion is a projection, not a measured outcome.

Employer alignment considers selected projected milestones and documented synthetic skill requirements. Education review, experience and work authorisation remain separate eligibility considerations. There is no employer integration, application submission, live vacancy feed or guarantee of a job. Fictional demonstration organisations have no official company careers pages.

## Privacy, operations and deployment

The local MVP has no user accounts, authentication, cross-device synchronisation or account deletion workflow. Profiles are not retained by the API. Any browser-session state should be cleared on a shared computer. Upload handling can spool temporary files; uploads are closed after extraction and are not intentionally retained. Public deployment needs reverse-proxy request limits before multipart parsing and a reviewed privacy/retention design.

Assessment sessions use random opaque identifiers and possession-based access. Results are kept in one backend process's memory for two hours. They disappear on restart and do not synchronise between workers. Replaying an answer, forging a level, choosing a different question and looking up incomplete or expired evidence are rejected. A public service still needs authenticated session ownership, rate limits and durable evidence records with deletion controls.

System Insights exposes the public catalogue and safe diagnostics. Synthetic data is appropriate for demonstrations; diagnostic routes should be reviewed before deploying with nonpublic datasets. Optional LLM assistance sends a restricted calculated explanation payload to a provider and can fall back to deterministic wording. Provider-specific behaviour has not been validated with a paid live API key.

SQLite is the initial development database. SQLAlchemy models and a PostgreSQL driver provide a configuration path, but PostgreSQL operation and database migrations have not been tested. Docker and Compose files are provided; Docker was not installed in the development environment, so image builds and startup are unverified. There is no hosted deployment or production monitoring.

## Before a public pilot

1. Replace illustrative occupation and task assumptions with reviewed, licensed source data and record its dates, scope and limitations.
2. Import current permitted Malaysian employer-role evidence, then add actual country datasets one market at a time.
3. Review assessment content with subject experts and add isolated practical tasks with skill-specific rubrics.
4. Evaluate recommendation behaviour with representative students and professionals; recalibrate heuristic weights against documented outcomes.
5. Add authenticated evidence ownership, request/rate limits, upload resource limits, database migrations, retention/deletion controls and deployment monitoring.
6. Validate PostgreSQL, Docker, public deployment, accessibility and cross-browser/device behaviour in the team's target environment.
7. Expand language support after the underlying content, vocabulary and country evidence are ready.
