<div align="center">
  
  <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ouija2025-AU8gWFq6Ue6d09Z7rbM9dASmakyHlS.png" alt="Neurograph Example" style="width:400px;" />

  # Ouija – God View for your brain

</div>

**Ouija** is an open‑science project from **ethereal computing** that treats the user’s own mind as its primary subject. It collects + processes personal neurophysiological signals to build upon a *self‑as‑subject* model; a framework that lets anyone see how their own brain behaves and evolves. The code and the data are open so that neuroscientists, researchers and the generally curious can follow along, replicate the work and build on it.  By opening my neurophysiological data to the neuroscience community, I hope to help new experiments + insight grow from this personal archive which was painstakingly amassed and of significant cost.

## A brief history

Ouija started in 2023 when we announced two open‑source efforts: *Converge*, a human–machine programming language for neuromorphic engineering, and *Ouija*, a platform that acts as a “God View” for brain health [oai_citation:0‡a3exchange.com](https://a3exchange.com/a3e-2024-anaheim/#:~:text=In%202023%2C%20Eros%20founded%20black,programming%20language%20for%20Neuromorphic%20Engineering).  At first Ouija was a private experiment to align personal EEG, fMRI and physiological signals. Early prototypes were rough scripts stitched together to plot brainwaves and track mood.  In 2024 the project grew into a fully fledged repository with diverse data modalities, a cadenced self-tracking protocol and a working proof-of-concept demo.  By 2025 we embraced an open‑source, open‑science ethos, selecting our points of neuro data hosting and expanding our archive of consumer-grade BCI and adjacent physiologocial tracking hardware.  Here in January 2026, the repository is still being updated [oai_citation:1‡github.com](https://github.com/etherealcomputing#:~:text=etherealcomputing%2FOuija%E2%80%99s%20past%20year%20of%20commit,activity), and work has begun to integrate autonomous research loops and generative models thereby largely transforming the core + operational altitude of the project itself. 

### Timeline

| Year | Milestone | Notes |
| --- | --- | --- |
| **2023** | Idea & announcement | Conceptualized at **black dream ai**, introduced as a “God View” platform and open‑source commitment [oai_citation:2‡a3exchange.com](https://a3exchange.com/a3e-2024-anaheim/#:~:text=In%202023%2C%20Eros%20founded%20black,programming%20language%20for%20Neuromorphic%20Engineering) |
| **2024** | Early prototypes | Built first scripts to process EEG and fMRI; defined self‑tracking protocol |
| **2025** | Open‑source release | Published cadence protocol began sharing personal neurophysiological data |
| **2026** | Autoresearch integration | Active development continuing [oai_citation:3‡github.com](https://github.com/etherealcomputing#:~:text=etherealcomputing%2FOuija%E2%80%99s%20past%20year%20of%20commit,activity); exploring autonomous analysis loops and AGI‑style research agents |

## What makes it a self‑as‑subject model

Unlike traditional neuroscience experiments, Ouija centers on the individual as both experimenter and subject.  The user records their own brain and body signals – EEG, fMRI, SPECT, fNIRS, heart rate, respiration and more – and use that data to build models of attention, mood, cognitive state alongside respective structural captures of the organ itself.  By placing the self at the center, one can iterate quickly, refine protocols and share everything without ethical or privacy barriers.  This self‑as‑subject approach also invites others to replicate the protocol on themselves, turning self‑quantification into a vehicle for everything from personal health + wellness optimization to shared science.

## Core data sources

* **Neuroimaging** – SPECT scans (rested and active), structural MRIs with shape analysis, guided resting‑state fMRI and fNIRS recordings.
* **Biopotentials** – EEG data from the [Neurosity Crown](https://neurosity.co) and the [Upside Down Labs](https://www.upsidedownlabs.tech) neuroscience kit, plus EOG, ECG and EMG signals.
* **Physiological metrics** – weight, body composition, vascular age and heart rhythms from the Withings Full Body Smart Scale.
* **Clinical reports** – interpretations from neurologists and general practitioners.
* **In progress** – magnetoencephalography (MEG) and diffusion tensor imaging (DTI) data.

These data streams come together to form a multidimensional picture of one mind across time.  The raw recordings, derived features and processing code live in this repository or its linked storage; large datasets are shared externally with clear documentation, while smaller files are kept here for quick reference.

## Cadence self‑tracking protocol

Consistency is key when measuring the brain.  Ouija uses a structured protocol to capture data daily, weekly and monthly.  Sessions are tagged and documented to maintain context:

* **Baseline setup** – Assign a subject ID, synchronize all devices to the same clock and create a session log template.  Standardize the recording environment and perform signal quality checks on EEG headsets and scales before collecting data.
* **Daily routine** – Each morning capture weight, body composition, vascular age and ECG via the scale, then record 2 minutes of eyes‑open EEG and 2 minutes of eyes‑closed EEG with the Neurosity Crown.  Each evening collect resting EEG using the Upside Down Labs kit, followed by guided breathing and brief notes on stress and energy.
* **Weekly blocks** – Once a week run a cognitive task battery with the Neurosity Crown and a heart‑breath session with the Upside Down Labs kit to capture how the brain and heart respond to stimuli.
* **Monthly integration** – Record a narrative note about lifestyle changes, run longer EEG sessions and review body composition trends to align with imaging appointments.
* **Data hygiene** – Label sessions consistently (e.g. `daily_am_rest`, `weekly_cog`), flag poor‑quality recordings, sync device clocks regularly, annotate imaging sessions with context and back up data weekly.

## Processing & analysis

The analysis pipeline combines established neuroimaging techniques with custom tools:

* **Structural MRI** – Apply Statistical Shape Analysis (e.g. SPHARM‑PDM) and local shape descriptors to quantify morphological differences across sessions.
* **Time‑series processing** – Filter, segment and feature‑extract EEG, ECG and fNIRS signals; apply dimensionality reduction and machine‑learning models to detect states and patterns.
* **Data management** – Use Python, Pandas and FastAPI to load, clean and serve data.  Store large files externally and maintain smaller derived datasets in the repo for ease of use.

The long‑term goal is to automate many of these steps.  Recent experiments integrate agentic loops that propose analyses, run them and evaluate results, paving the way for autonomous research workflows.

## Tech stack

| Layer | Tools |
| --- | --- |
| **Frontend** | React and D3.js for interactive plots |
| **Backend** | Python with FastAPI, SQLite and Pandas |
| **Models** | OpenAI + Gemini APIs plus open‑medical models like SAMed2 and MedGemma |
| **Deployment** | Vercel for prototypes |

## Contributing

Ouija is a community project.  If you care about the brain, code or open knowledge, your participation is welcome.  You can:

1. Fork this repo and run the scripts on your own data.
2. Improve analysis routines, visualizations or the cadence protocol.
3. Share feedback, open issues or start discussions.
4. Contribute neuroscientific insights, machine‑learning methods or full‑stack features.

Please note that this project is experimental and not a diagnostic instrument.  It pushes the boundaries of personal neuroscience but is not intended for medical use.  By taking part, you help explore new frontiers in open, self‑driven research.

## Roadmap

* **GPT interface** – Refine natural language tooling so users can query and interpret their data conversationally.
* **Visualization** – Build richer and more intuitive brain and body dashboards.
* **Analysis pipelines** – Automate preprocessing and incorporate more advanced shape analysis and predictive models.
* **Predictive capabilities** – Train models to forecast cognitive or physiological states.
* **Community** – Expand documentation, publish more datasets and foster a collaborative research network.
* **Integration & privacy** – Offer secure APIs for data access and explore decentralised storage options.

## License

This repository is released under the MIT License.  All personal neurophysiological data shared here are anonymized and provided for research and educational purposes.  Use it responsibly, cite the source and respect the privacy of others if you replicate the self‑as‑subject model.

---

*Last updated: March 12 2026.*
