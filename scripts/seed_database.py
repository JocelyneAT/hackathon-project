"""Seed the local database idempotently. Run from the repository root."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.data import get_catalog, last_import

if __name__ == "__main__":
    catalog = get_catalog()
    print(
        {
            "counts": {key: len(rows) for key, rows in catalog.items()},
            "last_import": last_import(),
        }
    )
