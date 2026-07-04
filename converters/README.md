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
