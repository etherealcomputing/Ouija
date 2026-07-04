"""Minimal BIDS dataset skeleton for the non-MNE converters.

The EEG converters get ``dataset_description.json`` + ``participants.tsv`` for
free from ``mne_bids.write_raw_bids``. The phenotype and imaging converters
write their datatypes by hand (stdlib / nibabel), so they need a helper to lay
down the same top-level scaffold a BIDS validator expects. Everything here is
idempotent — it never clobbers a description a real recording already wrote.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

# Keep these in lockstep with the repo's existing bids_dataset/dataset_description.json.
DATASET_NAME = "Ouija"
BIDS_VERSION = "1.9.0"
AUTHORS = ["Eros Marcello Iuliano"]


def ensure_dataset(root: Path, name: str = DATASET_NAME) -> Path:
    """Ensure ``root`` is a minimally valid BIDS dataset root.

    Writes ``dataset_description.json`` (if absent) via mne-bids so the schema
    matches what the EEG path produces, and a ``participants.tsv``/``.json`` pair
    (if absent). Returns ``root``.
    """
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)

    desc = root / "dataset_description.json"
    if not desc.exists():
        from mne_bids import make_dataset_description

        make_dataset_description(
            path=str(root),
            name=name,
            dataset_type="raw",
            authors=AUTHORS,
            overwrite=False,
        )
        # make_dataset_description pins its own BIDSVersion; normalise to ours so
        # the phenotype/imaging trees agree with the EEG tree.
        data = json.loads(desc.read_text())
        data["BIDSVersion"] = BIDS_VERSION
        desc.write_text(json.dumps(data, indent=4) + "\n")

    ensure_participant(root, "01")
    return root


def ensure_participant(root: Path, subject: str) -> None:
    """Add ``sub-<subject>`` to participants.tsv (creating the pair if needed)."""
    root = Path(root)
    pid = subject if subject.startswith("sub-") else f"sub-{subject}"

    tsv = root / "participants.tsv"
    if not tsv.exists():
        with open(tsv, "w", newline="") as fh:
            w = csv.writer(fh, delimiter="\t")
            w.writerow(["participant_id"])
            w.writerow([pid])
    else:
        existing = {row.split("\t")[0] for row in tsv.read_text().splitlines()[1:] if row}
        if pid not in existing:
            with open(tsv, "a", newline="") as fh:
                csv.writer(fh, delimiter="\t").writerow([pid])

    sidecar = root / "participants.json"
    if not sidecar.exists():
        sidecar.write_text(
            json.dumps(
                {"participant_id": {"Description": "Unique participant identifier"}},
                indent=4,
            )
            + "\n"
        )
