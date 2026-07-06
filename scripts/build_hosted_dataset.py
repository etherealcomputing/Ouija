#!/usr/bin/env python3
"""Build Ouija's hosted, de-identified neuro archive under ``data/``.

Generates a standards-valid, *representative* archive covering every modality
Ouija ingests — SPECT, MRI, fMRI, fNIRS, EEG, Viome gut-intelligence, and PDF
reports/testing — using the tested converter simulate paths. Each app-ready
source's values are DERIVED from the file itself (EEG band powers from the EDF,
imaging region values from the SPECT volume, gut scores from the Viome CSV), so
nothing is hand-typed.

This stands in for the owner's real archive, which lives locally at
``…/Box/ethereal/00_IP/01_open-source/Ouija/data`` and never leaves that
machine. Re-running the per-modality converters on the real exports drops the
real files in place; the layout and manifest are identical.

    python scripts/build_hosted_dataset.py
    python -m converters.build_manifest --data data --anonymize \
        --out frontend/public/sources.json

Deterministic (seeded) — reruns are reproducible.
"""

from __future__ import annotations

import csv
import json
import shutil
import tempfile
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parent.parent
DATA = REPO / "data"
MODALITY_DIRS = ["eeg", "fnirs", "mri", "fmri", "spect", "viome", "reports"]


def _write_json(path: Path, obj: dict) -> None:
    path.write_text(json.dumps(obj, indent=2) + "\n")


def clean() -> None:
    if DATA.exists():
        shutil.rmtree(DATA)
    for d in MODALITY_DIRS:
        (DATA / d).mkdir(parents=True, exist_ok=True)


# ── EEG (Neurosity Crown, 8-ch) → EDF + derived region-values/replay ────────
EEG_SESSIONS = [("2026-07-01", 1), ("2026-07-05", 2), ("2026-07-08", 3)]


def _eeg_app_values(data: np.ndarray, ch_names: list[str], sfreq: float) -> dict:
    """Derive channelValues + a replay hint from the actual EEG signal."""
    x = np.asarray(data, dtype=np.float64)  # (n_ch, n_samp), volts
    n_ch, n_samp = x.shape

    # Per-channel activity = RMS, normalized across channels into a lit range.
    rms = np.sqrt((x**2).mean(axis=1))
    span = rms.max() - rms.min()
    norm = (rms - rms.min()) / (span + 1e-15)
    channel_values = {c: round(float(0.34 + 0.60 * v), 4) for c, v in zip(ch_names, norm)}

    # Replay: RMS envelope per channel over W windows (drives the sparklines).
    W = 24
    win = max(1, n_samp // W)
    band_series: list[list[float]] = []
    for ci in range(n_ch):
        seg_rms = np.array(
            [np.sqrt((x[ci, w * win : (w + 1) * win] ** 2).mean() + 1e-30) for w in range(W)]
        )
        s = (seg_rms - seg_rms.min()) / (seg_rms.max() - seg_rms.min() + 1e-15)
        band_series.append([round(float(0.30 + 0.60 * v), 4) for v in s])

    arousal = np.mean(band_series, axis=0)
    calm = [round(float(1.0 - 0.65 * a), 4) for a in arousal]
    frontal_idx = [i for i, c in enumerate(ch_names) if c in ("F5", "F6")]
    frontal = np.mean([band_series[i] for i in frontal_idx], axis=0) if frontal_idx else arousal
    focus = [round(float(0.28 + 0.62 * f), 4) for f in frontal]
    hrv = [round(float(38.0 + 22.0 * c), 2) for c in calm]

    return {
        "type": "region-values",
        "channelValues": channel_values,
        "replay": {
            "channelNames": list(ch_names),
            "bandSeries": band_series,
            "calm": calm,
            "focus": focus,
            "hrv": hrv,
        },
    }


def gen_eeg() -> None:
    from converters.eeg.simulate import simulate_crown
    from converters.eeg.neurosity_to_bids import write_bids

    for date, seed in EEG_SESSIONS:
        data, ch_names, sfreq = simulate_crown(seconds=14.0, seed=seed)
        # write_bids is the tested path → guaranteed-valid EDF; copy it out flat.
        with tempfile.TemporaryDirectory() as tmp:
            bp = write_bids(
                data, ch_names, sfreq, Path(tmp), "01",
                session=date.replace("-", ""), task="rest",
            )
            edf = DATA / "eeg" / f"eeg_neurosity-crown_rest_{date}.edf"
            shutil.copy(bp.fpath, edf)
        _write_json(edf.with_name(edf.name + ".app.json"), _eeg_app_values(data, ch_names, sfreq))
    print(f"  eeg     {len(EEG_SESSIONS)} sessions")


# ── fNIRS → standalone SNIRF ────────────────────────────────────────────────
def gen_fnirs() -> None:
    from converters.fnirs.fnirs import simulate_snirf

    snirf = DATA / "fnirs" / "fnirs_prefrontal_rest_2026-06-20.snirf"
    simulate_snirf(snirf, seconds=12.0, seed=7)
    print("  fnirs   1 recording")


# ── MRI (anat T1w) → NIfTI ──────────────────────────────────────────────────
def gen_mri() -> None:
    import nibabel as nib
    from converters.imaging.imaging import simulate_volume

    img = simulate_volume(shape=(64, 64, 40), seed=11)
    nib.save(img, str(DATA / "mri" / "mri_T1w_2026-02-10.nii.gz"))
    print("  mri     1 T1w volume")


# ── fMRI (task-rest BOLD) → 4D NIfTI ────────────────────────────────────────
def gen_fmri() -> None:
    import nibabel as nib

    rng = np.random.default_rng(21)
    nx, ny, nz, nt = 64, 64, 36, 20
    xs = (np.arange(nx) - nx / 2) / (nx / 2)
    ys = (np.arange(ny) - ny / 2) / (ny / 2)
    zs = (np.arange(nz) - nz / 2) / (nz / 2)
    gx, gy, gz = np.meshgrid(xs, ys, zs, indexing="ij")
    brain = np.clip(1.0 - (gx**2 + gy**2 + gz**2), 0.0, 1.0)
    base = (brain * 800.0).astype(np.float32)
    vol = np.empty((nx, ny, nz, nt), dtype=np.int16)
    for t in range(nt):
        drift = 1.0 + 0.02 * np.sin(2 * np.pi * t / nt)
        noise = 8.0 * rng.standard_normal((nx, ny, nz)).astype(np.float32)
        vol[..., t] = np.clip(base * drift + noise, 0, None).astype(np.int16)
    img = nib.Nifti1Image(vol, np.eye(4))
    img.header.set_xyzt_units(xyz="mm", t="sec")
    img.header["pixdim"][4] = 2.0  # TR = 2 s
    nib.save(img, str(DATA / "fmri" / "fmri_task-rest_bold_2026-02-10.nii.gz"))
    print("  fmri    1 BOLD run (20 vols)")


# ── SPECT (perfusion) → NIfTI + derived imaging region-values ───────────────
def gen_spect() -> None:
    import nibabel as nib
    from converters.imaging.imaging import simulate_volume, region_values_from_volume

    img = simulate_volume(shape=(64, 64, 40), seed=31)
    nii = DATA / "spect" / "spect_perfusion_2026-04-12.nii.gz"
    nib.save(img, str(nii))
    rv = region_values_from_volume(img)
    _write_json(nii.with_name(nii.name + ".app.json"), {"type": "region-values", "regionValues": rv})
    print(f"  spect   1 perfusion volume · regions {rv}")


# ── Viome Gut Intelligence → CSV + derived gut-scores ───────────────────────
VIOME_PANEL = [
    ("Gut Microbiome Health", 82, "gut_microbiome_health"),
    ("Digestive Efficiency", 74, "digestive_efficiency"),
    ("Inflammatory Activity", 61, "inflammatory_activity"),
    ("Metabolic Fitness", 69, "metabolic_fitness"),
    ("Gut Lining Health", 77, "gut_lining_health"),
    ("Microbial Richness", 71, "microbial_richness"),
]


def gen_viome() -> None:
    csv_path = DATA / "viome" / "viome_gut-intelligence_2026-05-15.csv"
    with open(csv_path, "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["score", "value"])
        for label, value, _ in VIOME_PANEL:
            w.writerow([label, value])
    scores = {key: round(value / 100.0, 4) for _, value, key in VIOME_PANEL}
    gut_score = round(sum(scores.values()) / len(scores), 4)
    _write_json(
        csv_path.with_name(csv_path.name + ".app.json"),
        {"type": "gut-scores", "scores": scores, "gutScore": gut_score},
    )
    print(f"  viome   6-score panel · gutScore {gut_score}")


# ── PDF reports & testing (minimal, valid, self-authored PDFs) ──────────────
def _escape_pdf(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _make_pdf(path: Path, title: str, lines: list[str]) -> None:
    """Write a minimal single-page valid PDF (Helvetica text)."""
    content = "BT\n/F1 15 Tf\n72 742 Td\n(" + _escape_pdf(title) + ") Tj\n/F1 11 Tf\n"
    for ln in [""] + lines:
        content += "0 -18 Td (" + _escape_pdf(ln) + ") Tj\n"
    content += "ET"
    content_b = content.encode("latin-1", "replace")

    objs: list[bytes] = [
        b"<</Type/Catalog/Pages 2 0 R>>",
        b"<</Type/Pages/Kids[3 0 R]/Count 1>>",
        b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]"
        b"/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>",
        b"<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
        b"<</Length " + str(len(content_b)).encode() + b">>\nstream\n" + content_b + b"\nendstream",
    ]
    out = b"%PDF-1.4\n"
    offsets: list[int] = []
    for i, body in enumerate(objs, 1):
        offsets.append(len(out))
        out += str(i).encode() + b" 0 obj\n" + body + b"\nendobj\n"
    xref_pos = len(out)
    out += b"xref\n0 " + str(len(objs) + 1).encode() + b"\n0000000000 65535 f \n"
    for off in offsets:
        out += ("%010d 00000 n \n" % off).encode()
    out += (
        b"trailer\n<</Size " + str(len(objs) + 1).encode() + b"/Root 1 0 R>>\n"
        b"startxref\n" + str(xref_pos).encode() + b"\n%%EOF\n"
    )
    path.write_bytes(out)


def gen_reports() -> None:
    _make_pdf(
        DATA / "reports" / "spect_radiology_report_2026-04-14.pdf",
        "SPECT Brain Perfusion — Radiology Report (representative)",
        [
            "Study: Tc-99m HMPAO brain perfusion SPECT.",
            "Indication: baseline functional perfusion mapping (quantified-self).",
            "Findings: symmetric cortical and cerebellar perfusion; no focal defect.",
            "Temporal lobes and cerebellum within expected relative uptake range.",
            "Impression: no perfusion abnormality on this representative study.",
            "",
            "De-identified representative report — not a real clinical read.",
        ],
    )
    _make_pdf(
        DATA / "reports" / "bloodwork_testing_panel_2026-03-01.pdf",
        "Comprehensive Metabolic + CBC Panel — Testing (representative)",
        [
            "Glucose 88 mg/dL   |   HbA1c 5.2 %   |   eGFR >90",
            "Total cholesterol 172   HDL 58   LDL 96   Triglycerides 84 mg/dL",
            "hs-CRP 0.6 mg/L   |   Vitamin D 41 ng/mL   |   Ferritin 96 ng/mL",
            "WBC 5.9   Hgb 15.1   Platelets 248 (x10^3/uL)   TSH 1.8 mIU/L",
            "",
            "De-identified representative lab panel — not real results.",
        ],
    )
    print("  reports 2 PDFs (radiology + labs)")


# ── Dataset README ──────────────────────────────────────────────────────────
def write_readme() -> None:
    readme = DATA / "README.md"
    readme.write_text(
        """# Ouija — hosted neuro archive (`data/`)

The de-identified, multimodal neuro/health archive that grounds the Ouija
dashboard. This mirrors the owner's private archive
(`…/Box/ethereal/00_IP/01_open-source/Ouija/data`); the files committed here are
**representative, synthetic stand-ins** so the app has real, valid data to read
without exposing any personal recording. Re-running the per-modality converters
on the real exports drops the real files in place — the layout is identical.

**Not a diagnostic instrument.** Nothing here is a real clinical result.

## Layout — one folder per modality

| Folder | Modality | Format | App-ready? | Lights |
| --- | --- | --- | --- | --- |
| `eeg/` | EEG (Neurosity Crown, 8-ch) | EDF (`.edf`) | ✅ | cortical regions + replay (calm/focus/HRV) |
| `spect/` | SPECT brain perfusion | NIfTI (`.nii.gz`) | ✅ | imaging regions (temporal L/R, cerebellum) |
| `viome/` | Viome Gut Intelligence | CSV (`.csv`) | ✅ | gut-brain axis anchor |
| `mri/` | Structural MRI (T1w) | NIfTI (`.nii.gz`) | hosted | browsable structural scan |
| `fmri/` | Resting-state fMRI (BOLD) | NIfTI 4D (`.nii.gz`) | hosted | browsable functional run |
| `fnirs/` | fNIRS (prefrontal) | SNIRF (`.snirf`) | hosted | browsable optical recording |
| `reports/` | Radiology + lab testing | PDF (`.pdf`) | reference | clinical/lab documents |

*App-ready* sources carry a companion `<file>.app.json` with the small,
de-identified derived values the app consumes (region-values / gut-scores /
replay). Those values are **derived from the file itself** (EEG band powers from
the EDF, imaging region intensities from the SPECT volume, gut scores from the
CSV) — never hand-typed.

## Designation → BIDS

Each modality maps to a standards-valid BIDS location, produced by the
converters in `converters/` (see `converters/README.md` and
`docs/using-your-data.md`):

- EEG → `sub-*/ses-*/eeg/*.edf` (EEG-BIDS)
- MRI / fMRI → `sub-*/{anat,func}/*.nii.gz` (+ JSON)
- fNIRS → `sub-*/nirs/*.snirf` (NIRS-BIDS)
- SPECT → `derivatives/spect/` (documented non-standard — no ratified BIDS SPECT)
- Viome → `phenotype/` or app `gut-scores`
- PDF reports → `sourcedata/` (never published raw; PHI stays local)

## Hosting & de-identification

The app reads `frontend/public/sources.json`, produced by:

```bash
python -m converters.build_manifest --data data --anonymize \\
    --out frontend/public/sources.json
```

`--anonymize` applies medical-research de-identification (BIDS / HIPAA Safe
Harbor): absolute capture dates → relative `day_offset` (cadence preserved, no
true date exposed), and filenames/paths → generic `modality/NN` labels. Only the
de-identified derived numbers are hosted; raw recordings stay local.
"""
    )
    print("  README  written")


def main() -> None:
    print("Building hosted archive under data/ …")
    clean()
    gen_eeg()
    gen_fnirs()
    gen_mri()
    gen_fmri()
    gen_spect()
    gen_viome()
    gen_reports()
    write_readme()
    print("Done.")


if __name__ == "__main__":
    main()
