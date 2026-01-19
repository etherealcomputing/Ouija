 <div align="center">

<img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ouija2025-AU8gWFq6Ue6d09Z7rbM9dASmakyHlS.png" alt="Neurograph Example" style="width:400px;" />


# Ouija : God View for your Brain

</h3>

[![GitHub Repo stars](https://img.shields.io/github/stars/blackdreamai/ouija-ai)](https://github.com/blackdreamai/ouija-ai/stargazers)
[![Lines of code](https://img.shields.io/tokei/lines/github/blackdreamai/ouija-ai)](https://github.com/blackdreamai/ouija-ai)

</div>

---

**Ouija** is an open-source, open-science project initiative by **ethereal computing**, purposed to create a holistic view into personal neurophysiology using a range of personal data. This aims to bridge the gap between abstract neuroscience concepts and tangible, personal insights.

<div align="center">
  <b>PoC demo of the Assistant Interface:</b>
</div>
<div align="center">
  <a href="https://www.youtube.com/watch?v=ioDNKShuZ-U&t=4s">
    <img src="https://img.youtube.com/vi/ioDNKShuZ-U/0.jpg" alt="Watch the video" />
  </a>
</div>


## What It Is

*   **Data-Driven:** This app uses real neurological + physiological data collected from personal neuroimaging and biometric sources.
*   **Open-Source & Open-Science:** We believe in radical transparency and democratized knowledge. The code, methodologies, and refined protocols will remain free and open for everyone to use and extrapolate upon, in perpetuity.
*   **Advanced Processing:** Implementing sophisticated pipelines for neuroimaging data analysis, including Statistical Shape Analysis of brain structures using methods like SPHARM-PDM, and exploring Local Shape Descriptors for enhanced segmentation and feature extraction.
*   **Raw Potential:** This project is in its early stages. While backed by ethereal computing, Inc., it remains experimental software with the potential to revolutionize personal neurophysiological understanding.

## What It's Not 

*   **A Finished Product:** This is experimental software. Expect bugs, incomplete visualizations, and ongoing development. While we're building on solid foundations, we're pushing boundaries in neurotechnology and data processing.
*   **A Scientific / Health Instrument:** This is an exploratory tool and research project. It's not FDA approved or intended for medical use. It represents our commitment to open science and technological innovation in neurophysiology.
*   **For the Faint of Heart:** This project leverages personal medical + physiological information to advance our understanding of neurophysiology. We're committed to transparency while maintaining appropriate privacy standards.

## Core Data Sources:

* **Neuroimaging:**
  * SPECT (rested & active state)
  * Structural MRIs with advanced shape analysis capabilities
  * Guided rested-state fMRI
  * fNIRS (Kernel Flow 2 headset — raw vendor/SNIRF; processed hemodynamic maps may be exported as NIfTI (.nii))
* **Neurophysiological biopotentials:**
  * [Neurosity Crown](https://neurosity.co/) BCI (EEG; see [Neurosity Dev + SDK](https://developer.neurosity.co/))
  * [Upside Down Labs](https://www.upsidedownlabs.tech/) (device/firmware-dependent EEG/EOG/ECG/EMG; see [kit docs](https://docs.upsidedownlabs.tech/))
* **Physiological metrics:**
  * Withings smart scale (model-dependent metrics such as body composition, vascular age, or ECG; confirm capabilities for your exact model)
* **Neurological/GP medical reports:** Expert insights and analysis
* **In-progress:** MEG + DTI scans integration

## Cadence Self-Tracking Protocol (Actionable)

This protocol standardizes daily, weekly, and monthly collection across the Neurosity Crown, [Upside Down Neuroscience Kit](https://docs.upsidedownlabs.tech/), and a Withings smart scale so longitudinal trends can be aligned with imaging sessions. The goal is to keep sessions short, repeatable, and labeled with context.

### Baseline Setup (one-time)

1. **Device pairing + metadata**
    * Assign a subject ID (e.g., `sub-001`) and keep it consistent across devices.
    * Set device clocks to the same time source.
    * Create a standardized session log template (date, time, sleep, caffeine, meds, exercise, mood).
2. **Environment standardization**
    * Use the same room, chair, and lighting for EEG sessions.
    * Keep temperature, noise, and posture consistent.
    * Silence notifications and disable Bluetooth devices not in use.
3. **Signal checks**
    * Run a 2-minute dry run on each EEG device to confirm impedance and channel quality.
    * For the Withings scale, verify the device sync and body composition lock.

### Daily Cadence (10–20 minutes total)

**Morning (5–8 minutes, post-wake)**

1. **Withings smart scale (2–3 min)**
    * Measure weight and any model-supported metrics (e.g., body composition, vascular age, ECG) if available.
    * Log hydration status and previous night’s sleep duration/quality.
2. **Neurosity Crown (3–5 min)**
    * 2 minutes eyes-open resting state.
    * 2 minutes eyes-closed resting state.
    * Tag session: `daily_am_rest`.

**Evening (5–12 minutes, pre-sleep)**

1. **Upside Down Neuroscience Kit (5–8 min)**
    * 2 minutes resting EEG (eyes open).
    * 2 minutes resting EEG (eyes closed).
    * 1–2 minutes guided breathing at 6 breaths/min.
    * Tag session: `daily_pm_rest`.
2. **Quick notes (1–2 min)**
    * Stress level (1–10), energy (1–10), notable events, and exercise type.

### Weekly Cadence (30–45 minutes total)

**Cognitive + stimulus block (1x/week)**

1. **Neurosity Crown (15–20 min)**
    * 5 minutes resting baseline.
    * 10 minutes cognitive task battery (e.g., n-back, Stroop, simple reaction time).
    * Tag session: `weekly_cog`.
2. **Upside Down Neuroscience Kit (10–15 min)**
    * 5 minutes ECG + respiration at rest.
    * 5 minutes during a light stimulus (music, breathing, or meditation).
    * Tag session: `weekly_heart_breath`.

### Monthly Cadence (45–90 minutes total)

**Integrated physiology + narrative context (1x/month)**

1. **Full session log**
    * Record a 5–10 minute narrative note on lifestyle shifts, stressors, sleep changes, training volume, and diet.
2. **Long-form EEG**
    * 20 minutes resting + cognitive tasks with the Neurosity Crown.
    * 20 minutes mixed protocol on the Upside Down Neuroscience Kit.
3. **Body composition review**
    * Export Withings monthly trend report for weight and any model-supported composition metrics.

### Data Hygiene + Alignment (ongoing)

* **Labeling:** Use consistent session tags (`daily_am_rest`, `daily_pm_rest`, `weekly_cog`, etc.).
* **Quality control:** Flag sessions with movement artifacts or poor impedance and repeat when possible.
* **Time alignment:** Sync device time logs weekly to prevent drift.
* **Context windows:** Add 24–48 hour context notes around imaging sessions (MRI, fMRI, SPECT, fNIRS).
* **BIDS alignment:** Follow modality-specific BIDS conventions for EEG/fNIRS/physio (e.g., `sub-`, `ses-`, `task-`, `events.tsv`, sidecar JSON, `channels.tsv`, `electrodes.tsv`, `coordsystem.json`). See the [BIDS EEG spec](https://bids-specification.readthedocs.io/en/stable/modality-specific-files/eeg.html), [BIDS fNIRS spec](https://bids-specification.readthedocs.io/en/stable/modality-specific-files/fnirs.html), and [BIDS physiology spec](https://bids-specification.readthedocs.io/en/stable/modality-specific-files/physio.html).
* **Example filename:** `sub-001_ses-20260101_task-daily_am_rest_eeg.edf` with matching `sub-001_ses-20260101_task-daily_am_rest_eeg.json`.
* **Backup + retention:** Export data weekly, encrypt sensitive exports, and store in a versioned folder structure for BIDS-ready conversion.

### Data Privacy + Ethics (read me)

* This is a research tracking protocol, not medical advice.
* If you are collecting physiological or medical data from humans, obtain informed consent and consider IRB/ethics review where applicable.
* Minimize PHI, pseudonymize IDs, and use encrypted storage for identifiable data.

## Processing & Analysis

*   **Structural MRI Processing:**
    * Statistical Shape Analysis using SPHARM-PDM for quantitative brain structure analysis
    * Exploration of Local Shape Descriptors for enhanced segmentation and feature extraction
    * Robust pipeline development for consistent, high-quality results
*   **Data Management:**
    * Processing code available in the repository
    * Large derived datasets stored externally with documented access
    * Smaller datasets maintained internally for quick reference

## Stack (MVP)

*   **Frontend:** Replit (initial), React.js, basic HTML/CSS/JS, D3.js.
*   **Backend:** Python, FastAPI, SQLite, Pandas
*   **Models:** OpenAI API Platform + [SAMed2](https://github.com/uni-medical/SAMed) + [MedGemma 1.5 4B](https://ai.google.dev/gemma/docs/medgemma) (review licenses/usage terms before use)
*   **Deployment:** Vercel (for MVP)

## Contributing

*   If you're into brains, code, and radical openness then contributions are more than welcome.
*   This project is intended to be a public good and is open for collaboration.
*   We are especially looking for help with:
    * Neuroscience expertise (brain emulation and BCIs)
    * Advanced data visualization
    * Data analysis and processing
    * AI/ML implementation
    * Full-stack development

## Roadmap

*   **GPT Interface:** Enhanced natural language interaction with neurophysiological data
*   **MVP Brain Visualization:** Comprehensive data display and analysis platform
*   **Data Analysis Pipelines:** 
    * Automated tools for data processing
    * Advanced structural MRI analysis
    * Shape analysis implementation
*   **Predictive Capabilities:** ML models for state and behavior forecasting
*   **Community:** Building a collaborative ecosystem for neurophysiological research
*   **Integration:** Open APIs for data tools and analysis
*   **Decentralization:** Secure, private data storage and processing

## Contribute 

1.  Fork the repo
2.  Add your own data, analysis, features, or visualizations
3.  Open a PR and let's talk.

Ouija represents a step forward in making neurophysiological understanding more accessible and actionable. By combining personal data, open science, and advanced processing capabilities, we're working to provide deeper insights into the organ that enables our perception of existence.
