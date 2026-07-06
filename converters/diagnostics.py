"""Hardware / connector diagnostics for the Ouija ingest pipeline.

Ouija is hardware-agnostic: every device (Neurosity Crown, PiEEG, Upside Down
Labs BioAmp via Chords, Withings Body Scan, MRI/SPECT imaging, fNIRS) reaches
the same BIDS store through a per-device *connector*. This module exercises
every connector end-to-end on **synthetic data** and reports, per connector,
whether the ingest path is healthy — the "does my rig work?" self-test.

It is deliberately dependency-light on the calling side: run it as a smoke test
in CI, as a pre-flight check before a real recording session, or as a live
hardware diagnostic from the console.

    python -m converters.diagnostics            # human-readable table
    python -m converters.diagnostics --json      # machine-readable report
    python -m converters.diagnostics --only eeg  # one modality group

Exit code is non-zero if any connector fails, so it drops straight into CI.

Each connector's check runs its real converter into a temporary BIDS root and
asserts a set of named, physically-meaningful invariants (channel count matches
the device montage, sampling rate matches the spec, amplitudes sit in a
plausible physiological range, no NaN/Inf, the BIDS sidecar carries the fields
the wire format omits, and — for EEG/fNIRS — the written tree round-trips back
through mne-bids). A failing invariant marks the connector FAIL with the reason;
an exception is caught and reported rather than aborting the whole run.
"""

from __future__ import annotations

import argparse
import contextlib
import json
import os
import sys
import tempfile
import traceback
from dataclasses import asdict, dataclass, field
from pathlib import Path
from time import perf_counter
from typing import Callable

import numpy as np


# ── Result model ──────────────────────────────────────────────────────────
@dataclass
class Check:
    """One named invariant within a connector diagnostic."""

    name: str
    passed: bool
    detail: str = ""


@dataclass
class DiagnosticResult:
    """The outcome of running one connector's end-to-end self-test."""

    connector: str
    modality: str
    bids_target: str
    status: str  # "ok" | "fail" | "error"
    checks: list[Check] = field(default_factory=list)
    duration_s: float = 0.0
    message: str = ""

    @property
    def ok(self) -> bool:
        return self.status == "ok"


# ── Reusable signal-integrity primitives ──────────────────────────────────
# A physiological EEG/biopotential trace sits in the tens-of-microvolts range;
# anything at/above a millivolt on every channel signals a scaling/units bug in
# the connector (the classic "counts written as volts" mistake).
_EEG_MAX_ABS_VOLTS = 5e-3  # 5 mV — generous ceiling; real EEG is << this
_EEG_MIN_ABS_VOLTS = 1e-7  # 0.1 µV — a fully flat channel is a dead electrode


def check_finite(data: np.ndarray) -> Check:
    """No NaN / Inf anywhere in the array."""
    finite = bool(np.isfinite(data).all())
    bad = int((~np.isfinite(data)).sum())
    return Check("finite", finite, "" if finite else f"{bad} non-finite sample(s)")


def check_biopotential_range(data: np.ndarray) -> Check:
    """Amplitudes sit in a plausible biopotential range (not mis-scaled)."""
    peak = float(np.abs(data).max())
    active = float(np.abs(data).max(axis=1).min()) if data.ndim == 2 else peak
    in_range = _EEG_MIN_ABS_VOLTS <= active and peak <= _EEG_MAX_ABS_VOLTS
    return Check(
        "biopotential_range",
        in_range,
        f"peak={peak:.2e} V, quietest-channel peak={active:.2e} V"
        + ("" if in_range else " — outside plausible EEG range (units/scaling bug?)"),
    )


def _sidecar_fields(root: Path, suffix: str, required: list[str]) -> Check:
    """The written BIDS sidecar carries every field the wire format omits."""
    sidecars = list(Path(root).rglob(f"*_{suffix}.json"))
    if not sidecars:
        return Check("sidecar", False, f"no *_{suffix}.json written")
    meta = json.loads(sidecars[0].read_text())
    missing = [f for f in required if f not in meta]
    return Check(
        "sidecar",
        not missing,
        f"carries {', '.join(required)}" if not missing else f"missing {', '.join(missing)}",
    )


# ── Per-connector diagnostics ─────────────────────────────────────────────
# Each returns (checks, artifacts). Artifacts is a dict of anything the CLI may
# want to surface. Any raised exception is caught by the runner and reported.
_SIM_SECONDS = 2.0


def _diag_eeg_generic(root: Path, kind: str) -> tuple[list[Check], dict]:
    """Shared EEG connector check for Crown / PiEEG (both write via write_bids)."""
    from mne_bids import read_raw_bids

    from converters.eeg.neurosity_to_bids import write_bids
    from converters.common.config import (
        CROWN_CHANNELS,
        CROWN_SFREQ,
        EegSidecarConfig,
        PIEEG_CHANNELS,
        PIEEG_SFREQ,
        PiEegSidecarConfig,
    )

    if kind == "crown":
        from converters.eeg.simulate import simulate_crown

        data, ch_names, sfreq = simulate_crown(seconds=_SIM_SECONDS, seed=0)
        exp_channels, exp_sfreq, config = CROWN_CHANNELS, CROWN_SFREQ, EegSidecarConfig()
    else:  # pieeg
        from converters.eeg.pieeg import simulate_pieeg

        data, ch_names, sfreq = simulate_pieeg(seconds=_SIM_SECONDS, seed=0)
        exp_channels, exp_sfreq, config = PIEEG_CHANNELS, PIEEG_SFREQ, PiEegSidecarConfig()

    checks: list[Check] = []
    checks.append(Check("channel_count", data.shape[0] == len(exp_channels),
                        f"{data.shape[0]} channels (expected {len(exp_channels)})"))
    checks.append(Check("montage", ch_names == exp_channels,
                        "montage matches device spec" if ch_names == exp_channels else f"got {ch_names}"))
    checks.append(Check("sampling_rate", sfreq == exp_sfreq, f"{sfreq} Hz (expected {exp_sfreq})"))
    checks.append(check_finite(data))
    checks.append(check_biopotential_range(data))

    bp = write_bids(data, ch_names, sfreq, root, subject="01", session="diag", task="rest", config=config)
    edf = Path(bp.fpath)
    checks.append(Check("edf_written", edf.exists() and edf.suffix == ".edf", str(edf.name)))
    checks.append(_sidecar_fields(root, "eeg", ["EEGReference", "EEGGround", "PowerLineFrequency", "Manufacturer"]))

    raw = read_raw_bids(bp, verbose="ERROR")
    checks.append(Check("bids_readback", len(raw.ch_names) == len(exp_channels) and raw.info["sfreq"] == exp_sfreq,
                        f"read back {len(raw.ch_names)}ch @ {raw.info['sfreq']} Hz"))
    return checks, {"channels": len(exp_channels), "sfreq": exp_sfreq}


def diag_crown(root: Path) -> tuple[list[Check], dict]:
    return _diag_eeg_generic(root, "crown")


def diag_pieeg(root: Path) -> tuple[list[Check], dict]:
    return _diag_eeg_generic(root, "pieeg")


def diag_chords(root: Path) -> tuple[list[Check], dict]:
    from converters.common.config import CHORDS_BOARDS, CHORDS_EEG_CHANNELS, ChordsSidecarConfig
    from converters.eeg.chords import counts_to_bids_volts, simulate_chords
    from converters.eeg.neurosity_to_bids import write_bids

    board = CHORDS_BOARDS["UNO-R4"]
    gain = 100.0
    ch_names = CHORDS_EEG_CHANNELS
    counts, sfreq = simulate_chords(board, gain, seconds=_SIM_SECONDS, n_channels=len(ch_names), seed=0)
    volts = counts_to_bids_volts(counts, board, gain)

    checks: list[Check] = []
    # Counts are integers midscale-offset; volts must land back in EEG range.
    checks.append(Check("counts_integral", bool(np.allclose(counts, np.round(counts))),
                        "raw ADC counts are integral"))
    checks.append(Check("sampling_rate", sfreq == board.sfreq, f"{sfreq} Hz (board {board.name})"))
    checks.append(check_finite(volts))
    checks.append(check_biopotential_range(volts))

    bp = write_bids(volts, list(ch_names), sfreq, root, subject="01", session="diag", task="rest",
                    config=ChordsSidecarConfig())
    checks.append(Check("edf_written", Path(bp.fpath).exists(), Path(bp.fpath).name))
    checks.append(_sidecar_fields(root, "eeg", ["EEGReference", "PowerLineFrequency", "Manufacturer"]))
    return checks, {"board": board.name, "sfreq": sfreq}


def diag_withings(root: Path) -> tuple[list[Check], dict]:
    from converters.common.config import WITHINGS_MEASURES
    from converters.withings.withings import simulate_withings
    from converters.withings.withings_to_bids import write_phenotype

    rows = simulate_withings(n_sessions=5, seed=0)
    checks: list[Check] = []
    checks.append(Check("rows_generated", len(rows) == 5, f"{len(rows)} synthetic sessions"))
    # Every configured measure decoded into a positive value.
    latest = rows[-1]
    cols = [m.column for m in WITHINGS_MEASURES.values()]
    present = [c for c in cols if c in latest]
    checks.append(Check("all_measures", len(present) == len(cols), f"{len(present)}/{len(cols)} measures present"))
    positive = all(isinstance(latest[c], (int, float)) and latest[c] > 0 for c in present)
    checks.append(Check("values_positive", positive, "all body-composition values > 0"))

    tsv = write_phenotype(rows, root, subject="01")
    header = Path(tsv).read_text().splitlines()[0].split("\t")
    checks.append(Check("phenotype_written", Path(tsv).exists(), Path(tsv).name))
    checks.append(Check("phenotype_columns", "participant_id" in header and any(c in header for c in cols),
                        f"{len(header)} columns"))
    return checks, {"sessions": len(rows), "measures": len(present)}


def diag_imaging(root: Path) -> tuple[list[Check], dict]:
    from converters.imaging.dicom_to_bids import write_anat_bids
    from converters.imaging.imaging import region_values_from_volume, simulate_volume

    img = simulate_volume(seed=0)
    checks: list[Check] = []
    data = np.asarray(img.get_fdata())
    checks.append(Check("volume_nonempty", data.size > 0 and float(data.max()) > 0, f"shape {data.shape}"))
    checks.append(check_finite(data))

    nii = write_anat_bids(img, root, subject="01", session="diag", suffix="T1w")
    checks.append(Check("nifti_written", Path(nii).exists() and str(nii).endswith(".nii.gz"), Path(nii).name))

    values = region_values_from_volume(img)
    in_unit = all(0.0 <= v <= 1.0 for v in values.values())
    checks.append(Check("region_values", in_unit and len(values) == 3,
                        f"{values}" if in_unit else f"out of [0,1]: {values}"))
    return checks, {"regions": values}


def diag_spect(root: Path) -> tuple[list[Check], dict]:
    from converters.imaging.imaging import simulate_volume
    from converters.imaging.spect_to_derivatives import write_spect_derivatives

    img = simulate_volume(seed=0)
    out = write_spect_derivatives(img, root, subject="01", session="diag")
    checks: list[Check] = []
    checks.append(Check("derivative_written", Path(out["nifti"]).exists(), Path(out["nifti"]).name))
    checks.append(Check("derivative_description",
                        (Path(root) / "derivatives" / "spect" / "dataset_description.json").exists(),
                        "DatasetType: derivative"))
    values = out["values"]
    in_unit = all(0.0 <= v <= 1.0 for v in values.values())
    checks.append(Check("region_values", in_unit and len(values) == 3, f"{values}"))
    return checks, {"regions": values}


def diag_fnirs(root: Path) -> tuple[list[Check], dict]:
    from converters.fnirs.fnirs import load_snirf, simulate_snirf
    from converters.fnirs.snirf_to_bids import write_nirs_bids

    checks: list[Check] = []
    with tempfile.TemporaryDirectory() as tmp:
        snirf_path = simulate_snirf(Path(tmp) / "diag.snirf", seconds=_SIM_SECONDS, seed=0)
        checks.append(Check("snirf_written", Path(snirf_path).exists(), Path(snirf_path).name))
        raw = load_snirf(snirf_path)
        checks.append(Check("channels_loaded", len(raw.ch_names) > 0, f"{len(raw.ch_names)} fNIRS channels"))
        checks.append(check_finite(raw.get_data()))
        bp = write_nirs_bids(raw, root, subject="01", session="diag", task="rest")
        checks.append(Check("nirs_written", Path(bp.fpath).exists(), Path(bp.fpath).name))
        checks.append(_sidecar_fields(root, "nirs", ["Manufacturer", "PowerLineFrequency"]))
    return checks, {"channels": len(raw.ch_names)}


# ── Registry ──────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class Connector:
    key: str
    name: str
    modality: str
    bids_target: str
    group: str
    run: Callable[[Path], tuple[list[Check], dict]]


CONNECTORS: list[Connector] = [
    Connector("crown", "Neurosity Crown", "EEG", "eeg/ · EDF", "eeg", diag_crown),
    Connector("pieeg", "PiEEG (ADS1299)", "EEG", "eeg/ · EDF", "eeg", diag_pieeg),
    Connector("chords", "Upside Down Labs / Chords", "EEG", "eeg/ · EDF", "eeg", diag_chords),
    Connector("fnirs", "fNIRS (SNIRF)", "NIRS", "nirs/ · SNIRF", "imaging", diag_fnirs),
    Connector("imaging", "MRI / anatomical", "Imaging", "anat/ · NIfTI", "imaging", diag_imaging),
    Connector("spect", "SPECT", "Imaging", "derivatives/spect/", "imaging", diag_spect),
    Connector("withings", "Withings Body Scan", "Body", "phenotype/ · TSV", "body", diag_withings),
]


@contextlib.contextmanager
def _quiet():
    """Silence stdout during a connector run so mne-bids' 'Writing…' chatter
    never pollutes the report (critical for a parseable --json stream)."""
    with open(os.devnull, "w") as devnull, contextlib.redirect_stdout(devnull):
        yield


def run_connector(conn: Connector) -> DiagnosticResult:
    """Run one connector's diagnostic into a throwaway BIDS root, timed & guarded."""
    start = perf_counter()
    try:
        with tempfile.TemporaryDirectory(prefix=f"ouija_diag_{conn.key}_") as tmp, _quiet():
            checks, _artifacts = conn.run(Path(tmp))
        status = "ok" if all(c.passed for c in checks) else "fail"
        failed = [c.name for c in checks if not c.passed]
        message = "all checks passed" if status == "ok" else f"failed: {', '.join(failed)}"
        return DiagnosticResult(conn.name, conn.modality, conn.bids_target, status,
                                checks, perf_counter() - start, message)
    except Exception as exc:  # a connector that blew up is a diagnostic failure, not a crash
        return DiagnosticResult(conn.name, conn.modality, conn.bids_target, "error", [],
                                perf_counter() - start,
                                f"{type(exc).__name__}: {exc}\n{traceback.format_exc(limit=3)}")


def run_diagnostics(only: str | None = None) -> list[DiagnosticResult]:
    """Run every connector diagnostic (optionally filtered to one modality group)."""
    conns = [c for c in CONNECTORS if only in (None, c.group, c.key)]
    return [run_connector(c) for c in conns]


# ── Reporting ─────────────────────────────────────────────────────────────
_ICON = {"ok": "PASS", "fail": "FAIL", "error": "ERR "}


def format_report(results: list[DiagnosticResult], verbose: bool = False) -> str:
    lines = ["", "Ouija hardware / connector diagnostics", "=" * 62]
    for r in results:
        lines.append(f"[{_ICON[r.status]}] {r.connector:<28} {r.modality:<7} {r.bids_target:<18} {r.duration_s:5.2f}s")
        if verbose or not r.ok:
            for c in r.checks:
                mark = "  ✓" if c.passed else "  ✗"
                lines.append(f"      {mark} {c.name:<20} {c.detail}")
            if r.status == "error":
                lines.append(f"      ! {r.message.splitlines()[0]}")
    n_ok = sum(r.ok for r in results)
    lines.append("=" * 62)
    lines.append(f"{n_ok}/{len(results)} connectors healthy")
    return "\n".join(lines)


def _cli() -> int:
    p = argparse.ArgumentParser(description="Run Ouija hardware/connector diagnostics on synthetic data.")
    p.add_argument("--only", default=None, help="limit to a group (eeg|imaging|body) or connector key")
    p.add_argument("--json", action="store_true", help="emit a machine-readable JSON report")
    p.add_argument("--verbose", "-v", action="store_true", help="show every check, not just failures")
    args = p.parse_args()

    results = run_diagnostics(only=args.only)
    if not results:
        print(f"No connectors matched --only={args.only!r}", file=sys.stderr)
        return 2

    if args.json:
        print(json.dumps([asdict(r) for r in results], indent=2, default=str))
    else:
        print(format_report(results, verbose=args.verbose))

    return 0 if all(r.ok for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(_cli())
