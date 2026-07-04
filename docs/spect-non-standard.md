# SPECT in Ouija — a documented non-standard extension

Both `converters/README.md` and `bids_dataset/README.md` point here for the
reasoning behind how SPECT is stored. Short version: **there is no ratified BIDS
modality for SPECT**, so Ouija never claims SPECT as validator-clean *raw* BIDS.

## Why not raw BIDS

BIDS ratifies datatypes for MRI/fMRI (`anat/`, `func/`), EEG (`eeg/`), MEG,
iEEG, and fNIRS (`nirs/`), among others. PET has a BIDS extension (BEP009);
**SPECT does not** have a ratified datatype at the time of writing. Filing a
SPECT volume under a made-up `spect/` raw datatype would fail the validator and,
worse, misrepresent the data as conforming when it does not.

## How Ouija stores it instead

SPECT is written as a **derivative**, in its own dataset with its own
`dataset_description.json` carrying `"DatasetType": "derivative"`:

```
<root>/derivatives/spect/
  dataset_description.json          # Name, BIDSVersion, DatasetType: "derivative", GeneratedBy
  sub-01/
    sub-01_spect.nii.gz             # reconstructed volume (NIfTI)
    sub-01_spect.json               # {"Modality": "SPECT", ...}
    sub-01_regions.json             # optional: region values for the God-View brain
```

Raw scanner exports (the DICOM series) live under `sourcedata/` — also outside
the validated raw tree — so nothing under `sub-*/` claims a datatype BIDS has not
ratified. Running `bids-validator` on `<root>` validates the *raw* EEG/anat/
phenotype data; the `derivatives/spect/` tree is intentionally a separate,
self-describing derivative and is not asserted as validator-clean raw BIDS.

## The region-values bridge

`converters/imaging/spect_to_derivatives.py` also emits a small region-values
JSON (`temporal-l`, `temporal-r`, `cerebellum` in 0–1). That file is **not** part
of the BIDS tree — it is an application export in the exact shape
`frontend/lib/uploads.ts` accepts, so a SPECT scan can light the imaging regions
on the God-View 3D brain (those three regions have no EEG coverage, so imaging is
what brings them online).

## If/when SPECT is ratified

If a future BIDS release ratifies a SPECT datatype, the converter can promote the
volume from `derivatives/spect/` into the raw tree; until then, the derivative
layout above is the honest home.
