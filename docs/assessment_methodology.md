# Skill assessment methodology

SHIFT//OS uses a small, curated knowledge question bank for SQL, Python, Microsoft Excel, Statistics and Business Analysis. The assessment version is `assessment-1.0`. The implementation is in `backend/app/assessment.py`.

The assessment is optional. Skipping it leaves demonstrated proficiency unknown. CV keywords, project mentions and self-reported experience do not produce an assessed proficiency level.

## Item bank and adaptation

Each skill has five internally authored items. An item contains a stable identifier, skill identifier, difficulty, competency, prompt, four answer options, an expected answer, an exact-option scoring rubric, rationale and authoring metadata. Items are curated illustrative assessment content. They have not undergone external psychometric validation.

An assessment starts with a difficulty-1 foundation item. A correct response raises the next target difficulty, up to difficulty 2. An incorrect response lowers the next target difficulty, with a minimum of 1. The assessor chooses an unattempted item at that difficulty, or another unattempted item if necessary. It stops after three responses.

The assessor samples only the competencies named by the assigned items. Passing a question about aggregation does not establish ability to optimise queries or administer databases.

## Scoring and proficiency

Each exact option-ID match receives one point. The estimator uses the following deterministic rule:

| Evidence | Estimated proficiency | Confidence |
| --- | --- | --- |
| No correct responses | Unknown (`null`), insufficient evidence | Low |
| At least one correct response, without the Level 2 conditions | Provisional Level 1 | Low |
| At least two correct responses, including a difficulty-2 item | Provisional Level 2 | Low, or Moderate when all three are correct |

Level 1 describes awareness and recognition of basic concepts. Level 2 describes interpretation of foundational applications. Skill-specific descriptors for all five levels are returned by the assessment catalogue. Levels 3 to 5 require practical assessment rubrics that this MVP does not implement. A perfect beginner score cannot award advanced expertise.

Confidence is a qualitative evidence category, separate from proficiency. It is not a calibrated statistical probability. A failed short assessment does not establish absence of ability; its result remains unknown rather than Level 0.

All non-null results remain provisional. They are not a professional certificate, identity verification or proof of independent workplace performance. Learning completion also does not convert a provisional result into verified competence.

## API and integrity boundaries

The router exposes:

- `GET /api/v1/assessments/skills`: supported skills, framework descriptors, scope and limitations.
- `POST /api/v1/assessments/start`: takes `skill_id` and returns an opaque assessment identifier and assigned item.
- `GET /api/v1/assessments/{assessment_id}/question`: returns the same assigned item without advancing or grading it.
- `POST /api/v1/assessments/submit`: takes `assessment_id`, `question_id` and an answer option ID.
- `GET /api/v1/assessments/{assessment_id}/result`: returns completed evidence; incomplete assessments return HTTP 409.

Before completion, responses omit expected answers, scoring rubrics, rationales and per-item correctness. The client cannot choose a different question, replay a submitted question, submit unsupported answer values or revise a completed assessment. Unknown identifiers return HTTP 404. Expired identifiers return HTTP 410. Pydantic rejects unexpected fields and overlong inputs. Random identifiers use `secrets.token_urlsafe(32)`.

The intelligence engine resolves completed assessment IDs against server-held results through `lookup_results`. It does not accept client-provided proficiency as assessment evidence. The lookup rejects duplicate IDs and more than 20 IDs in a request.

Results and sessions are held in memory for two hours and are lost on backend restart. At most 2,048 sessions are held by a backend process; expired sessions are purged before new assessments start. Assessment routes are intended for a local MVP. Opaque IDs provide possession-based access; public deployment needs identity/session ownership, rate limiting, shared storage and an explicit retention policy. Do not share assessment IDs publicly.

## Code execution

SQL and Python items are static interpretation questions. The MVP does not run submitted SQL, Python, spreadsheet formulas or arbitrary code. Answer submission accepts only the option IDs supplied with the current item. There is no coding sandbox or practical code execution capability, and the API explicitly reports that limitation.

A future implementation should use separate, resource-limited execution infrastructure. SQL should run against temporary isolated assessment databases with constrained statements and predefined expected outputs. Python should run in an isolated sandbox rather than in the FastAPI process.

## Validation

`backend/tests/test_assessment.py` covers all five skills, adaptive progression and fallback, the foundational level cap, confidence, unknown results, hidden answer keys, incomplete-result access, replay and out-of-order submission, invalid code-like answers, forged and expired IDs, duplicate evidence, unsupported skills, unexpected fields and bounded session capacity.

On the development Windows host, local socket creation used by FastAPI TestClient requires the test command to run outside the restricted sandbox. This is a tooling limitation; it does not change the application scoring rules.
