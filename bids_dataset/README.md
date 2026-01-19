# Ouija: God-View for your Brain 🧠

This dataset follows the BIDS standard and includes MRI, SPECT, fMRI, and fNIRS recordings (Kernel Flow 2 headset; raw fNIRS files are stored in .nii format). All data has been anonymized and prepared for OpenNeuro validation.

## About Project

**Ouija** is a neuroadaptive, multimodal brain data interface that supports SPECT, fMRI, fNIRS, EEG, and MRI for scientific and generative tooling. Built under ethereal computing inc. for open research, medical visualization, and ML experimentation.


## Goals

- Agentic RAG over neuroimaging
- SAMed2 + local shape descriptors
- Brain+body visualization via Vercel frontend
- Future OpenNeuro publishing

## Stack

- Python, PyTorch, nibabel, nilearn, MNE
- [SAMed2](https://github.com/uni-medical/SAMed) / shape descriptors (optional)
- GPT backend (open source + fallback) + [MedGemma 1.5 4B](https://ai.google.dev/gemma/docs/medgemma)
- Vercel frontend (Bubble, V0, or custom)

## BIDS-ready 

All data follows BIDS 1.8.0 schema and validates locally via `bids-validator`.
