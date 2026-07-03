# Ouija converters

Turn messy per-device raw exports into a standards-valid
[BIDS](https://bids.neuroimaging.io/) dataset. Everything here runs on
**synthetic data + public samples** — no personal recordings required to build
or test.

## What's built (first pass)

### `eeg/` — Neurosity Crown → BIDS EDF ✅

`eeg/neurosity_to_bids.py` takes a Crown recording (an `(n_channels,
n_samples)` array or a CSV) and writes it into a BIDS `eeg/` datatype as **EDF**
via [`mne-bids`](https://mne.tools/mne-bids/), injecting the sidecar fields the
Crown stream does **not** carry — `EEGReference`, `EEGGround`,
`PowerLineFrequency`, `Manufacturer` — from `common/config.py` (these are
configuration from the hardware's specs, not values read off the wire).

```bash
pip install -r converters/requirements.txt

# Synthetic recording (no hardware):
python -m converters.eeg.neurosity_to_bids --simulate --seconds 10 \
    --root /tmp/ouija_bids --subject 01 --session sim --task rest

# From a CSV (rows = samples, cols = the 8 Crown channels, with header):
python -m converters.eeg.neurosity_to_bids --csv rec.csv \
    --root bids_dataset --subject 01 --session 2026-07-01 --task rest
```

**Verification.** `python -m pytest converters/tests -q` (6 tests: synthetic
shape/determinism, `line_freq` injection, EDF + sidecar output, BIDS read-back,
CSV round-trip). The output tree also passes the official validator:

```bash
npx bids-validator /tmp/ouija_bids   # → "This dataset appears to be BIDS compatible."
```

`eeg/simulate.py` is the Python analog of the frontend's
`SimulatedNeurosityAdapter` — same 8-channel 10-20 montage, same 256 Hz — so the
dashboard and the converter share one honest data shape.

## Fast-follow (not yet built)

| Converter | Format / target | Test fixture |
|---|---|---|
| `fnirs/snirf_to_bids.py` | **SNIRF** `.snirf` → BIDS `nirs/` (NOT NIfTI) | `rob-luke/BIDS-NIRS-Tapping` |
| `imaging/dicom_to_bids.py` | DICOM → NIfTI+JSON (`dcm2niix` + `dcm2bids`) | `pydicom` samples / `ds000248` |
| `imaging/spect_to_derivatives.py` | SPECT → documented non-standard `derivatives/` | public TCIA SPECT series |
| `withings/withings_to_phenotype.py` | scale panels → BIDS `phenotype/*.tsv` | Withings API sample JSON |

**SPECT note:** there is no ratified BIDS modality for SPECT. It is stored under
`sourcedata/` + a documented `derivatives/spect/` tree (its own
`DatasetType: "derivative"`), never claimed as validator-clean raw BIDS.

## Real data

Nothing here needs your personal recordings — but when you're ready to convert
real data, the entry points are the same (`--csv` for EEG, the fast-follow
converters for the other modalities). See the repo root `README.md` for the
per-modality hosting strategy (personal store → NeuroJSON continuous →
periodic OpenNeuro snapshot).
