"""Tests for the Neurosity Crown → BIDS EDF converter.

Runs entirely on synthetic data — no hardware, no personal recordings.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from converters.common.config import CROWN_CHANNELS
from converters.eeg.neurosity_to_bids import build_raw, write_bids, load_csv
from converters.eeg.simulate import simulate_crown
from converters.common.config import EegSidecarConfig


def test_simulate_shape_and_montage():
    data, ch, sf = simulate_crown(seconds=2.0, seed=1)
    assert data.shape == (8, 512)
    assert ch == CROWN_CHANNELS
    assert sf == 256.0
    # EEG amplitudes are in volts, on the order of tens of microvolts.
    assert np.abs(data).max() < 1e-3


def test_simulate_is_deterministic():
    a, _, _ = simulate_crown(seconds=1.0, seed=7)
    b, _, _ = simulate_crown(seconds=1.0, seed=7)
    assert np.array_equal(a, b)


def test_build_raw_sets_line_freq():
    data, ch, sf = simulate_crown(seconds=1.0)
    raw = build_raw(data, ch, sf, EegSidecarConfig(power_line_freq=50.0))
    assert raw.info["sfreq"] == 256.0
    assert raw.info["line_freq"] == 50.0
    assert raw.ch_names == CROWN_CHANNELS


def test_write_bids_creates_edf_and_sidecar(tmp_path):
    data, ch, sf = simulate_crown(seconds=3.0, seed=2)
    bp = write_bids(data, ch, sf, tmp_path, subject="01", session="sim", task="rest")

    edf = Path(bp.fpath)
    assert edf.exists()
    assert edf.suffix == ".edf"

    # Sidecar carries the fields the Crown stream does not report.
    sidecars = list(tmp_path.rglob("*_eeg.json"))
    assert sidecars, "no _eeg.json sidecar written"
    meta = json.loads(sidecars[0].read_text())
    assert meta["PowerLineFrequency"] == 60.0
    assert "CMS/DRL" in meta["EEGReference"]
    assert meta["EEGGround"].startswith("DRL")
    assert meta["Manufacturer"] == "Neurosity"

    # BIDS scaffolding mne-bids emits.
    assert list(tmp_path.rglob("*_channels.tsv"))
    assert (tmp_path / "dataset_description.json").exists()


def test_roundtrip_read(tmp_path):
    from mne_bids import read_raw_bids

    data, ch, sf = simulate_crown(seconds=2.0, seed=3)
    bp = write_bids(data, ch, sf, tmp_path, subject="02", session="sim", task="rest")
    raw = read_raw_bids(bp, verbose="ERROR")
    assert len(raw.ch_names) == 8
    assert raw.info["sfreq"] == 256.0


def test_load_csv_roundtrip(tmp_path):
    # Write a CSV shaped (n_samples, n_channels) with a header, then load it.
    data, ch, sf = simulate_crown(seconds=1.0, seed=4)
    micro = (data * 1e6).T  # volts → µV, transpose to (samples, channels)
    csv_path = tmp_path / "rec.csv"
    lines = [",".join(ch)]
    for row in micro:
        lines.append(",".join(f"{v:.4f}" for v in row))
    csv_path.write_text("\n".join(lines))

    loaded, names, sfreq = load_csv(csv_path)
    assert names == ch
    assert loaded.shape == data.shape
    # µV→V round trip within float tolerance.
    assert np.allclose(loaded, data, atol=1e-9)
