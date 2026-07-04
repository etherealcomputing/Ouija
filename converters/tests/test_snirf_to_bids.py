"""Tests for the fNIRS SNIRF → BIDS nirs/ converter. Synthetic only."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from converters.fnirs.fnirs import load_snirf, simulate_snirf
from converters.fnirs.snirf_to_bids import write_nirs_bids


def test_simulate_snirf_is_valid_and_readable(tmp_path):
    from snirf import validateSnirf

    path = simulate_snirf(tmp_path / "rec.snirf", seconds=6.0, seed=1, n_pairs=4)
    assert path.exists()
    assert validateSnirf(str(path)).is_valid()

    raw = load_snirf(path)
    # 4 source/detector pairs × 2 wavelengths = 8 channels, all CW amplitude.
    assert len(raw.ch_names) == 8
    assert set(raw.get_channel_types()) == {"fnirs_cw_amplitude"}


def test_simulate_is_deterministic(tmp_path):
    a = load_snirf(simulate_snirf(tmp_path / "a.snirf", seconds=4.0, seed=7))
    b = load_snirf(simulate_snirf(tmp_path / "b.snirf", seconds=4.0, seed=7))
    assert np.allclose(a.get_data(), b.get_data())


def test_write_nirs_bids_snirf_and_sidecar(tmp_path):
    raw = load_snirf(simulate_snirf(tmp_path / "rec.snirf", seconds=5.0, seed=2))
    bp = write_nirs_bids(raw, tmp_path / "bids", subject="01", session="nirs", task="rest")

    snirf_out = Path(bp.fpath)
    assert snirf_out.suffix == ".snirf"
    assert snirf_out.exists()

    root = tmp_path / "bids"
    sidecars = list(root.rglob("*_nirs.json"))
    assert sidecars, "no _nirs.json sidecar written"
    meta = json.loads(sidecars[0].read_text())
    assert meta["Manufacturer"].startswith("Generic")
    assert meta["PowerLineFrequency"] == 60.0

    # BIDS scaffolding mne-bids emits for nirs/.
    assert list(root.rglob("*_channels.tsv"))
    assert list(root.rglob("*_optodes.tsv"))
    assert (root / "dataset_description.json").exists()

    # Round-trip read.
    from mne_bids import read_raw_bids

    back = read_raw_bids(bp, verbose="ERROR")
    assert len(back.ch_names) == len(raw.ch_names)
