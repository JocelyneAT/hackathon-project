"""Import a full JSON catalogue or replace a collection using CSV."""

import argparse
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.data import import_catalog, load_dataset

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path")
    parser.add_argument(
        "--collection", help="Required for CSV, e.g. occupations or skills"
    )
    parser.add_argument(
        "--version", help="New immutable version id; required for changed CSV imports"
    )
    args = parser.parse_args()
    try:
        catalog = load_dataset(args.path, args.collection)
        if args.version:
            catalog["dataset_versions"].append(
                {
                    "id": args.version,
                    "name": args.version,
                    "created_at": datetime.now(UTC).date().isoformat(),
                }
            )
        print(import_catalog(catalog))
    except (ValueError, OSError) as exc:
        parser.exit(1, f"Import rejected: {exc}\n")
