"""Tests for the Upside Down Labs / Chords → BIDS EDF converter. Synthetic only."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from converters.common.config import CHORDS_BOARDS, ChordsSidecarConfig, chords_counts_to_volts
from converters.eeg.chords import simulate_chords, load_chords_csv, counts_to_bids_volts
from converters.eeg.neurosity_to_bids import write_bids


def test_counts_to_volts_formula():
    # 10-bit, Vref 5 V, gain 1: midscale (512) → 0 V; full-scale offset is linear.
    assert chords_counts_to_volts(512, 10, 5.0, 1.0) == 0.0
    assert chords_counts_to_volts(1023, 10, 5.0, 1.0) == ((1023 - 512) / 1024) * 5.0
    # Gain divides the result.
    assert chords_counts_to_volts(1023, 10, 5.0, 100.0) == ((1023 - 512) / 1024) * 5.0 / 100.0


def test_simulate_counts_roundtrip_to_eeg_scale():
    board = CHORDS_BOARDS["UNO-R4"]
    gain = 100.0
    counts, sf = simulate_chords(board, gain, seconds=2.0, n_channels=1, seed=1)
    assert counts.shape == (1, 1000)  # 500 Hz × 2 s
    assert sf == 500.0
    # Counts hover around midscale for a 14-bit ADC.
    assert abs(counts.mean() - 2 ** 13) < 2 ** 13
    volts = counts_to_bids_volts(counts, board, gain)
    assert np.abs(volts).max() < 1e-3  # tens of µV EEG


def test_load_chords_csv(tmp_path):
    csv_path = tmp_path / "ChordsPy_test.csv"
    csv_path.write_text("Counter,Channel1\n0,500\n1,520\n2,480\n")
    counts, names = load_chords_csv(csv_path)
    assert counts.shape == (1, 3)
    assert names == ["Channel1"]
    assert list(counts[0]) == [500.0, 520.0, 480.0]


def test_write_bids_injects_udl_sidecar(tmp_path):
    board = CHORDS_BOARDS["UNO-R4"]
    counts, sf = simulate_chords(board, 100.0, seconds=3.0, n_channels=1, seed=2)
    volts = counts_to_bids_volts(counts, board, 100.0)
    bp = write_bids(volts, ["Fp1"], sf, tmp_path, subject="01", session="sim", task="rest", config=ChordsSidecarConfig())

    assert Path(bp.fpath).suffix == ".edf"
    meta = json.loads(next(iter(tmp_path.rglob("*_eeg.json"))).read_text())
    assert meta["Manufacturer"] == "Upside Down Labs"
    assert "mastoid" in meta["EEGReference"]
    assert meta["SamplingFrequency"] == 500.0
