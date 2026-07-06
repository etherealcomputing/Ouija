"""Classify + route the user's archived source files.

Given a folder of messy personal exports (EEG recordings, imaging scans, Withings
panels, Viome reports, …), this module decides for each file: which *modality* it
belongs to, its *format*, whether it is *raw* or already *derived*, which converter
(if any) turns it into BIDS, and the *app-facing* artifact it can produce (the
region-values / score JSON the frontend ingests to light the brain).

It is the backbone of both the source manifest (build_manifest.py) and the
frontend's toggleable Source Panel — it runs wherever the data lives (e.g. the
user's own machine), so no personal bytes need to reach a build environment.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

Modality = str  # "eeg" | "cardiac" | "imaging" | "body" | "gut" | "unknown"
Kind = str      # "raw" | "derived" | "report" | "unknown"


@dataclass(frozen=True)
class SourceClass:
    """The classification of one source file."""

    modality: Modality
    fmt: str                      # human format label, e.g. "EDF", "DICOM", "Viome JSON"
    kind: Kind
    converter: str | None         # `python -m converters.<...>` module, or None
    app_output: str | None        # "region-values" | "gut-scores" | "phenotype" | None
    note: str = ""


# ── Extension / suffix routing ─────────────────────────────────────────────
# Keys are lowercase suffixes (handles the compound .nii.gz). Filename heuristics
# (below) refine the ambiguous ones (.csv / .json can be several modalities).
_BY_SUFFIX: dict[str, SourceClass] = {
    ".edf": SourceClass("eeg", "EDF", "derived", None, "region-values", "BIDS-ready EEG"),
    ".bdf": SourceClass("eeg", "BDF", "derived", None, "region-values", "24-bit EEG"),
    ".fif": SourceClass("eeg", "FIF (MNE)", "derived", None, "region-values", "MNE raw"),
    ".set": SourceClass("eeg", "EEGLAB", "raw", None, "region-values", "EEGLAB set"),
    ".vhdr": SourceClass("eeg", "BrainVision", "raw", None, "region-values", "BrainVision header"),
    ".snirf": SourceClass("imaging", "SNIRF (fNIRS)", "raw", "converters.fnirs.snirf_to_bids", "region-values", "fNIRS → BIDS nirs/"),
    ".dcm": SourceClass("imaging", "DICOM", "raw", "converters.imaging.dicom_to_bids", "region-values", "needs dcm2niix"),
    ".nii": SourceClass("imaging", "NIfTI", "derived", "converters.imaging.dicom_to_bids", "region-values", "reconstructed volume"),
    ".nii.gz": SourceClass("imaging", "NIfTI (gz)", "derived", "converters.imaging.dicom_to_bids", "region-values", "reconstructed volume"),
    ".pdf": SourceClass("unknown", "PDF report", "report", None, None, "clinical/lab report — parse by hand"),
}

# ── Filename heuristics for ambiguous containers (.csv/.json/.tsv/.txt) ─────
# (substring in the lowercased name) → classification. First match wins.
_BY_NAME_HINT: list[tuple[str, SourceClass]] = [
    ("viome", SourceClass("gut", "Viome report", "report", None, "gut-scores", "Viome Gut Intelligence")),
    ("gut", SourceClass("gut", "Gut report", "report", None, "gut-scores", "gut-intelligence scores")),
    ("withings", SourceClass("body", "Withings export", "raw", "converters.withings.withings_to_bids", "phenotype", "Body Scan panel")),
    ("bodyscan", SourceClass("body", "Withings Body Scan", "raw", "converters.withings.withings_to_bids", "phenotype", "Body Scan panel")),
    ("getmeas", SourceClass("body", "Withings getmeas", "raw", "converters.withings.withings_to_bids", "phenotype", "Withings measures")),
    ("neurosity", SourceClass("eeg", "Neurosity CSV", "raw", "converters.eeg.neurosity_to_bids", "region-values", "Crown 8-ch")),
    ("crown", SourceClass("eeg", "Neurosity Crown CSV", "raw", "converters.eeg.neurosity_to_bids", "region-values", "Crown 8-ch")),
    ("pieeg", SourceClass("eeg", "PiEEG CSV", "raw", "converters.eeg.pieeg_to_bids", "region-values", "PiEEG 8-ch")),
    ("chords", SourceClass("eeg", "Chords/UDL CSV", "raw", "converters.eeg.chords_to_bids", "region-values", "UDL BioAmp (needs --gain)")),
    ("udl", SourceClass("eeg", "UDL CSV", "raw", "converters.eeg.chords_to_bids", "region-values", "UDL BioAmp (needs --gain)")),
    ("hrv", SourceClass("cardiac", "HRV export", "raw", None, None, "heart-rate variability")),
    ("ecg", SourceClass("cardiac", "ECG export", "raw", None, None, "ECG trace")),
    ("eeg", SourceClass("eeg", "EEG CSV", "raw", "converters.eeg.neurosity_to_bids", "region-values", "generic EEG CSV")),
    ("region", SourceClass("imaging", "region-values", "derived", None, "region-values", "app-ready region values")),
    ("spect", SourceClass("imaging", "SPECT", "raw", "converters.imaging.spect_to_derivatives", "region-values", "SPECT → derivatives/")),
]

_UNKNOWN = SourceClass("unknown", "Unknown", "unknown", None, None, "unrecognized — classify manually")


def classify(path: Path) -> SourceClass:
    """Classify a single source file by suffix, then filename heuristics."""
    name = path.name.lower()
    # Compound suffix first (.nii.gz), then simple suffix.
    for suf in (".nii.gz",):
        if name.endswith(suf):
            return _BY_SUFFIX[suf]
    suffix = path.suffix.lower()

    # Ambiguous containers → decide by filename hint.
    if suffix in {".csv", ".json", ".tsv", ".txt"}:
        for hint, cls in _BY_NAME_HINT:
            if hint in name:
                return cls
        # Default a bare CSV/JSON to EEG values (the most common Ouija upload),
        # but mark it low-confidence so the manifest flags it for review.
        return SourceClass("unknown", f"{suffix[1:].upper()} (ambiguous)", "unknown", None, None, "ambiguous container — set modality manually")

    return _BY_SUFFIX.get(suffix, _UNKNOWN)


@dataclass
class SourceEntry:
    """One itemized source, ready to serialize into the manifest (v2)."""

    id: str
    label: str
    rel_path: str
    modality: Modality
    fmt: str
    kind: Kind
    size_bytes: int
    converter: str | None
    app_output: str | None
    status: str                       # "raw" | "convertible" | "app-ready" | "review"
    # ── v2 additive fields ──────────────────────────────────────────────
    date: str | None = None           # ISO capture date parsed from the filename, or None
    session: str | None = None        # cadence tag, when inferable
    quality: float | None = None      # 0–1 protocol quality flag, when known
    provenance: list[str] = field(default_factory=list)  # ids of raw parent sources
    # Small app-facing payload inlined for app-ready sources (region-values /
    # gut-scores / phenotype) so the static app grounds with zero fetch. None
    # until a converter has produced the source's app-facing JSON.
    app_values: dict | None = None
    app_artifact: str | None = None   # OR a path under public/ to fetch instead of inlining
    note: str = ""
    tags: list[str] = field(default_factory=list)


# ── Date parsing from filenames ────────────────────────────────────────────
_DATE_YMD = re.compile(r"(?<!\d)(20\d{2})[-_]?(\d{2})[-_]?(\d{2})(?!\d)")
_DATE_HALF = re.compile(r"(?<!\d)(20\d{2})[-_]?[Hh]([12])(?!\d)")


def parse_date(name: str) -> str | None:
    """Best-effort ISO capture date from a filename. None when unstamped.

    Handles ``…_20260705…`` / ``…2026-07-05…`` (YYYY-MM-DD) and ``…2026H1…``
    (calendar half → first day of that half). Invalid month/day → None.
    """
    m = _DATE_YMD.search(name)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"
    h = _DATE_HALF.search(name)
    if h:
        y, half = int(h.group(1)), int(h.group(2))
        return f"{y:04d}-01-01" if half == 1 else f"{y:04d}-07-01"
    return None


def _status_for(cls: SourceClass) -> str:
    if cls.modality == "unknown":
        return "review"
    if cls.app_output and cls.kind in {"derived", "report"} and cls.converter is None:
        return "app-ready"
    if cls.converter:
        return "convertible"
    return "review"


def _load_sidecar_values(path: Path) -> dict | None:
    """Inline app-facing values from a companion ``<file>.app.json`` if present.

    Converters can drop a small ``…​.app.json`` (region-values / gut-scores /
    phenotype, in the exact shapes the frontend consumes) next to the source; the
    manifest inlines it so the static app grounds with no fetch. Absent → None.
    """
    import json

    sidecar = path.with_name(path.name + ".app.json")
    if sidecar.exists():
        try:
            return json.loads(sidecar.read_text())
        except (ValueError, OSError):
            return None
    return None


def index_file(root: Path, path: Path) -> SourceEntry:
    """Build a manifest entry for one file relative to ``root``."""
    cls = classify(path)
    rel = path.relative_to(root).as_posix()
    stem = rel.replace("/", "-").replace(" ", "-")
    app_values = _load_sidecar_values(path)
    # A source is app-ready if a converter already produced its app-facing values.
    status = "app-ready" if app_values is not None else _status_for(cls)
    return SourceEntry(
        id=stem,
        label=path.name,
        rel_path=rel,
        modality=cls.modality,
        fmt=cls.fmt,
        kind=cls.kind,
        size_bytes=path.stat().st_size if path.exists() else 0,
        converter=cls.converter,
        app_output=cls.app_output,
        status=status,
        date=parse_date(path.name),
        app_values=app_values,
        note=cls.note,
        tags=[cls.modality] if cls.modality != "unknown" else ["review"],
    )
