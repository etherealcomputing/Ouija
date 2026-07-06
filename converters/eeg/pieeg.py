"""Deterministic synthetic PiEEG recording + PiEEG CSV loader.

PiEEG (pieeg-club, open hardware) is an ADS1299-based EEG/EMG/ECG shield for the
Raspberry Pi: 8 channels (PiEEG) or 16 (PiEEG-16), 24-bit, 250 Hz. Its server
records CSV in microvolts (`time, chan_1 … chan_8`). This module produces data
shaped like that recording so the converter + tests run with no hardware.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from converters.common.config import PIEEG_CHANNELS, PIEEG_SFREQ


def simulate_pieeg(
    seconds: float = 10.0,
    sfreq: float = PIEEG_SFREQ,
    seed: int = 0,
) -> tuple[np.ndarray, list[str], float]:
    """Return (data, ch_names, sfreq). `data` is (n_channels, n_samples) in volts."""
    rng = np.random.default_rng(seed)
    n = int(round(seconds * sfreq))
    t = np.arange(n) / sfreq
    data = np.empty((len(PIEEG_CHANNELS), n), dtype=np.float64)
    for i, _ in enumerate(PIEEG_CHANNELS):
        alpha = np.sin(2 * np.pi * 10 * t + i * 0.7) * 14e-6
        beta = np.sin(2 * np.pi * 20 * t + i * 1.3) * 6e-6
        drift = np.sin(2 * np.pi * 0.5 * t + i) * 5e-6
        noise = rng.standard_normal(n) * 7e-6
        data[i] = alpha + beta + drift + noise
    return data, list(PIEEG_CHANNELS), float(sfreq)


def load_pieeg_csv(path: Path, sfreq: float = PIEEG_SFREQ) -> tuple[np.ndarray, list[str], float]:
    """Load a PiEEG-server CSV (`time, chan_1 … chan_N` in µV).

    A leading time/timestamp column is dropped. Values are µV → converted to
    volts. If the header channel count matches the PiEEG montage, the montage
    labels are used; otherwise the header names are kept.
    """
    from converters.common.csv_io import read_headered_csv

    arr, header = read_headered_csv(path)  # (n_samples, n_cols)
    drop = 1 if header and header[0].lower() in {"time", "t", "timestamp", "n"} else 0
    ch_names = [h.strip() for h in header[drop:]]
    if not ch_names:
        raise ValueError(f"{path}: no channel columns after dropping the leading '{header[0]}' column")
    data = arr[:, drop:].T  # → (n_channels, n_samples)
    if len(ch_names) == len(PIEEG_CHANNELS):
        ch_names = list(PIEEG_CHANNELS)
    return data * 1e-6, ch_names, sfreq
