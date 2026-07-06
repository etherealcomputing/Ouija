# Using your own data in Ouija

This is the honest, working path to make **Demo Mode = your data** and to feed
the **Source Panel** from your real archive.

## Why the cloud session can't reach your folder

Your data lives at
`/Users/eros/Library/CloudStorage/Box-Box/ethereal/00_IP/01_open-source/Ouija/data`
— that's your **Mac's local Box mount**. Ouija's build/agent sessions run in an
ephemeral **Linux** cloud container that has no line of sight to your machine,
and Box itself needs your personal OAuth. So the agent can't `fetch`/`crawl` that
path directly. That's a good thing: your neuro/health data never has to leave
your machine to be used.

The design instead is **manifest-driven** and **local-first**:

```
your data (stays on your Mac)
   │  build_manifest.py  (indexes files — no bytes moved)
   ▼
sources.json  ──►  Source Panel (itemizes + visualizes what you have)
   │  per-modality converters (run locally)
   ▼
BIDS tree + app-facing JSON (region-values / gut-scores / phenotype)
   └─►  drive the brain / Demo Mode from real data
```

## Step 1 — Index your archive (no bytes leave your machine)

From a clone of this repo on your Mac:

```bash
pip install -r converters/requirements.txt
python -m converters.build_manifest \
    --data "/Users/eros/Library/CloudStorage/Box-Box/ethereal/00_IP/01_open-source/Ouija/data" \
    --out frontend/public/sources.json
```

It prints a per-modality rollup and flags anything ambiguous
(`status=review`). `frontend/public/sources.json` is what the Source Panel reads.
`build_manifest` **only reads filenames + sizes** — it does not copy or upload
content.

## Step 2 — Convert the files you want to visualize

Run the matching converter per file (all local, all synthetic-tested):

| Your file | Converter |
|---|---|
| Neurosity Crown CSV | `python -m converters.eeg.neurosity_to_bids --csv … --root bids_dataset --subject 01 …` |
| PiEEG CSV | `python -m converters.eeg.pieeg_to_bids --csv … …` |
| Chords / UDL CSV | `python -m converters.eeg.chords_to_bids --csv … --board <BOARD> --gain <G> …` |
| SNIRF (fNIRS) | `python -m converters.fnirs.snirf_to_bids --snirf … …` |
| DICOM series | `python -m converters.imaging.dicom_to_bids --dicom-dir … …` (needs `dcm2niix`) |
| SPECT | `python -m converters.imaging.spect_to_derivatives --nifti … --region-values …` |
| Withings getmeas JSON | `python -m converters.withings.withings_to_bids --json … …` |
| Viome report JSON/CSV | dropped straight into the app (parsed client-side) |

Each imaging/SPECT run can emit a small **region-values JSON**; EEG a
**channel/region-values** file; Viome **gut scores**. Those small app-facing
files are what light the brain — not the raw recordings.

## Step 3 — Decide what to publish vs. keep private (important)

Raw personal neuro/health data is sensitive. Recommended split:

- **Keep private (never committed):** raw recordings, DICOM, full BIDS tree.
  Add `frontend/public/data/` and `bids_dataset/sub-*/` to `.gitignore`, or keep
  them only in your personal store / NeuroJSON (per the repo's hosting strategy).
- **Safe to commit (de-identified summaries):** `sources.json` (an index — no
  content) and the small **app-facing JSON** (region-values / gut-scores /
  phenotype snapshots). These are derived numbers, not raw signals, and are what
  the dashboard needs.

This keeps the public repo clean while the app still runs on *your* numbers.

## Step 4 — Demo Mode from your data

With `sources.json` present, the **Source Panel** lists your archive and Demo
Mode seeds the live dashboard from the app-facing artifacts of the sources you
select (falling back to the built-in simulator when no manifest is present). See
the Source Panel spec for the interaction model.

## What the agent needs from you to tailor this

To make the manifest + panel fit your archive exactly, paste the output of:

```bash
find "/Users/eros/Library/CloudStorage/Box-Box/ethereal/00_IP/01_open-source/Ouija/data" \
     -maxdepth 3 -type f | sed "s#.*/data/##" | sort
```

That's just a **file listing** (names, not contents) — enough to confirm the
classification routes every file correctly and to build a real (not template)
manifest.
