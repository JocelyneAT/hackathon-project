"""Catalogue validation and database import guarantees."""

from copy import deepcopy
import json

import pytest
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import Session

from app.data import SEED_PATH, import_catalog, load_dataset, validate_catalog
from app.models import Base, ImportRecord, Occupation, OccupationSkill, Skill


@pytest.fixture
def catalog():
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


@pytest.fixture
def database(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


def test_seed_contains_all_operational_entities(catalog):
    validate_catalog(catalog)
    assert len(catalog["occupations"]) == 8
    assert len(catalog["tasks"]) == 24
    assert len(catalog["countries"]) == 11
    assert [r["id"] for r in catalog["countries"] if r["supported"]] == ["MY"]
    assert {r["skill_id"] for o in catalog["occupations"] for r in o["requirements"]} <= {
        s["id"] for s in catalog["skills"]
    }


def test_import_is_reproducible_and_normalized(catalog, database):
    first = import_catalog(catalog, database)
    second = import_catalog(catalog, database)
    assert first["status"] == "imported"
    assert second["status"] == "unchanged"
    assert first["checksum"] == second["checksum"]
    with Session(database) as session:
        assert session.scalar(select(func.count()).select_from(ImportRecord)) == 1
        assert session.scalar(select(func.count()).select_from(Occupation)) == 8
        assert session.scalar(select(func.count()).select_from(OccupationSkill)) == sum(
            len(o["requirements"]) for o in catalog["occupations"]
        )


def test_changed_content_requires_new_immutable_version(catalog, database):
    import_catalog(catalog, database)
    changed = deepcopy(catalog)
    changed["skills"][0]["name"] = "Revised SQL label"
    with pytest.raises(ValueError, match="version already exists"):
        import_catalog(changed, database)
    with Session(database) as session:
        assert session.get(Skill, "sql").payload["name"] == "SQL"
    changed["dataset_versions"].append(
        {"id": "my-demo-v2", "name": "Revised fixture", "created_at": "2026-10-22"}
    )
    assert import_catalog(changed, database)["status"] == "imported"
    with Session(database) as session:
        assert session.get(Skill, "sql").payload["name"] == "Revised SQL label"


@pytest.mark.parametrize(
    "mutation, message",
    [
        (lambda c: c["skills"].append(c["skills"][0]), "Duplicate"),
        (
            lambda c: c["countries"].append({"id": "US", "name": "Unsupported", "supported": False}),
            "country code",
        ),
        (lambda c: c["tasks"][0].update(occupation_id="missing"), "Unknown occupation"),
        (lambda c: c["occupations"][0]["requirements"][0].update(skill_id="missing"), "Unknown or duplicate"),
        (lambda c: c["tasks"][0].update(weight=0), "weight or exposure"),
        (lambda c: c["tasks"][0].update(exposure=1.1), "weight or exposure"),
        (lambda c: c["tasks"][0].update(weight=float("nan")), "non-finite"),
        (lambda c: c["tasks"][0].update(weight=True), "weight or exposure"),
        (lambda c: c["market_signals"][0].update(value=float("inf")), "non-finite"),
        (lambda c: c["market_signals"][0].update(value="invalid"), "finite number"),
        (lambda c: c["sources"][0].update(extra_metadata={"x": float("-inf")}), "non-finite"),
        (lambda c: c["skills"][0].update(prerequisites="excel"), "list of nonempty strings"),
        (lambda c: c["skills"][0].update(prerequisites=["missing"]), "Unknown reference"),
        (lambda c: c["skills"][0].update(prerequisites=["sql"]), "cycles"),
        (lambda c: c["skills"][0].update(aliases={"SQL": "sql"}), "list of nonempty strings"),
        (lambda c: c["skills"][0].update(hours_per_level="12"), "positive finite number"),
        (lambda c: c["scenarios"][0].update(assumptions="Unstructured text"), "list of nonempty strings"),
        (
            lambda c: c["scenarios"][0].update(priority_multipliers={"sql": "large"}),
            "positive finite numbers",
        ),
        (lambda c: c["resources"][0].update(url=[]), "Invalid resource"),
        (lambda c: c["resources"][0].update(skill_ids="sql"), "list of nonempty strings"),
        (lambda c: c["occupations"][0].update(interests="analytics"), "list of nonempty strings"),
        (
            lambda c: c["occupations"][0]["requirements"][0].update(required_level=2.0),
            "Invalid requirement level",
        ),
        (lambda c: c["market_signals"][0].update(date="yesterday"), "ISO date"),
        (lambda c: c["occupations"][0].update(requirements=["invalid"]), "Invalid requirement"),
        (lambda c: c["resources"][0].pop("url"), "Missing required field"),
        (lambda c: c["occupations"][0].update(source_id="missing"), "Unknown source"),
        (lambda c: c["occupations"][0].update(evidence_status="verified fact"), "Unknown evidence"),
    ],
)
def test_invalid_imports_are_rejected_before_write(catalog, database, mutation, message):
    import_catalog(catalog, database)
    mutation(catalog)
    with pytest.raises(ValueError, match=message):
        import_catalog(catalog, database)
    with Session(database) as session:
        assert session.scalar(select(func.count()).select_from(Occupation)) == 8


def test_csv_replaces_validated_collection(catalog, tmp_path):
    path = tmp_path / "sources.csv"
    import csv

    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(catalog["sources"][0]))
        writer.writeheader()
        writer.writerows(catalog["sources"])
    updated = load_dataset(path, "sources", catalog)
    assert len(updated["sources"]) == len(catalog["sources"])
    assert updated["sources"][0]["id"] == catalog["sources"][0]["id"]


def test_sources_and_fictional_records_are_honest(catalog):
    assert all(
        row["source_status"] == "synthetic demonstration" and row["source_url"] is None
        for row in catalog["employer_roles"]
    )
    assert all(row["evidence_status"] == "curated illustrative" for row in catalog["tasks"])
    assert all(row["evidence_status"] == "synthetic demonstration" for row in catalog["market_signals"])
    assert all(row["verified_at"] == "2026-10-21" for row in catalog["resources"])
    assert all(
        row["source_id"]
        for key in ["skills", "occupations", "tasks", "resources", "employer_roles"]
        for row in catalog[key]
    )


def test_database_failure_rolls_back_deleted_rows_and_version(catalog, database):
    import_catalog(catalog, database)
    updated = deepcopy(catalog)
    updated["skills"][0]["name"] = "SQL changed"
    updated["dataset_versions"].append(
        {"id": "rollback-v2", "name": "Rollback test", "created_at": "2026-10-22"}
    )

    def reject_insert(_mapper, _connection, _target):
        raise RuntimeError("Simulated database failure after catalogue deletion")

    event.listen(Occupation, "before_insert", reject_insert)
    try:
        with pytest.raises(RuntimeError, match="Simulated database failure"):
            import_catalog(updated, database)
    finally:
        event.remove(Occupation, "before_insert", reject_insert)
    with Session(database) as session:
        assert session.scalar(select(func.count()).select_from(Occupation)) == 8
        assert session.get(Skill, "sql").payload["name"] == "SQL"
        assert session.scalar(select(func.count()).select_from(ImportRecord)) == 1


def test_inactive_historical_import_never_reports_successful_noop(catalog, database):
    import_catalog(catalog, database)
    updated = deepcopy(catalog)
    updated["skills"][0]["name"] = "SQL changed"
    updated["dataset_versions"].append({"id": "history-v2", "name": "Updated", "created_at": "2026-10-22"})
    import_catalog(updated, database)
    with pytest.raises(ValueError, match="historical catalogue is inactive"):
        import_catalog(catalog, database)
    with Session(database) as session:
        assert session.get(Skill, "sql").payload["name"] == "SQL changed"


def test_json_import_rejects_nonfinite_hidden_metadata(catalog, tmp_path):
    catalog["sources"][0]["metadata"] = {"unsafe_number": float("nan")}
    path = tmp_path / "bad.json"
    path.write_text(json.dumps(catalog), encoding="utf-8")
    with pytest.raises(ValueError, match="non-finite"):
        load_dataset(path)
