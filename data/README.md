# Ouija — hosted neuro archive (`data/`)

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
python -m converters.build_manifest --data data --anonymize \
    --out frontend/public/sources.json
```

`--anonymize` applies medical-research de-identification (BIDS / HIPAA Safe
Harbor): absolute capture dates → relative `day_offset` (cadence preserved, no
true date exposed), and filenames/paths → generic `modality/NN` labels. Only the
de-identified derived numbers are hosted; raw recordings stay local.
