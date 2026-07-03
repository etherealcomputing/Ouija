<div align="center">
  
  <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ouija2025-AU8gWFq6Ue6d09Z7rbM9dASmakyHlS.png" alt="Ouija" style="width:400px;" />

  # Ouija – God View for your brain

</div>

**Ouija** is a personal, open‑science project by **Eros Marcello Iuliano** that treats my own mind as its
primary subject. It collects and processes personal neurophysiological signals to build a *self‑as‑subject*
model — a framework that lets me (and, by replication, anyone) see how a brain behaves and evolves over
time. The code and the data are open so that neuroscientists, researchers and the generally curious can
follow along, replicate the work and build on it. By opening my neurophysiological data to the community, I
hope to help new experiments and insight grow from a personal archive that was painstakingly amassed at
significant cost.

## What makes it a self‑as‑subject model

Unlike traditional neuroscience experiments, Ouija centers on the individual as both experimenter and
subject. I record my own brain and body signals — EEG, fMRI, SPECT, fNIRS, heart rate, respiration and more
— and use that data to build models of attention, mood and cognitive state alongside structural captures of
the organ itself. Placing the self at the center means I can iterate quickly, refine protocols and share
everything without ethical or privacy barriers. This self‑as‑subject approach also invites others to
replicate the protocol on themselves, turning self‑quantification into a vehicle for shared science.

## Core data sources

* **Neuroimaging** – SPECT scans (rested and active), structural MRIs with shape analysis, guided
  resting‑state fMRI and fNIRS recordings.
* **Biopotentials** – EEG data from the [Neurosity Crown](https://neurosity.co) and the
  [Upside Down Labs](https://www.upsidedownlabs.tech) bio‑sensing kit, plus EOG, ECG and EMG signals.
* **Physiological metrics** – weight, body composition, vascular age and heart rhythms from the Withings
  Full Body Smart Scale.
* **Clinical reports** – interpretations from neurologists and general practitioners (kept private;
  only de‑identified derived summaries are ever shared).
* **In progress** – magnetoencephalography (MEG) and diffusion tensor imaging (DTI) data.

These streams come together to form a multidimensional picture of one mind across time. Raw recordings,
derived features and processing code live in this repository or its linked storage; large datasets are
shared externally with clear documentation, while smaller files are kept here for quick reference. See
[`bids_dataset/`](./bids_dataset) for the standards‑organized data root.

## Cadence self‑tracking protocol

Consistency is key when measuring the brain. Ouija uses a structured protocol to capture data daily, weekly
and monthly. Sessions are tagged and documented to maintain context:

* **Baseline setup** – Assign a subject ID, synchronize all devices to the same clock and create a session
  log template. Standardize the recording environment and run signal‑quality checks on EEG headsets and the
  scale before collecting data.
* **Daily routine** – Each morning capture weight, body composition, vascular age and ECG via the scale,
  then record 2 minutes of eyes‑open and 2 minutes of eyes‑closed EEG with the Neurosity Crown. Each evening
  collect resting EEG using the Upside Down Labs kit, followed by guided breathing and brief notes on stress
  and energy.
* **Weekly blocks** – Once a week run a cognitive task battery with the Neurosity Crown and a heart‑breath
  session with the Upside Down Labs kit to capture how the brain and heart respond to stimuli.
* **Monthly integration** – Record a narrative note about lifestyle changes, run longer EEG sessions and
  review body‑composition trends to align with imaging appointments.
* **Data hygiene** – Label sessions consistently (e.g. `daily_am_rest`, `weekly_cog`), flag poor‑quality
  recordings, sync device clocks regularly, annotate imaging sessions with context and back up weekly.

## Processing & analysis

The analysis pipeline combines established neuroimaging techniques with custom tooling:

* **Structural MRI** – Apply statistical shape analysis (e.g. SPHARM‑PDM) and local shape descriptors to
  quantify morphological differences across sessions.
* **Time‑series processing** – Filter, segment and feature‑extract EEG, ECG and fNIRS signals; apply
  dimensionality reduction and machine‑learning models to detect states and patterns.
* **Format conversion** – Convert per‑device raw exports into standards‑valid [BIDS](https://bids.neuroimaging.io/):
  EEG → EDF (`mne-bids`), fNIRS → SNIRF, MRI/fMRI → NIfTI (`dcm2niix`/`dcm2bids`), Withings panels → BIDS
  `phenotype/`. See [`converters/`](./converters).
* **Data management** – Use Python and Pandas to load, clean and serve data; a FastAPI backend exposes
  derived summaries to the dashboard.

## Dashboard

A local [Next.js](https://nextjs.org) dashboard (under [`frontend/`](./frontend)) renders the archive as an
interactive "God View": live signal waveforms, a mind‑state estimate, and longitudinal trends. During
development the device feeds are simulated, so the interface runs end‑to‑end without physical hardware
attached.

## Tech stack

| Layer | Tools |
| --- | --- |
| **Frontend** | Next.js, React, Tailwind CSS, hand‑rolled SVG visualizations |
| **Backend** | Python with FastAPI, SQLite and Pandas |
| **Neuro tooling** | MNE‑Python, MNE‑BIDS, pysnirf2, dcm2niix / dcm2bids, bids‑validator |
| **Deployment** | Vercel for prototypes |

## Contributing

Ouija is an open project. If you care about the brain, code or open knowledge, you are welcome to:

1. Fork this repo and run the scripts on your own data.
2. Improve analysis routines, visualizations or the cadence protocol.
3. Share feedback, open issues or start discussions.
4. Contribute neuroscientific insights, machine‑learning methods or full‑stack features.

Please note that this project is experimental and **not a diagnostic instrument**. It pushes the boundaries
of personal neuroscience but is not intended for medical use.

## Roadmap

* **Query interface** – Natural‑language tooling to explore and interpret the archive conversationally.
* **Visualization** – Richer, more intuitive brain and body dashboards.
* **Analysis pipelines** – Automate preprocessing and incorporate more advanced shape analysis and
  predictive models.
* **Predictive capabilities** – Train models to forecast cognitive or physiological states.
* **Community** – Expand documentation, publish more datasets and foster a collaborative research network.
* **Integration & privacy** – Secure APIs for data access and decentralised storage options.

## License

Code is released under the MIT License. Personal neurophysiological data shared here is anonymized and
provided under CC0 for research and educational purposes. Use it responsibly, cite the source and respect
the privacy of others if you replicate the self‑as‑subject model.

---

*A personal project of Eros Marcello Iuliano.*
