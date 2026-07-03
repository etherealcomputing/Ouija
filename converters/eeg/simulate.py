"""Deterministic synthetic Neurosity Crown recording.

Produces data shaped exactly like the real Crown stream (8 channels @ 256 Hz)
so the converter and its tests run with no hardware. This is the Python analog
of the frontend's SimulatedNeurosityAdapter — same montage, same rate.
"""

from __future__ import annotations

import numpy as np

from converters.common.config import CROWN_CHANNELS, CROWN_SFREQ


def simulate_crown(
    seconds: float = 10.0,
    sfreq: float = CROWN_SFREQ,
    seed: int = 0,
) -> tuple[np.ndarray, list[str], float]:
    """Return (data, ch_names, sfreq).

    `data` is shape (n_channels, n_samples) in **volts** (BIDS/MNE expect SI
    units; EEG is on the order of tens of microvolts → 1e-5 V). Each channel is
    a sum of a few oscillations (alpha/beta bands) plus pink-ish noise, with a
    per-channel phase so the traces are visibly distinct.
    """
    rng = np.random.default_rng(seed)
    n = int(round(seconds * sfreq))
    t = np.arange(n) / sfreq
    data = np.empty((len(CROWN_CHANNELS), n), dtype=np.float64)
    for i, _ in enumerate(CROWN_CHANNELS):
        alpha = np.sin(2 * np.pi * 10 * t + i * 0.7) * 12e-6  # ~10 Hz, 12 µV
        beta = np.sin(2 * np.pi * 20 * t + i * 1.3) * 5e-6  # ~20 Hz, 5 µV
        drift = np.sin(2 * np.pi * 0.5 * t + i) * 4e-6
        noise = rng.standard_normal(n) * 6e-6
        data[i] = alpha + beta + drift + noise
    return data, list(CROWN_CHANNELS), float(sfreq)
