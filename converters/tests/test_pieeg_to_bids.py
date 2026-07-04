"""Tests for the PiEEG (ADS1299) → BIDS EDF converter. Synthetic data only."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from converters.common.config import PIEEG_CHANNELS, PiEegSidecarConfig
from converters.eeg.neurosity_to_bids import write_bids
from converters.eeg.pieeg import simulate_pieeg, load_pieeg_csv


def test_simulate_shape():
    data, ch, sf = simulate_pieeg(seconds=2.0, seed=1)
    assert data.shape == (8, 500)  # 250 Hz × 2 s
    assert ch == PIEEG_CHANNELS
    assert sf == 250.0
    assert np.abs(data).max() < 1e-3  # volts, tens of µV


def test_write_bids_injects_pieeg_sidecar(tmp_path):
    data, ch, sf = simulate_pieeg(seconds=3.0, seed=2)
    bp = write_bids(data, ch, sf, tmp_path, subject="01", session="sim", task="rest", config=PiEegSidecarConfig())

    edf = Path(bp.fpath)
    assert edf.exists() and edf.suffix == ".edf"

    sidecars = list(tmp_path.rglob("*_eeg.json"))
    assert sidecars
    meta = json.loads(sidecars[0].read_text())
    assert meta["Manufacturer"] == "PiEEG"
    assert "SRB1" in meta["EEGReference"]
    assert "BIAS" in meta["EEGGround"]
    assert meta["SamplingFrequency"] == 250.0


def test_load_pieeg_csv_with_time_column(tmp_path):
    # PiEEG-server CSV: a leading time column + 8 channel columns in µV.
    data, ch, sf = simulate_pieeg(seconds=1.0, seed=4)
    micro = (data * 1e6).T  # volts → µV, (samples, channels)
    csv_path = tmp_path / "pieeg_rec.csv"
    lines = ["time," + ",".join(f"chan_{i+1}" for i in range(8))]
    for k, row in enumerate(micro):
        lines.append(f"{k / 250.0:.5f}," + ",".join(f"{v:.4f}" for v in row))
    csv_path.write_text("\n".join(lines))

    loaded, names, sfreq = load_pieeg_csv(csv_path)
    assert loaded.shape == data.shape  # time column dropped
    assert names == PIEEG_CHANNELS  # 8 channels → montage labels
    assert np.allclose(loaded, data, atol=1e-9)
