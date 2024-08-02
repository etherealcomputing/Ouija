<div align="center">

![Ouija logo](https://media.licdn.com/dms/image/D4E22AQFQJ5ZrRX5U_A/feedshare-shrink_800/0/1708192613421?e=2147483647&v=beta&t=oLw0gc_gRuvfkD6olEXwq9CFdhkl1eSAw4-Zzf1KQDc)


# Ouija : God View for your Brain

<h3>

[Homepage](https://github.com/blackdreamai/ouija-ai) | [Documentation](/docs) | [Examples](/examples) | [Showcase](/docs/showcase.md)

</h3>

[![GitHub Repo stars](https://img.shields.io/github/stars/blackdreamai/ouija-ai)](https://github.com/blackdreamai/ouija-ai/stargazers)
[![Lines of code](https://img.shields.io/tokei/lines/github/blackdreamai/ouija-ai)](https://github.com/blackdreamai/ouija-ai)

</div>

---

**Ouija** is a proposed platform purposed towards democratizing access to personal neurological health. 

This will be done by aggregating diverse sets of data, including various high-fidelity neural scans, relevant medical reports, and real-time EEG monitoring via a non-invasive brain-computer interface to actualize a high-fidelity "God View" of the users neurology, so that they can comprehend + proactively monitor their brain activity, functioning, integrity and any perturbations due to aging / damage.

I (Eros, bd.ai founder) will be the initial test case for this initiative and my actual neurological and health data will open-sourced for use in this project. The gif at the top of this README is an axial MRI scan of my brain taken @ Stanford.

---

## Table of Contents
- Overview
- Core Features
- Technological Stack
- Data Sources
- Installation
- Dependencies
- Contributing
- License
- Contact & Support

## Core Features
- **Multi-Modal Data Integration**: Seamless integration of MRIs, PET scans, neurology reports, and more.
- **Real-Time Brain Monitoring**: Direct interfacing with OpenBCIs MarkIV BCI for instantaneous data capture and visualization.
- **Deep Analytics**: Dive deep into your data with our advanced machine learning algorithms and AI-powered insights.
- **Security & Privacy**: With HIPAA-compliant storage and GDPR adherence, rest assured your data is in safe hands.

## Stack
### Frontend
- React
- D3.js

### Backend
- Python Flask
- FastAPI

### Machine Learning
- PyTorch
- Scikit-learn

## Data Management
- PostgreSQL (HIPAA-compliant relational database)
- WebSocket (for handling real-time data streams from OpenBCIs MarkIV)

## Security
- HTTPS
- JWT

## Current Data Sources
* SPECT (concertated + rested-state via Amen Clinics)
* fMRI (guided, rested-state via SimonMed Imaging) 
* Brain MRI (structural via Stanford Neurology)
* Full-Body MRI (via Q Bio Gemini Exam)
* Raw Unfiltered EEG (Cadenced across various states via Neurosity Crown BCI LSL)
* Full Panel Bloodwork (via Q Bio Gemini Exam)
* Vitals + Sleep Data (Routine + constant tracking via Oura Ring 3)
* Genetic Data (via 23 & Me)
* Current General Medical Data (via Standford Health)
* Historical General Medical Data (via Forward Health + Apple Employee Wellness Center) 

## Forthcoming Data Sources
* MEG (Magnetoencephalography)
* DTI (Diffusion Tensor Imaging)

## Installation
```py
# Navigate into the directory
cd Ouija

# Install backend dependencies
pip install -r requirements.txt

# Navigate to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Run the backend and frontend as per the individual READMEs in their directories.
```

## Contributing
We highly value any and all adjacent expertise in:
- **Computational Neuroscience**: To refine our analytical models and make sense of complex neurological data.
- **Neurotech**: To enhance our real-time brain monitoring capabilities.
- **Deep Learning**: For advancing our data analytics and prediction systems.
- If you're passionate about these fields and wish to make a meaningful impact, please see our CONTRIBUTING.md for guidelines.

## License
**Ouija** is under the Apache 2.0 License. Check out LICENSE.md for more details.

## Contact & Support
For inquiries, support, or collaborations, feel free to contact eros@blackdream.ai
