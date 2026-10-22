"""Validated, reproducible catalogue imports backed by SQLAlchemy."""

import csv
from datetime import date, datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
from threading import RLock

from sqlalchemy import create_engine, delete, event, select, text
from sqlalchemy.orm import Session

from .models import (
    AssessmentQuestion,
    AssessmentRubric,
    Base,
    Country,
    DatasetVersion,
    Employer,
    EmployerRequirement,
    EmployerRole,
    EvidenceSource,
    ImportRecord,
    LearningResource,
    MarketSignal,
    Occupation,
    OccupationSkill,
    OccupationTask,
    ResourceSkill,
    Scenario,
    SdgMapping,
    Skill,
)

SEED_PATH = Path(__file__).resolve().parents[2] / "datasets" / "seed" / "catalog.json"
if not SEED_PATH.exists():
    SEED_PATH = Path(__file__).resolve().parent / "seed.json"
DEFAULT_DATABASE = "sqlite:///" + str(Path(__file__).resolve().parents[1] / "shiftos.db").replace("\\", "/")
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE)
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
if DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _sqlite_fk(dbapi_connection, _connection_record):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")


TABLES = {
    "countries": Country,
    "sources": EvidenceSource,
    "skills": Skill,
    "occupations": Occupation,
    "tasks": OccupationTask,
    "resources": LearningResource,
    "employer_roles": EmployerRole,
    "market_signals": MarketSignal,
    "scenarios": Scenario,
    "sdg_mappings": SdgMapping,
    "dataset_versions": DatasetVersion,
}
STATUSES = {"source-backed", "curated illustrative", "synthetic demonstration", "unavailable"}
ASEAN_CODES = {"MY", "SG", "ID", "PH", "TH", "VN", "BN", "KH", "LA", "MM", "TL"}
_lock = RLock()
_initialized = False


def _ids(rows):
    return {row["id"] for row in rows}


def _positive_number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    try:
        return math.isfinite(value) and value > 0
    except OverflowError:
        return False


def _json_value(value, path="dataset"):
    if value is None or isinstance(value, (str, bool, int)):
        return
    if isinstance(value, float) and math.isfinite(value):
        return
    if isinstance(value, list):
        for index, item in enumerate(value):
            _json_value(item, f"{path}[{index}]")
        return
    if isinstance(value, dict) and all(isinstance(key, str) for key in value):
        for key, item in value.items():
            _json_value(item, f"{path}.{key}")
        return
    raise ValueError(f"Invalid JSON value or non-finite number at {path}")


def _string_list(value, path, allowed=None, nonempty=False):
    if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
        raise ValueError(f"{path} must be a list of nonempty strings")
    if len(value) != len(set(value)) or (nonempty and not value):
        raise ValueError(
            f"{path} must contain distinct values" + (" and cannot be empty" if nonempty else "")
        )
    if allowed is not None and not set(value) <= allowed:
        raise ValueError(f"Unknown reference in {path}")


def _iso_date(value, path):
    try:
        if not isinstance(value, str):
            raise ValueError
        date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{path} requires an ISO date (YYYY-MM-DD)") from exc


def validate_catalog(catalog):
    if not isinstance(catalog, dict):
        raise ValueError("Dataset must be an object of named collections.")
    _json_value(catalog)
    for key in TABLES:
        if key not in catalog or not isinstance(catalog[key], list):
            raise ValueError(f"Missing collection: {key}")
        ids = []
        for row in catalog[key]:
            if not isinstance(row, dict) or not isinstance(row.get("id"), str) or not row["id"].strip():
                raise ValueError(f"Every {key} record requires a nonempty string id.")
            ids.append(row["id"])
        if len(ids) != len(set(ids)):
            raise ValueError(f"Duplicate identifier in {key}.")
    countries, sources, skills, occupations = (
        _ids(catalog[k]) for k in ("countries", "sources", "skills", "occupations")
    )
    if not countries <= ASEAN_CODES:
        raise ValueError("Unknown ASEAN country code.")
    for key, rows in catalog.items():
        if key not in TABLES:
            raise ValueError(f"Unknown dataset collection: {key}")
        for row in rows:
            if "country" in row and (
                not isinstance(row["country"], str) or row["country"] not in countries | {"GLOBAL"}
            ):
                raise ValueError(f"Unknown country in {key}: {row['id']}")
            if "source_id" in row and (
                not isinstance(row["source_id"], str) or row["source_id"] not in sources
            ):
                raise ValueError(f"Unknown source in {key}: {row['id']}")
            if "evidence_status" in row and (
                not isinstance(row["evidence_status"], str) or row["evidence_status"] not in STATUSES
            ):
                raise ValueError(f"Unknown evidence status in {key}: {row['id']}")
            if "occupation_id" in row and (
                not isinstance(row["occupation_id"], str) or row["occupation_id"] not in occupations
            ):
                raise ValueError(f"Unknown occupation in {key}: {row['id']}")
    required = {
        "countries": ("name", "supported"),
        "sources": ("name", "evidence_status", "verified_at", "methodology"),
        "skills": ("name", "aliases", "source_id"),
        "occupations": ("name", "title", "country", "requirements", "source_id", "evidence_status"),
        "tasks": ("occupation_id", "description", "weight", "exposure", "source_id", "evidence_status"),
        "resources": ("title", "provider", "url", "skill_ids", "hours", "cost", "source_id", "verified_at"),
        "employer_roles": (
            "employer_id",
            "employer_name",
            "title",
            "occupation_id",
            "country",
            "requirements",
            "source_id",
            "source_status",
        ),
        "market_signals": (
            "occupation_id",
            "country",
            "date",
            "source_id",
            "metric",
            "unit",
            "value",
            "evidence_status",
        ),
        "scenarios": ("name", "assumptions"),
        "sdg_mappings": ("occupation_id", "goal", "target", "explanation", "source_id"),
        "dataset_versions": ("name", "created_at"),
    }
    for key, fields in required.items():
        for row in catalog[key]:
            for field in fields:
                if field not in row:
                    raise ValueError(f"Missing required field {key}.{field} in {row['id']}")
            for field in (
                "name",
                "title",
                "description",
                "employer_id",
                "employer_name",
                "provider",
                "methodology",
                "explanation",
                "metric",
                "unit",
            ):
                if field in row and (not isinstance(row[field], str) or not row[field].strip()):
                    raise ValueError(f"{key}.{field} must be nonempty text in {row['id']}")
            for field in ("verified_at", "created_at", "date"):
                if field in row:
                    _iso_date(row[field], f"{key}.{field}")
    for row in catalog["countries"]:
        if not isinstance(row["supported"], bool):
            raise ValueError("Country supported must be a boolean")
    for row in catalog["skills"]:
        _string_list(row["aliases"], "skills.aliases")
        _string_list(row.get("prerequisites", []), "skills.prerequisites", skills)
        if "hours_per_level" in row and not _positive_number(row["hours_per_level"]):
            raise ValueError("Skill hours_per_level must be a positive finite number")
    prerequisites = {row["id"]: row.get("prerequisites", []) for row in catalog["skills"]}
    visited, visiting = set(), set()

    def visit(skill_id):
        if skill_id in visiting:
            raise ValueError("Skill prerequisites must not contain cycles")
        if skill_id in visited:
            return
        visiting.add(skill_id)
        for prerequisite in prerequisites[skill_id]:
            visit(prerequisite)
        visiting.remove(skill_id)
        visited.add(skill_id)

    for skill_id in skills:
        visit(skill_id)
    for row in catalog["occupations"]:
        _string_list(row.get("interests", []), "occupations.interests")
    for key in ("occupations", "employer_roles"):
        for row in catalog[key]:
            if not isinstance(row["requirements"], list) or not row["requirements"]:
                raise ValueError(f"Requirements must be a nonempty list in {row['id']}")
            seen = set()
            for req in row["requirements"]:
                if not isinstance(req, dict):
                    raise ValueError(f"Invalid requirement record in {row['id']}")
                sid = req.get("skill_id")
                if not isinstance(sid, str) or sid not in skills or sid in seen:
                    raise ValueError(f"Unknown or duplicate skill requirement in {row['id']}")
                seen.add(sid)
                if type(req.get("required_level")) is not int or req["required_level"] not in range(1, 6):
                    raise ValueError(f"Invalid requirement level in {row['id']}")
                if not _positive_number(req.get("weight")):
                    raise ValueError(f"Invalid requirement weight in {row['id']}")
    for row in catalog["tasks"]:
        _string_list(row.get("adaptation_skills", []), "tasks.adaptation_skills", skills)
        if (
            not _positive_number(row["weight"])
            or isinstance(row["exposure"], bool)
            or not isinstance(row["exposure"], (int, float))
            or not 0 <= row["exposure"] <= 1
        ):
            raise ValueError(f"Invalid task weight or exposure: {row['id']}")
    for row in catalog["resources"]:
        _string_list(row["skill_ids"], "resources.skill_ids", skills, nonempty=True)
        if (
            not isinstance(row["url"], str)
            or not row["url"].startswith("https://")
            or not row["skill_ids"]
            or any(s not in skills for s in row["skill_ids"])
        ):
            raise ValueError(f"Invalid resource URL or skill: {row['id']}")
        if not _positive_number(row["hours"]):
            raise ValueError(f"Invalid resource duration: {row['id']}")
        if not isinstance(row["cost"], str) or row["cost"] not in {"free", "paid"}:
            raise ValueError("Resource cost must be free or paid")
    employers = {}
    for row in catalog["employer_roles"]:
        identity = (row["employer_name"], row["country"])
        if row["employer_id"] in employers and employers[row["employer_id"]] != identity:
            raise ValueError("Conflicting name or country for employer identifier")
        employers[row["employer_id"]] = identity
        if not isinstance(row["source_status"], str) or row["source_status"] not in STATUSES:
            raise ValueError("Employer source_status must be a supported evidence category")
        experience = row.get("experience_years", 0)
        if (
            isinstance(experience, bool)
            or not isinstance(experience, (int, float))
            or not 0 <= experience <= 65
        ):
            raise ValueError("Employer experience_years must be between 0 and 65")
    for row in catalog["market_signals"]:
        if isinstance(row["value"], bool) or not isinstance(row["value"], (int, float)):
            raise ValueError("Market signal value must be a finite number")
    for row in catalog["scenarios"]:
        _string_list(row["assumptions"], "scenarios.assumptions", nonempty=True)
        multipliers = row.get("priority_multipliers", {})
        if (
            not isinstance(multipliers, dict)
            or not set(multipliers) <= skills
            or any(not _positive_number(value) for value in multipliers.values())
        ):
            raise ValueError("Scenario priority_multipliers require known skills and positive finite numbers")
        for field in ("adaptation_weight", "learning_multiplier", "exposure_multiplier"):
            if field in row and not _positive_number(row[field]):
                raise ValueError(f"Scenario {field} must be a positive finite number")
    if not catalog["dataset_versions"]:
        raise ValueError("At least one dataset version is required.")
    return catalog


def _checksum(catalog):
    return hashlib.sha256(
        json.dumps(catalog, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
    ).hexdigest()


def import_catalog(catalog, db_engine=None):
    """Replace a complete public catalogue atomically; repeated identical imports are no-ops."""
    validate_catalog(catalog)
    target = db_engine or engine
    Base.metadata.create_all(target)
    checksum = _checksum(catalog)
    version = catalog["dataset_versions"][-1]["id"]
    with _lock, Session(target) as session, session.begin():
        previous = session.scalar(select(ImportRecord).where(ImportRecord.checksum == checksum))
        if previous:
            current = session.scalar(select(ImportRecord).order_by(ImportRecord.id.desc()).limit(1))
            if current.checksum != checksum:
                raise ValueError(
                    "This historical catalogue is inactive; use a new version id to restore its data."
                )
            return {"status": "unchanged", "version": version, "checksum": checksum}
        existing = session.get(DatasetVersion, version)
        if existing is not None and existing.checksum != checksum:
            raise ValueError("Dataset version already exists with different contents; use a new version id.")
        for model in (
            AssessmentQuestion,
            AssessmentRubric,
            EmployerRequirement,
            EmployerRole,
            Employer,
            ResourceSkill,
            OccupationSkill,
            OccupationTask,
            MarketSignal,
            SdgMapping,
            LearningResource,
            Occupation,
            Skill,
            Scenario,
            EvidenceSource,
            Country,
        ):
            session.execute(delete(model))
        for key in (
            "countries",
            "sources",
            "skills",
            "occupations",
            "tasks",
            "resources",
            "employer_roles",
            "market_signals",
            "scenarios",
            "sdg_mappings",
        ):
            model = TABLES[key]
            for row in catalog[key]:
                args = {"id": row["id"], "payload": row}
                for field in ("country", "source_id", "occupation_id"):
                    if hasattr(model, field):
                        args[field] = row[field]
                if key == "tasks":
                    args.update(weight=row["weight"], exposure=row["exposure"])
                if key == "employer_roles":
                    employer = session.get(Employer, row["employer_id"])
                    if employer is None:
                        session.add(
                            Employer(id=row["employer_id"], name=row["employer_name"], country=row["country"])
                        )
                        session.flush()
                    args["employer_id"] = row["employer_id"]
                session.add(model(**args))
            session.flush()
        _seed_assessment_bank(session, _ids(catalog["skills"]))
        for occupation in catalog["occupations"]:
            for req in occupation["requirements"]:
                session.add(
                    OccupationSkill(
                        occupation_id=occupation["id"],
                        **{key: req[key] for key in ("skill_id", "required_level", "weight")},
                    )
                )
        for role in catalog["employer_roles"]:
            for req in role["requirements"]:
                session.add(
                    EmployerRequirement(
                        role_id=role["id"],
                        **{key: req[key] for key in ("skill_id", "required_level", "weight")},
                    )
                )
        for resource in catalog["resources"]:
            for sid in resource["skill_ids"]:
                session.add(ResourceSkill(resource_id=resource["id"], skill_id=sid))
        for row in catalog["dataset_versions"]:
            if session.get(DatasetVersion, row["id"]) is None:
                session.add(DatasetVersion(id=row["id"], checksum=checksum, payload=row))
        imported_at = datetime.now(timezone.utc).isoformat()
        session.add(
            ImportRecord(
                version=version,
                checksum=checksum,
                imported_at=imported_at,
                payload={"counts": {k: len(v) for k, v in catalog.items()}},
            )
        )
    return {"status": "imported", "version": version, "checksum": checksum, "imported_at": imported_at}


def init_db():
    global _initialized
    with _lock:
        if not _initialized:
            Base.metadata.create_all(engine)
            with Session(engine) as session:
                populated = session.scalar(select(Occupation.id).limit(1))
            if populated is None:
                import_catalog(json.loads(SEED_PATH.read_text(encoding="utf-8")))
            with Session(engine) as session, session.begin():
                _seed_assessment_bank(session, set(session.scalars(select(Skill.id)).all()))
            _initialized = True


def _seed_assessment_bank(session, skill_ids):
    """Store the authored bank server-side; it is intentionally absent from public catalogue reads."""
    from .assessment import QUESTION_BANK

    for skill_id, questions in QUESTION_BANK.items():
        if skill_id not in skill_ids:
            continue
        rubric_id = f"{skill_id}-foundational-v1"
        if session.get(AssessmentRubric, rubric_id) is None:
            session.add(
                AssessmentRubric(
                    id=rubric_id,
                    skill_id=skill_id,
                    payload={
                        "method": "exact_option_id",
                        "max_provisional_level": 2,
                        "limitations": "Foundational knowledge only; practical independent application is not established.",
                    },
                )
            )
            session.flush()
        for item in questions:
            if session.get(AssessmentQuestion, item["id"]) is None:
                session.add(
                    AssessmentQuestion(id=item["id"], skill_id=skill_id, rubric_id=rubric_id, payload=item)
                )


def get_catalog():
    init_db()
    with Session(engine) as session:
        return {
            key: [record.payload for record in session.scalars(select(model).order_by(model.id)).all()]
            for key, model in TABLES.items()
        }


def database_health():
    try:
        init_db()
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "connected", "dialect": engine.dialect.name}
    except Exception:
        return {"status": "unavailable"}


def last_import():
    init_db()
    with Session(engine) as session:
        record = session.scalar(select(ImportRecord).order_by(ImportRecord.id.desc()).limit(1))
        return (
            None
            if record is None
            else {
                "version": record.version,
                "checksum": record.checksum,
                "imported_at": record.imported_at,
                **record.payload,
            }
        )


def load_dataset(path, collection=None, base_catalog=None):
    """JSON accepts a full catalogue; CSV replaces one collection using JSON cells for arrays."""
    path = Path(path)
    if path.suffix.lower() == ".json":
        return validate_catalog(json.loads(path.read_text(encoding="utf-8-sig")))
    if path.suffix.lower() != ".csv" or collection not in TABLES:
        raise ValueError("Use full JSON or CSV with a valid --collection.")
    if base_catalog is None:
        base_catalog = get_catalog()
    catalog = json.loads(json.dumps(base_catalog))
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    for row in rows:
        for key, value in row.items():
            if value and (
                value[0] in "[{"
                or value in {"true", "false", "null"}
                or key in {"weight", "exposure", "hours", "level", "experience_years", "value"}
            ):
                try:
                    row[key] = json.loads(value)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"Invalid JSON or number in CSV column {key}") from exc
    catalog[collection] = rows
    return validate_catalog(catalog)
