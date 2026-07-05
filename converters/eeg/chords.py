"""Upside Down Labs Chords data path: synthetic recording + CSV loader.

The BioAmp boards are single-channel analog front-ends with no ADC; the MCU
digitizes them and the Chords firmware/`chordspy` tool records CSV of *raw ADC
counts* (`Counter, Channel1 … ChannelN`) — never microvolts. So counts→volts
needs the per-board {bits, Vref} and the BioAmp {gain}. Gain is unpublished by
UDL and must be supplied as a measured calibration constant.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from converters.common.config import ChordsBoard, chords_counts_to_volts


def simulate_chords(
    board: ChordsBoard,
    gain: float,
    seconds: float = 10.0,
    n_channels: int = 1,
    seed: int = 0,
) -> tuple[np.ndarray, float]:
    """Return (counts, sfreq): raw ADC counts shaped like a Chords CSV.

    EEG-like microvolt signals are generated then *inverted* through the ADC
    model so the output looks exactly like the device's raw-count stream.
    """
    rng = np.random.default_rng(seed)
    n = int(round(seconds * board.sfreq))
    t = np.arange(n) / board.sfreq
    mid = 2 ** (board.bits - 1)
    scale = (2 ** board.bits) * gain / board.vref  # volts → counts
    counts = np.empty((n_channels, n), dtype=np.float64)
    for c in range(n_channels):
        volts = (
            np.sin(2 * np.pi * 10 * t + c) * 14e-6
            + np.sin(2 * np.pi * 20 * t + c * 1.3) * 6e-6
            + rng.standard_normal(n) * 7e-6
        )
        counts[c] = np.round(volts * scale + mid)
    return counts, board.sfreq


def counts_to_bids_volts(counts: np.ndarray, board: ChordsBoard, gain: float) -> np.ndarray:
    """Vectorized counts→volts for a (n_channels, n_samples) array."""
    return chords_counts_to_volts(counts, board.bits, board.vref, gain)


def load_chords_csv(path: Path) -> tuple[np.ndarray, list[str]]:
    """Load a Chords CSV (`Counter, Channel1 … ChannelN` raw counts).

    Returns (counts[n_channels, n_samples], channel_names). The leading Counter
    column is dropped. Convert to volts with `counts_to_bids_volts`.
    """
    from converters.common.csv_io import read_headered_csv

    arr, header = read_headered_csv(path)  # (n_samples, n_cols)
    drop = 1 if header and header[0].lower() in {"counter", "count", "n"} else 0
    ch_names = [h.strip() for h in header[drop:]]
    if not ch_names:
        raise ValueError(f"{path}: no channel columns after dropping the leading '{header[0]}' column")
    counts = arr[:, drop:].T  # → (n_channels, n_samples)
    return counts, ch_names
