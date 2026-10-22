"""Short, curated assessments with server-held keys and provisional evidence.

All items are multiple choice. Submitted Python or SQL is never executed. These
short assessments establish only foundational knowledge, not independent job
performance or advanced expertise.
"""

from __future__ import annotations

from copy import deepcopy
import secrets
from threading import RLock
import time
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from .quiz_items import ITEMS


router = APIRouter(prefix="/api/v1/assessments", tags=["Skill assessments"])
SESSION_TTL_SECONDS = 2 * 60 * 60
MAX_ACTIVE_SESSIONS = 2048
MAX_QUESTIONS = 3
_sessions: dict[str, dict] = {}
_lock = RLock()
_now = time.time

LIMITATIONS = (
    "Three curated multiple-choice items sample foundational knowledge only. "
    "Results are provisional and are not a professional certification. "
    "Independent application, practical code execution and advanced expertise "
    "are not tested. Python and SQL code execution are unsupported."
)

SKILL_NAMES = {
    "sql": "SQL",
    "python": "Python",
    "excel": "Microsoft Excel",
    "statistics": "Statistics",
    "business-analysis": "Business Analysis",
}

# Each statement describes an observable ability. The current item bank can
# support levels 1 and 2 only; higher descriptors guide future practical rubrics.
LEVEL_DESCRIPTORS = {
    "sql": [
        "Recognise tables, records, SELECT and filtering terminology.",
        "Interpret basic filters, aggregation and simple joins.",
        "Independently query and validate common multi-table datasets.",
        "Troubleshoot complex queries and improve query performance.",
        "Design and evaluate reliable analytical database solutions.",
    ],
    "python": [
        "Recognise variables, collections and control-flow terminology.",
        "Trace short loops, functions and list operations.",
        "Independently write and test common data-processing functions.",
        "Debug complex programs and evaluate their efficiency.",
        "Design and maintain robust, scalable Python systems.",
    ],
    "excel": [
        "Recognise cells, ranges and common spreadsheet functions.",
        "Select basic formulas and interpret references and summaries.",
        "Independently build and validate useful spreadsheet analyses.",
        "Troubleshoot complex workbooks and automate repeatable analysis.",
        "Design and govern reliable spreadsheet modelling systems.",
    ],
    "statistics": [
        "Recognise averages, variation and sampling terminology.",
        "Calculate and interpret basic summaries and simple study findings.",
        "Independently choose and validate common statistical analyses.",
        "Evaluate modelling assumptions and complex study limitations.",
        "Design and critically evaluate advanced statistical methods.",
    ],
    "business-analysis": [
        "Recognise stakeholders, requirements and acceptance criteria.",
        "Identify measurable requirements and basic process issues.",
        "Independently elicit, prioritise and validate business requirements.",
        "Resolve conflicting requirements and evaluate complex processes.",
        "Design and evaluate organisation-wide analysis practices.",
    ],
}


def _item(
    skill: str,
    suffix: str,
    difficulty: int,
    competency: str,
    prompt: str,
    options: tuple[str, str, str, str],
    correct: str,
    rationale: str,
) -> dict:
    return {
        "id": f"{skill}-{suffix}",
        "skill_id": skill,
        "difficulty": difficulty,
        "competency": competency,
        "type": "multiple_choice",
        "prompt": prompt,
        "options": [{"id": chr(97 + index), "text": value} for index, value in enumerate(options)],
        "expected_answer": correct,
        "rubric": {"method": "exact_option_id", "points": 1},
        "rationale": rationale,
        "authoring_metadata": {
            "author": "SHIFT//OS curated demonstration item bank",
            "version": "assessment-1.0",
            "authored_at": "2026-10-21",
            "evidence_status": "curated illustrative",
            "review_status": "internally authored; external psychometric validation unavailable",
        },
    }


QUESTION_BANK = {
    "sql": [
        _item(
            "sql",
            "f1",
            1,
            "Filtering records",
            "Which SQL clause filters individual rows before grouping?",
            ("ORDER BY", "WHERE", "GROUP BY", "LIMIT"),
            "b",
            "WHERE filters rows before aggregation.",
        ),
        _item(
            "sql",
            "f2",
            1,
            "Selecting columns",
            "Which statement retrieves only the name column from employees?",
            (
                "SELECT name FROM employees;",
                "GET employees.name;",
                "SELECT employees TO name;",
                "SHOW name IN employees;",
            ),
            "a",
            "SELECT names the output columns and FROM names the table.",
        ),
        _item(
            "sql",
            "a1",
            2,
            "Aggregation interpretation",
            "Orders contain amounts 10, 20 and 30. What does SELECT SUM(amount) FROM orders WHERE amount >= 20 return?",
            ("30", "60", "50", "2"),
            "c",
            "The filter retains 20 and 30; their sum is 50.",
        ),
        _item(
            "sql",
            "f3",
            1,
            "Counting rows",
            "Which expression counts all rows in a query result?",
            ("SUM(*)", "COUNT(*)", "TOTAL ROWS", "NUMBER(*)"),
            "b",
            "COUNT(*) counts rows including rows containing null column values.",
        ),
        _item(
            "sql",
            "a2",
            2,
            "Join interpretation",
            "Customers has IDs 1 and 2. Orders has one row with customer_id 1. An INNER JOIN on customer ID returns how many matching rows?",
            ("0", "2", "3", "1"),
            "d",
            "Only customer 1 has an order, so the inner join has one match.",
        ),
    ],
    "python": [
        _item(
            "python",
            "f1",
            1,
            "Collection terminology",
            "Which Python value is a list?",
            ("{'a': 1}", "(1, 2)", "[1, 2]", "{1, 2}"),
            "c",
            "Square brackets create a list literal.",
        ),
        _item(
            "python",
            "f2",
            1,
            "Basic sequence length",
            "What does len([2, 4, 6]) return?",
            ("3", "6", "12", "2"),
            "a",
            "len reports the number of elements, which is three.",
        ),
        _item(
            "python",
            "a1",
            2,
            "Tracing a loop",
            "Trace this code without executing it: total = 0; then for each x in [1, 2, 3], add x * 2 to total. What is total?",
            ("6", "9", "10", "12"),
            "d",
            "The accumulated values are 2, 4 and 6, totalling 12.",
        ),
        _item(
            "python",
            "f3",
            1,
            "Function return",
            "Which keyword sends a value back from a Python function?",
            ("print", "return", "yieldback", "send"),
            "b",
            "return sends a function result to its caller.",
        ),
        _item(
            "python",
            "a2",
            2,
            "List filtering",
            "What is [x for x in [1, 2, 3, 4] if x % 2 == 0]?",
            ("[1, 3]", "[0, 2]", "[2, 4]", "[1, 2, 3, 4]"),
            "c",
            "The condition retains the even values 2 and 4.",
        ),
    ],
    "excel": [
        _item(
            "excel",
            "f1",
            1,
            "Range formulas",
            "Which Excel formula adds values in A1 through A5?",
            ("=SUM(A1:A5)", "=ADD(A1-A5)", "=TOTAL(A1,A5)", "=SUM(A1;A5;ONLY)"),
            "a",
            "SUM accepts the contiguous range A1:A5.",
        ),
        _item(
            "excel",
            "f2",
            1,
            "Cell references",
            "In a spreadsheet, what does B3 identify?",
            (
                "An entire worksheet",
                "A named function",
                "Every cell in column B",
                "The cell in column B and row 3",
            ),
            "d",
            "A cell reference combines its column and row.",
        ),
        _item(
            "excel",
            "a1",
            2,
            "Absolute references",
            "Cell C2 contains =B2*$F$1. If copied down to C3, what is the formula?",
            ("=B2*$F$2", "=B3*$F$1", "=B3*$F$2", "=C3*$G$1"),
            "b",
            "B2 moves relatively to B3; the absolute reference $F$1 stays fixed.",
        ),
        _item(
            "excel",
            "f3",
            1,
            "Average formulas",
            "A1, A2 and A3 contain 2, 4 and 6. What does =AVERAGE(A1:A3) return?",
            ("12", "3", "4", "6"),
            "c",
            "The sum 12 divided by three values gives 4.",
        ),
        _item(
            "excel",
            "a2",
            2,
            "Conditional aggregation",
            "Which formula totals sales in B2:B5 only where the corresponding A2:A5 value is East?",
            (
                '=COUNTIF(A2:A5,"East")',
                '=SUM(B2:B5,"East")',
                '=IF(A2:A5,"East",B2:B5)',
                '=SUMIF(A2:A5,"East",B2:B5)',
            ),
            "d",
            "SUMIF uses a criteria range, a condition and a sum range.",
        ),
    ],
    "statistics": [
        _item(
            "statistics",
            "f1",
            1,
            "Arithmetic mean",
            "What is the mean of 2, 4 and 9?",
            ("4", "5", "9", "15"),
            "b",
            "The sum is 15 and there are three observations, giving a mean of 5.",
        ),
        _item(
            "statistics",
            "f2",
            1,
            "Median",
            "What is the median of 1, 3, 8, 10 and 20?",
            ("3", "10", "8", "20"),
            "c",
            "The middle observation in the sorted list is 8.",
        ),
        _item(
            "statistics",
            "a1",
            2,
            "Interpreting association",
            "Ice cream sales and heat-related illness rise together in summer. What can this observation alone establish?",
            (
                "An association; temperature could be a confounder",
                "Ice cream causes heat illness",
                "Heat illness causes ice cream sales",
                "No association exists",
            ),
            "a",
            "Association alone cannot establish causation; shared seasonal factors may explain both.",
        ),
        _item(
            "statistics",
            "f3",
            1,
            "Variation",
            "Two datasets have the same mean. Which measure helps compare how spread out their values are?",
            ("Number of column names", "Mode label", "Alphabetic order", "Standard deviation"),
            "d",
            "Standard deviation measures dispersion around a mean.",
        ),
        _item(
            "statistics",
            "a2",
            2,
            "Sampling bias",
            "A university estimates all students' commute times using responses only from a cycling club. What is the main concern?",
            (
                "The mean cannot be calculated",
                "The sample may not represent all students",
                "Every commute must be identical",
                "A larger cycling-club sample always removes the bias",
            ),
            "b",
            "Club membership can systematically affect commuting patterns, producing selection bias.",
        ),
    ],
    "business-analysis": [
        _item(
            "business-analysis",
            "f1",
            1,
            "Acceptance criteria",
            "Which is a measurable acceptance criterion for a report export?",
            (
                "The export should be nice",
                "Users will probably like it",
                "CSV export contains all filtered rows and the displayed column headings",
                "The system should use modern technology",
            ),
            "c",
            "A criterion should describe observable, testable behaviour.",
        ),
        _item(
            "business-analysis",
            "f2",
            1,
            "Stakeholder identification",
            "Who is a stakeholder in a change to a customer refund process?",
            (
                "Only the software vendor",
                "Only the project manager",
                "Anyone using the same font",
                "Customers, support agents and finance staff affected by refunds",
            ),
            "d",
            "Stakeholders include people affected by or influencing the process.",
        ),
        _item(
            "business-analysis",
            "a1",
            2,
            "Clarifying requirements",
            "A stakeholder requests a faster approval process. What is the best next analysis step?",
            (
                "Immediately remove all approvals",
                "Define the current delay, desired measurable outcome and required controls",
                "Choose a programming language",
                "Promise same-day delivery",
            ),
            "b",
            "Clarification establishes a measurable need and relevant constraints before a solution is chosen.",
        ),
        _item(
            "business-analysis",
            "f3",
            1,
            "Functional requirements",
            "Which statement describes functional behaviour?",
            (
                "A user can filter orders by date",
                "The interface looks beautiful",
                "The project has a friendly name",
                "The team enjoys the work",
            ),
            "a",
            "A functional requirement describes what the system enables a user to do.",
        ),
        _item(
            "business-analysis",
            "a2",
            2,
            "Root-cause analysis",
            "Refund tickets repeatedly reopen because bank details are missing. Which proposed change most directly addresses the observed cause?",
            (
                "Change the ticket colours",
                "Close reopened tickets automatically",
                "Collect and validate required bank details before submission",
                "Remove customer feedback",
            ),
            "c",
            "Validating the missing input addresses the observed cause; effectiveness should then be measured.",
        ),
    ],
}


SKILL_NAMES.update(
    {
        "html": "HTML",
        "cpp": "C++",
        "power-bi": "Power BI",
        "communication": "Communication",
        "automation": "Workflow Automation",
        "sustainability": "Sustainability Reporting",
    }
)
for _skill, _rows in ITEMS.items():
    LEVEL_DESCRIPTORS.setdefault(
        _skill,
        [
            "Recognise foundational terminology.",
            "Interpret common practical situations.",
            "Apply the skill independently.",
            "Solve complex problems.",
            "Design advanced solutions.",
        ],
    )
    for _index, (_prompt, _correct, *_distractors) in enumerate(_rows):
        _options = list(_distractors)
        _position = _index % 4
        _options.insert(_position, _correct)
        QUESTION_BANK.setdefault(_skill, []).append(
            _item(
                _skill,
                f"extended-{_index}",
                1 if _index % 2 == 0 else 2,
                _prompt.split("?")[0][:90],
                _prompt,
                tuple(_options),
                chr(97 + _position),
                _correct,
            )
        )


class StartAssessment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    skill_id: str = Field(min_length=1, max_length=100)
    question_count: Literal[3, 10] = 3
    generate: bool = False


class SubmitAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assessment_id: str = Field(min_length=10, max_length=100)
    question_id: str = Field(min_length=1, max_length=80)
    answer: str = Field(min_length=1, max_length=20)


class AnswerOption(BaseModel):
    id: str
    text: str


class PublicQuestion(BaseModel):
    """Explicit response shape prevents accidental grading-key disclosure."""

    id: str
    skill_id: str
    prompt: str
    options: list[AnswerOption]
    difficulty: int
    competency: str
    type: Literal["multiple_choice"]
    authoring_metadata: dict[str, str]


class AssessmentProgress(BaseModel):
    answered: int
    total: int


class CompletedAttempt(BaseModel):
    question_id: str
    difficulty: int
    competency: str
    correct: bool
    score: int


class AssessmentResult(BaseModel):
    assessment_id: str
    skill_id: str
    estimated_proficiency: int | None
    provisional_level_range: list[int] | None
    confidence: Literal["low", "moderate"]
    assessment_status: Literal["provisional", "insufficient_evidence"]
    questions_attempted: int
    correct_count: int
    explanation: str
    tested_competencies: list[str]
    rubric_applied: str
    attempts: list[CompletedAttempt]
    source: str
    limitations: str
    completed_at: float
    verification: str


class AssessmentState(BaseModel):
    source: str
    assessment_id: str
    skill_id: str
    status: Literal["in_progress", "completed"]
    question: PublicQuestion | None
    result: AssessmentResult | None
    progress: AssessmentProgress
    limitations: str


class SkillLevelDescriptor(BaseModel):
    level: int
    description: str
    supported: bool


class AssessmentSkill(BaseModel):
    skill_id: str
    name: str
    question_count: int
    estimated_minutes: int
    maximum_supported_level: int
    assessment_type: str
    level_descriptors: list[SkillLevelDescriptor]


class AssessmentCatalog(BaseModel):
    skills: list[AssessmentSkill]
    code_execution_supported: bool
    limitations: str
    version: str


def _public_question(question: dict | None) -> dict | None:
    if question is None:
        return None
    allowed = (
        "id",
        "skill_id",
        "prompt",
        "options",
        "difficulty",
        "competency",
        "type",
        "authoring_metadata",
    )
    return deepcopy({key: question[key] for key in allowed})


def _session(assessment_id: str) -> dict:
    session = _sessions.get(assessment_id)
    if not session:
        raise HTTPException(404, "Assessment not found. Start a new assessment.")
    if _now() >= session["expires_at"]:
        del _sessions[assessment_id]
        raise HTTPException(410, "Assessment expired. Start a new assessment.")
    return session


def _view(session: dict) -> dict:
    return {
        "assessment_id": session["assessment_id"],
        "skill_id": session["skill_id"],
        "status": session["status"],
        "question": _public_question(session["current_question"]),
        "result": deepcopy(session.get("result")),
        "progress": {"answered": len(session["attempts"]), "total": session["total"]},
        "limitations": session["limitations"],
        "source": session["source"],
    }


def _estimate(session: dict) -> dict:
    attempts = session["attempts"]
    correct = sum(item["correct"] for item in attempts)
    application_passed = any(item["correct"] and item["difficulty"] == 2 for item in attempts)
    # A single harder answer is insufficient; require a second supporting item.
    minimum_application = 7 if session["total"] == 10 else 2
    minimum_foundation = 4 if session["total"] == 10 else 1
    level = (
        2
        if correct >= minimum_application and application_passed
        else (1 if correct >= minimum_foundation else None)
    )
    confidence = "moderate" if correct == session["total"] and application_passed else "low"
    explanation = (
        f"{correct} of {len(attempts)} knowledge items answered correctly. "
        + (
            f"Provisional Level {level}: {LEVEL_DESCRIPTORS[session['skill_id']][level - 1]} "
            if level is not None
            else "There is insufficient evidence to estimate proficiency; ability remains unknown. "
        )
        + "This result does not establish independent practical performance."
    )
    return {
        "assessment_id": session["assessment_id"],
        "skill_id": session["skill_id"],
        "estimated_proficiency": level,
        "provisional_level_range": [level, level] if level is not None else None,
        "confidence": confidence,
        "assessment_status": "provisional" if level is not None else "insufficient_evidence",
        "questions_attempted": len(attempts),
        "correct_count": correct,
        "explanation": explanation,
        "tested_competencies": [item["competency"] for item in attempts],
        "rubric_applied": f"Exact option-ID scoring; max Level 2 with at least {minimum_application} correct items including an application item. No advanced levels awarded.",
        "attempts": deepcopy(attempts),
        "source": session["source"],
        "limitations": session["limitations"],
        "completed_at": _now(),
        "verification": "Not professionally verified; foundational provisional evidence only",
    }


@router.get("/skills", response_model=AssessmentCatalog)
def available_assessments() -> dict:
    return {
        "skills": [
            {
                "skill_id": skill,
                "name": name,
                "question_count": MAX_QUESTIONS,
                "estimated_minutes": 3,
                "maximum_supported_level": 2,
                "assessment_type": "Curated adaptive multiple-choice knowledge check",
                "level_descriptors": [
                    {"level": index + 1, "description": description, "supported": index < 2}
                    for index, description in enumerate(LEVEL_DESCRIPTORS[skill])
                ],
            }
            for skill, name in SKILL_NAMES.items()
        ],
        "code_execution_supported": False,
        "limitations": LIMITATIONS,
        "version": "assessment-1.0",
    }


@router.post("/start", response_model=AssessmentState)
async def start_assessment(request: StartAssessment) -> dict:
    if request.skill_id not in QUESTION_BANK:
        raise HTTPException(422, "No quiz is available for this skill.")
    bank = QUESTION_BANK[request.skill_id]
    source = "Curated practice quiz"
    if request.generate and request.question_count == 10:
        from .llm import generate_quiz

        generated = await generate_quiz(SKILL_NAMES[request.skill_id])
        if generated:
            bank = [
                _item(
                    request.skill_id,
                    f"generated-{i}",
                    q["difficulty"],
                    q["competency"],
                    q["prompt"],
                    tuple(q["options"]),
                    chr(97 + q["correct_index"]),
                    q["rationale"],
                )
                for i, q in enumerate(generated)
            ]
            for item in bank:
                item["authoring_metadata"]["author"] = "AI-generated; not independently validated"
            source = "AI-generated practice quiz"
    with _lock:
        current_time = _now()
        for assessment_id in list(_sessions):
            if _sessions[assessment_id]["expires_at"] <= current_time:
                del _sessions[assessment_id]
        if len(_sessions) >= MAX_ACTIVE_SESSIONS:
            raise HTTPException(503, "Assessment capacity reached. Please try again later.")
        assessment_id = secrets.token_urlsafe(32)
        session = {
            "assessment_id": assessment_id,
            "skill_id": request.skill_id,
            "bank": bank,
            "total": request.question_count,
            "source": source,
            "limitations": LIMITATIONS
            if request.question_count == 3
            else "Ten knowledge questions sample foundational ability only; not a professional certification. Results are provisional and capped at level 2. Independent practical performance is not tested.",
            "status": "in_progress",
            "current_question": bank[0],
            "attempts": [],
            "created_at": current_time,
            "expires_at": current_time + SESSION_TTL_SECONDS,
        }
        _sessions[assessment_id] = session
        return _view(session)


@router.get("/{assessment_id}/question", response_model=AssessmentState)
def next_question(assessment_id: str) -> dict:
    with _lock:
        return _view(_session(assessment_id))


@router.post("/submit", response_model=AssessmentState)
def submit_answer(request: SubmitAnswer) -> dict:
    with _lock:
        session = _session(request.assessment_id)
        if session["status"] != "in_progress":
            raise HTTPException(409, "This assessment is already complete.")
        question = session["current_question"]
        if request.question_id != question["id"]:
            raise HTTPException(
                409, "Answer the currently assigned question. Refresh the assessment question."
            )
        if request.answer not in {option["id"] for option in question["options"]}:
            raise HTTPException(
                422, "Choose one of the supplied answer options. Code execution is unsupported."
            )
        correct = request.answer == question["expected_answer"]
        session["attempts"].append(
            {
                "question_id": question["id"],
                "difficulty": question["difficulty"],
                "competency": question["competency"],
                "correct": correct,
                "score": 1 if correct else 0,
            }
        )
        if len(session["attempts"]) >= session["total"]:
            session["status"] = "completed"
            session["current_question"] = None
            session["result"] = _estimate(session)
        else:
            target = min(2, question["difficulty"] + 1) if correct else max(1, question["difficulty"] - 1)
            attempted = {item["question_id"] for item in session["attempts"]}
            unattempted = [item for item in session["bank"] if item["id"] not in attempted]
            candidates = [item for item in unattempted if item["difficulty"] == target]
            session["current_question"] = (candidates or unattempted)[0]
        return _view(session)


def get_assessment_result(assessment_id: str) -> dict:
    with _lock:
        session = _session(assessment_id)
        if session["status"] != "completed":
            raise HTTPException(409, "Assessment is not complete. Continue the current assessment.")
        return deepcopy(session["result"])


@router.get("/{assessment_id}/result", response_model=AssessmentResult)
def assessment_result(assessment_id: str) -> dict:
    return get_assessment_result(assessment_id)


def lookup_results(assessment_ids: list[str]) -> list[dict]:
    """Resolve only server-generated, completed, unexpired assessment evidence."""
    if len(assessment_ids) > 20 or len(set(assessment_ids)) != len(assessment_ids):
        raise HTTPException(422, "Provide at most 20 distinct assessment identifiers.")
    with _lock:
        return [get_assessment_result(assessment_id) for assessment_id in assessment_ids]
