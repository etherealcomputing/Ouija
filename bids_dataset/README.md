# Ouija: God-View for your Brain 🧠

This dataset follows the BIDS standard and includes MRI, SPECT, fMRI, and fNIRS recordings (Kernel Flow 2 headset; raw vendor/SNIRF, with processed hemodynamic maps optionally exported as NIfTI (.nii)). All data has been anonymized and prepared for OpenNeuro validation.

## About Project

**Ouija** is a neuroadaptive, multimodal brain data interface that supports SPECT, fMRI, fNIRS, EEG, and MRI for scientific and generative tooling. Built under ethereal computing inc. for open research, medical visualization, and ML experimentation.


## Goals

- Agentic RAG over neuroimaging
- SAMed2 + local shape descriptors
- Brain+body visualization via Vercel frontend
- Future OpenNeuro publishing

## Stack

- Python, PyTorch, nibabel, nilearn, MNE
- [SAMed2](https://github.com/uni-medical/SAMed) / shape descriptors (optional; review license/usage terms)
- GPT backend (open source + fallback) + [MedGemma 1.5 4B](https://ai.google.dev/gemma/docs/medgemma) (review license/usage terms)
- Vercel frontend (Bubble, V0, or custom)

## BIDS-ready 

All data follows BIDS 1.8.0 schema and validates locally via `bids-validator`. For EEG/fNIRS/physio, follow modality-specific conventions for `events.tsv`, sidecar JSON, `channels.tsv`, `electrodes.tsv`, and `coordsystem.json` as described in the [BIDS EEG](https://bids-specification.readthedocs.io/en/stable/modality-specific-files/eeg.html), [BIDS fNIRS](https://bids-specification.readthedocs.io/en/stable/modality-specific-files/fnirs.html), and [BIDS physio](https://bids-specification.readthedocs.io/en/stable/modality-specific-files/physio.html) specs.
