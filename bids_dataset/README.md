# 🧠 Ouija: God-View for your Brain

This dataset follows the BIDS standard and includes MRI, SPECT, and fMRI recordings. All data has been anonymized and prepared for OpenNeuro validation.

## About Project

**Ouija** is a neuroadaptive, multimodal brain data interface that supports SPECT, fMRI, EEG, and MRI for scientific and generative tooling. Built under Ethereal Computing for open research, medical visualization, and ML experimentation.

## 📦 Structure

- `bids_dataset/`: Raw subject data
- `derivatives/`: Cleaned/processed output
- `src/`: Full-stack codebase (frontend + backend)
- `uploads/`: Temporary ingestion space
- `docs/`: Project technical documentation

## 🚀 Goals

- Agentic RAG over neuroimaging
- SAMed2 + local shape descriptors
- Brain+body visualization via Vercel frontend
- Future OpenNeuro publishing

## 🛠 Stack

- Python, PyTorch, nibabel, nilearn, MNE
- SAMed2 / shape descriptors (optional)
- GPT backend (open source + fallback)
- Vercel frontend (Bubble, V0, or custom)

## 🔬 BIDS-ready

All data follows BIDS 1.8.0 schema and validates locally via `bids-validator`.

---