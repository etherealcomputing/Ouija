# Ouija BIDS Dataset

This is the [BIDS](https://bids.neuroimaging.io/)-organized data root for **Ouija**, a personal,
longitudinal neuro-data archive. See the repository root `README.md` for the project narrative. This is
a personal project of Eros Marcello Iuliano, not a company product.

**Status:** scaffold only (as of 2026-07). No scan or signal data has been committed yet — see `CHANGES`.
The layout below is the *target* structure; `sub-*/ses-*/` directories are added as real recordings are
converted and validated.

## Modalities & formats

| Modality | Format | BIDS location | Notes |
| --- | --- | --- | --- |
| EEG (Neurosity Crown, Upside Down Labs BioAmp) | EDF (`.edf`) | `sub-*/ses-*/eeg/` | EEG-BIDS; sidecar `EEGReference`/`EEGGround`/`PowerLineFrequency` injected from config |
| fNIRS | **SNIRF (`.snirf`)** | `sub-*/ses-*/nirs/` | NIRS-BIDS extension — **not** NIfTI. Read/written via `mne-nirs` / `pysnirf2` |
| Structural MRI / resting-state fMRI | NIfTI (`.nii.gz`) + JSON sidecar | `sub-*/ses-*/{anat,func}/` | converted from DICOM via `dcm2niix` + `dcm2bids` |
| SPECT | DICOM-derived NIfTI | `sourcedata/spect/` + `derivatives/spect/` | **no ratified BIDS modality exists** — stored as a documented non-standard extension, not claimed as validator-clean raw BIDS (see root `docs/spect-non-standard.md`) |
| Withings body-composition / vascular age / ECG | TSV + JSON | `phenotype/` | `phenotype/` is the standard BIDS home for longitudinal non-imaging measures |

## Validation

Run the BIDS Validator before any external publication:

```bash
bids-validator .
```

`sourcedata/` and `derivatives/` (SPECT) are intentionally outside the validated raw tree.
