"""Tests for the Withings Body Scan → BIDS phenotype/ converter. Synthetic only."""

from __future__ import annotations

import json
from pathlib import Path

from converters.common.config import WITHINGS_MEASURES
from converters.withings.withings import load_withings_json, simulate_withings
from converters.withings.withings_to_bids import write_phenotype


def test_simulate_shape_and_determinism():
    rows = simulate_withings(n_sessions=7, seed=3)
    assert len(rows) == 7
    # Every measure column present in every row, plus acq_time.
    cols = {m.column for m in WITHINGS_MEASURES.values()}
    for r in rows:
        assert "acq_time" in r
        assert cols <= set(r)
    # Deterministic for a fixed seed.
    assert simulate_withings(n_sessions=7, seed=3) == rows
    # Chronological, one day apart from the 2026-01-01 base.
    assert rows[0]["acq_time"] == "2026-01-01"
    assert rows[1]["acq_time"] == "2026-01-02"


def test_load_withings_json_decodes_value_times_10_pow_unit(tmp_path):
    # weight 75.5 kg → value 75500, unit -3; fat ratio 18.2 % → 182, unit -1.
    payload = {
        "status": 0,
        "body": {
            "measuregrps": [
                {
                    "date": 1767225600,  # 2026-01-01T00:00:00Z
                    "measures": [
                        {"type": 1, "value": 75500, "unit": -3},
                        {"type": 6, "value": 182, "unit": -1},
                        {"type": 999, "value": 1, "unit": 0},  # unknown → ignored
                    ],
                }
            ]
        },
    }
    p = tmp_path / "getmeas.json"
    p.write_text(json.dumps(payload))
    rows = load_withings_json(p)
    assert len(rows) == 1
    assert rows[0]["weight_kg"] == 75.5
    assert rows[0]["fat_ratio_pct"] == 18.2
    assert "acq_time" in rows[0] and rows[0]["acq_time"].startswith("2026-01-01")
    assert all(k not in rows[0] for k in ("999",))  # unknown type dropped


def test_write_phenotype_tsv_and_dictionary(tmp_path):
    rows = simulate_withings(n_sessions=4, seed=5)
    tsv = write_phenotype(rows, tmp_path, subject="01", measure="body")

    assert tsv.name == "body.tsv"
    lines = tsv.read_text().splitlines()
    header = lines[0].split("\t")
    assert header[:2] == ["participant_id", "acq_time"]
    assert "weight_kg" in header and "vascular_age_years" in header
    # One row per participant (the latest snapshot), not one per session.
    assert len(lines) == 1 + 1
    row = lines[1].split("\t")
    assert row[0] == "sub-01"
    # acq_time is the most recent session date (4th day from the base).
    assert row[1] == "2026-01-04"

    ddict = json.loads((tmp_path / "phenotype" / "body.json").read_text())
    assert ddict["weight_kg"]["Units"] == "kg"
    assert "Description" in ddict["participant_id"]
    assert "session_id" not in ddict  # snapshot table, no session column

    # BIDS skeleton laid down for a valid dataset.
    assert (tmp_path / "dataset_description.json").exists()
    part = (tmp_path / "participants.tsv").read_text()
    assert "participant_id" in part and "sub-01" in part
