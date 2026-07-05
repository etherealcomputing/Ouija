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

### `eeg/` — PiEEG (ADS1299) → BIDS EDF ✅

`eeg/pieeg_to_bids.py` handles the open-hardware **PiEEG** shield (pieeg-club):
8× 24-bit ADS1299 channels at 250 Hz over SPI on a Raspberry Pi. The PiEEG
server records CSV in microvolts (`time, chan_1 … chan_8`) — there is **no native
EDF/BDF export**, so we build one. It reuses the same `write_bids` writer, with a
`PiEegSidecarConfig` carrying the device's real scheme (SRB1 common reference,
BIAS driven ground) and the 8-ch dry-cap montage `Fp1 Fp2 T7 C3 C4 T8 O1 O2`
(the cap labels the temporal sites T3/T4 in legacy nomenclature → T7/T8 today).

```bash
python -m converters.eeg.pieeg_to_bids --simulate --seconds 10 \
    --root /tmp/ouija_bids --subject 01 --session sim --task rest
python -m converters.eeg.pieeg_to_bids --csv pieeg_20260704_101500.csv \
    --root bids_dataset --subject 01 --session 2026-07-04 --task rest
```

Verified: 3 pytest cases (synthetic shape, PiEEG sidecar injection, CSV
round-trip with the leading time column) + the official `bids-validator`
reports the output "BIDS compatible". Live PiEEG ingest (WebSocket `ws://host:1616`
JSON `{t,n,channels:[µV]}`, or LSL) is the fast-follow adapter; conversion to EDF
is done.

### `eeg/` — Upside Down Labs (Chords) → BIDS EDF ✅

`eeg/chords_to_bids.py` handles **Upside Down Labs** BioAmp boards acquired via
**Chords** (the user's actual EEG kit). Two facts drive the design, from crawling
the `upsidedownlabs` org:

1. The BioAmp boards are **single-channel analog front-ends with no ADC** — the
   host MCU digitizes them, so bits / Vref / sample-rate come from the board
   (`common/config.py` `CHORDS_BOARDS`: UNO-R3 10-bit/250 Hz/5 V … GIGA-R1
   16-bit/500 Hz/3.3 V). Chords "N channels" = N MCU ADC pins, not one board.
2. Chords records **raw ADC counts** (CSV `Counter, Channel1 … ChannelN`) and
   streams LSL — **never µV, and no native EDF**. Counts → volts uses
   `((counts − 2^(bits−1)) / 2^bits) × Vref / gain`. **Gain is unpublished by UDL**,
   so it's a **required, user-measured calibration constant** (`--gain`), not a
   guess. Default EEG montage = 1 channel `Fp1` (IN+ Fp1 / IN− Fp2, REF at the
   mastoid; analog 0.5–29.5 Hz band-pass).

```bash
python -m converters.eeg.chords_to_bids --simulate --board UNO-R4 --gain 100 \
    --seconds 10 --root /tmp/ouija_bids --subject 01 --session sim --task rest
python -m converters.eeg.chords_to_bids --csv ChordsPy_20260704.csv \
    --board UNO-R4 --gain 100 --channels Fp1 \
    --root bids_dataset --subject 01 --session 2026-07-04 --task rest
```

Verified: 4 pytest cases (counts→volts formula, simulate round-trip, CSV load,
UDL sidecar injection) + `bids-validator` "BIDS compatible". The live adapter is
a ~200-line port of Chords' fixed-frame serial protocol (`0xC7 0x7C | counter |
N×int16-BE | 0x01`) or `pip install chordspy` → LSL — a fast-follow.

### `withings/` — Withings Body Scan → BIDS phenotype/ ✅

`withings/withings_to_bids.py` turns a Withings `getmeas` JSON export (or a
synthetic self-tracking series) into a BIDS `phenotype/` table. Each Withings
measure is decoded (`value * 10**unit`) into a named column via
`common/config.py` `WITHINGS_MEASURES` — the Body Scan panel: weight, fat
ratio/mass, lean/muscle/bone mass, hydration, heart pulse, pulse-wave velocity,
vascular age. BIDS phenotype is **one row per participant**, so the writer stores
the most-recent Body Scan snapshot (the daily cadence lives in the continuous
NeuroJSON store per the hosting strategy) — keeping it clean on the legacy
`bids-validator`, which does not support multi-row/longitudinal phenotype.

```bash
python -m converters.withings.withings_to_bids --simulate --sessions 7 \
    --root /tmp/ouija_bids --subject 01
python -m converters.withings.withings_to_bids --json getmeas.json \
    --root bids_dataset --subject 01
```

Verified: 3 pytest cases (simulate determinism, `value*10**unit` decode, TSV +
data-dictionary output). A combined EEG + phenotype tree passes `bids-validator`.

### `imaging/` — DICOM → BIDS anat/, SPECT → derivatives/ ✅

`imaging/dicom_to_bids.py` writes an anatomical volume to BIDS `anat/`
(NIfTI+JSON). Real DICOM series route through the external **`dcm2niix`** binary
(`load_dicom_series`); `--simulate` builds a synthetic nibabel volume so it runs
with no scanner export and no binary. `imaging/spect_to_derivatives.py` handles
**SPECT**, which has **no ratified BIDS raw modality** (see
`docs/spect-non-standard.md`) — it is written under `derivatives/spect/` with its
own `DatasetType: "derivative"`, never claimed as validator-clean raw BIDS.

```bash
python -m converters.imaging.dicom_to_bids --simulate \
    --root /tmp/ouija_bids --subject 01 --session mri --suffix T1w
python -m converters.imaging.spect_to_derivatives --simulate \
    --root /tmp/ouija_bids --subject 01 --region-values /tmp/spect_regions.json
```

`spect_to_derivatives.py` also emits a **region-values JSON**
(`temporal-l`/`temporal-r`/`cerebellum`, 0–1) in the exact shape the frontend
Upload dropzone (`frontend/lib/uploads.ts`) accepts — dropping it into the app
lights those imaging-only regions on the God-View 3D brain. Verified: 4 pytest
cases + `bids-validator` clean on the anat tree; a cross-stack contract test
(`converters/tests/test_brain_bridge.py` +
`frontend/tests/e2e/spect-brain-bridge.test.ts`, sharing one golden fixture)
confirms the region file lights exactly the brain's imaging regions.

### `fnirs/` — SNIRF → BIDS nirs/ ✅

`fnirs/snirf_to_bids.py` writes an fNIRS recording into the BIDS `nirs/`
datatype. BIDS stores fNIRS as **SNIRF** (`.snirf`), *not* NIfTI. `mne-bids`
emits the `.snirf` + `_nirs.json`/`_channels.tsv`/`_optodes.tsv`/
`_coordsystem.json` scaffolding from an MNE Raw; we inject the manufacturer /
power-line fields (from `NirsSidecarConfig`) the SNIRF stream does not carry.
`--simulate` builds a small, SNIRF-valid continuous-wave file (4 source/detector
pairs × 2 wavelengths) so it runs with no hardware and no downloaded fixture.

```bash
python -m converters.fnirs.snirf_to_bids --simulate --seconds 8 \
    --root /tmp/ouija_bids --subject 01 --session nirs --task rest
python -m converters.fnirs.snirf_to_bids --snirf recording.snirf \
    --root bids_dataset --subject 01 --session 2026-07-04 --task rest
```

Verified: 3 pytest cases (SNIRF validity + MNE read, determinism, nirs/ sidecar
injection + round-trip). A combined EEG + fNIRS + MRI + phenotype tree passes
`bids-validator` ("BIDS compatible", modalities EEG/NIRS/MRI).

**SPECT note:** there is no ratified BIDS modality for SPECT. It is stored under
`sourcedata/` + a documented `derivatives/spect/` tree (its own
`DatasetType: "derivative"`), never claimed as validator-clean raw BIDS.

## Diagnostics & tests

**Hardware / connector self-test.** One command runs every device connector
(Crown, PiEEG, Chords, fNIRS, MRI, SPECT, Withings) end-to-end on synthetic
data and reports whether each ingest path is healthy — channel count vs. the
device montage, sampling rate vs. spec, biopotential amplitudes in a plausible
physiological range (catching the classic counts-written-as-volts scaling bug),
no NaN/Inf, BIDS sidecar completeness, and mne-bids round-trip readback:

```bash
python -m converters.diagnostics            # human-readable table
python -m converters.diagnostics --json     # machine-readable report
python -m converters.diagnostics --only eeg # one modality group
python -m converters.diagnostics --verbose  # show every check
```

It exits non-zero if any connector fails, so it doubles as a CI smoke test and
a pre-flight hardware check before a real recording session. The console shows
the live counterpart — dropped-frame count and a LIVE/DEGRADED/STALE link — in
the header (`frontend/lib/diagnostics.ts`).

**Test suites.** From the repo root, a `Makefile` is the single entry point:

```bash
make smoke        # hardware/connector diagnostics
make test         # unit + regression, both stacks
make e2e          # cross-stack Python→frontend brain-bridge contract
make e2e-browser  # real-browser check (diagnostic renders live in Chromium)
make all          # the full CI gate
```

Or directly: `python -m pytest converters/tests -q` (converters) and
`npm test` in `frontend/`. The Python→frontend brain bridge is pinned by one
shared golden fixture, re-locked from both sides (`test_brain_bridge.py` +
`frontend/tests/e2e/spect-brain-bridge.test.ts`), so it can't silently rot.
CI (`.github/workflows/ci.yml`) runs all of it on every push and PR.

## Real data

Nothing here needs your personal recordings — but when you're ready to convert
real data, the entry points are the same (`--csv` for EEG, the fast-follow
converters for the other modalities). See the repo root `README.md` for the
per-modality hosting strategy (personal store → NeuroJSON continuous →
periodic OpenNeuro snapshot).
