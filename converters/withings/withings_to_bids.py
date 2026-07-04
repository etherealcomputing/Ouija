"""Write Withings Body Scan measures into a BIDS ``phenotype/`` table.

`phenotype/` is the ratified BIDS home for non-imaging subject measurements
(body composition, vascular age, …). BIDS phenotype tables are keyed by
``participant_id`` (one row per participant), so we write the **most recent**
Body Scan as the participant's snapshot + a JSON data dictionary describing every
column, on top of a minimal dataset skeleton. This matches Ouija's hosting split:
the full daily cadence lives in the continuous NeuroJSON store, and the BIDS
tree carries the current snapshot (kept validator-clean — the legacy
``bids-validator`` does not support multi-row/longitudinal phenotype).

Usage
-----
    # Synthetic self-tracking series (no account needed):
    python -m converters.withings.withings_to_bids --simulate --sessions 7 \
        --root /tmp/ouija_bids --subject 01

    # From a Withings getmeas JSON export:
    python -m converters.withings.withings_to_bids --json getmeas.json \
        --root bids_dataset --subject 01
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from converters.common.bids_skeleton import ensure_dataset, ensure_participant
from converters.common.config import WITHINGS_MEASURES


def write_phenotype(
    rows: list[dict],
    root: Path,
    subject: str = "01",
    measure: str = "body",
) -> Path:
    """Write the latest of ``rows`` as ``phenotype/<measure>.tsv`` (+ ``.json``).

    ``rows`` are the dicts from :func:`simulate_withings` /
    :func:`load_withings_json`. BIDS phenotype tables are one row per
    participant, so we take the most recent measurement (max ``acq_time``) as the
    snapshot. Only measure columns actually present are written (in
    :data:`WITHINGS_MEASURES` order). Returns the TSV path.
    """
    root = Path(root)
    ensure_dataset(root)
    ensure_participant(root, subject)
    pid = subject if subject.startswith("sub-") else f"sub-{subject}"

    if not rows:
        raise ValueError("no Withings measurement rows to write")
    latest = max(rows, key=lambda r: r.get("acq_time") or "")

    present = [m.column for m in WITHINGS_MEASURES.values() if m.column in latest]
    columns = ["participant_id", "acq_time", *present]

    pheno = root / "phenotype"
    pheno.mkdir(parents=True, exist_ok=True)

    tsv_path = pheno / f"{measure}.tsv"
    with open(tsv_path, "w", newline="") as fh:
        w = csv.writer(fh, delimiter="\t")
        w.writerow(columns)
        w.writerow([pid, latest.get("acq_time", "n/a")] + [latest.get(col, "n/a") for col in present])

    # Data dictionary — every column described so the table is self-explaining.
    by_col = {m.column: m for m in WITHINGS_MEASURES.values()}
    ddict: dict = {
        "participant_id": {"Description": "Unique participant identifier"},
        "acq_time": {"Description": "Acquisition time of this snapshot (ISO 8601)", "Units": "datetime"},
    }
    for col in present:
        m = by_col[col]
        ddict[col] = {"Description": m.description, "Units": m.units}
    (pheno / f"{measure}.json").write_text(json.dumps(ddict, indent=4) + "\n")

    return tsv_path


def _cli() -> None:
    p = argparse.ArgumentParser(description="Convert Withings Body Scan measures to BIDS phenotype/.")
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--json", type=Path, help="Withings getmeas JSON export")
    src.add_argument("--simulate", action="store_true", help="use a synthetic self-tracking series")
    p.add_argument("--sessions", type=int, default=7, help="synthetic session count")
    p.add_argument("--seed", type=int, default=0, help="synthetic seed")
    p.add_argument("--root", type=Path, required=True, help="BIDS dataset root")
    p.add_argument("--subject", default="01")
    p.add_argument("--measure", default="body", help="phenotype table name")
    args = p.parse_args()

    if args.simulate:
        from converters.withings.withings import simulate_withings

        rows = simulate_withings(n_sessions=args.sessions, seed=args.seed)
    else:
        from converters.withings.withings import load_withings_json

        rows = load_withings_json(args.json)

    tsv = write_phenotype(rows, args.root, args.subject, args.measure)
    print(f"Wrote {tsv}")


if __name__ == "__main__":
    _cli()
