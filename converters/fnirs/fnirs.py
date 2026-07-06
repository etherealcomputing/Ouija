"""fNIRS data path: synthesize a valid SNIRF file, or load a real one via MNE.

BIDS stores fNIRS as **SNIRF** (`.snirf`) in the `nirs/` datatype — not NIfTI.
The SNIRF file is the raw artifact; :func:`load_snirf` reads it with MNE and the
BIDS writer copies it into the tree. :func:`simulate_snirf` builds a small,
fully SNIRF-valid continuous-wave file so the converter runs and is tested with
no hardware and no downloaded fixture.
"""

from __future__ import annotations

from pathlib import Path

from converters.common.config import FNIRS_SFREQ, FNIRS_WAVELENGTHS

# A tiny paired probe: N co-located source/detector pairs, each measured at both
# wavelengths. Positions are on a small grid (mm). Deterministic, self-contained.
_SRC_POS = [[0.0, 0.0, 0.0], [30.0, 0.0, 0.0], [60.0, 0.0, 0.0], [90.0, 0.0, 0.0]]
_DET_POS = [[0.0, 30.0, 0.0], [30.0, 30.0, 0.0], [60.0, 30.0, 0.0], [90.0, 30.0, 0.0]]


def simulate_snirf(
    path: Path,
    seconds: float = 8.0,
    seed: int = 0,
    n_pairs: int = 4,
    sfreq: float = FNIRS_SFREQ,
) -> Path:
    """Write a synthetic, SNIRF-valid CW-fNIRS file to ``path``. Returns ``path``.

    ``n_pairs`` co-located source/detector pairs × the two configured wavelengths
    → ``2 * n_pairs`` channels. Each channel is a slow drift + fine noise around a
    baseline optical intensity. Deterministic for a given seed.
    """
    import numpy as np
    from snirf import Snirf

    path = Path(path)
    n_pairs = max(1, min(n_pairs, len(_SRC_POS)))
    n_time = int(round(seconds * sfreq))
    rng = np.random.default_rng(seed)
    t = np.arange(n_time) / sfreq

    ml_entries = [(i + 1, i + 1, wi) for i in range(n_pairs) for wi in (1, 2)]
    n_chan = len(ml_entries)
    data_ts = np.empty((n_time, n_chan))
    for c in range(n_chan):
        data_ts[:, c] = 1e-6 * (1.0 + 0.05 * np.sin(2 * np.pi * 0.1 * t + c) + 0.01 * rng.standard_normal(n_time))

    s = Snirf(str(path), "w")
    try:
        s.formatVersion = "1.0"  # required top-level field
        s.nirs.appendGroup()
        nirs = s.nirs[0]

        nirs.metaDataTags.SubjectID = "sub-01"
        nirs.metaDataTags.MeasurementDate = "2026-01-01"
        nirs.metaDataTags.MeasurementTime = "00:00:00"
        nirs.metaDataTags.LengthUnit = "mm"
        nirs.metaDataTags.TimeUnit = "s"
        nirs.metaDataTags.FrequencyUnit = "Hz"

        nirs.probe.wavelengths = np.array(FNIRS_WAVELENGTHS)
        nirs.probe.sourcePos3D = np.array(_SRC_POS[:n_pairs])
        nirs.probe.detectorPos3D = np.array(_DET_POS[:n_pairs])
        nirs.probe.sourceLabels = np.array([f"S{i + 1}" for i in range(n_pairs)])
        nirs.probe.detectorLabels = np.array([f"D{i + 1}" for i in range(n_pairs)])

        nirs.data.appendGroup()
        d = nirs.data[0]
        d.dataTimeSeries = data_ts
        d.time = t
        for (si, di, wi) in ml_entries:
            d.measurementList.appendGroup()
            ml = d.measurementList[-1]
            ml.sourceIndex = si
            ml.detectorIndex = di
            ml.wavelengthIndex = wi
            ml.dataType = 1  # continuous-wave amplitude
            ml.dataTypeIndex = 1

        s.save()
    finally:
        s.close()
    return path


def load_snirf(path: Path):
    """Read a ``.snirf`` file into an MNE Raw (channel type fnirs_cw_amplitude).

    Raises a clear :class:`FileNotFoundError` if the path is missing rather than
    surfacing a deeper HDF5/MNE error.
    """
    import mne

    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"SNIRF file not found: {p}")
    return mne.io.read_raw_snirf(str(p), verbose="ERROR")
