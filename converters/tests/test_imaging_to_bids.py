"""Tests for the imaging converters (DICOM→anat, SPECT→derivatives). Synthetic only."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from converters.imaging.imaging import (
    IMAGING_REGIONS,
    region_values_from_volume,
    simulate_volume,
)
from converters.imaging.dicom_to_bids import write_anat_bids
from converters.imaging.spect_to_derivatives import write_spect_derivatives


def test_simulate_volume_shape_and_determinism():
    img = simulate_volume(shape=(32, 32, 20), seed=7)
    assert img.shape == (32, 32, 20)
    a = simulate_volume(shape=(32, 32, 20), seed=7)
    assert np.array_equal(np.asarray(img.dataobj), np.asarray(a.dataobj))


def test_region_values_are_imaging_regions_in_unit_range():
    img = simulate_volume(seed=1)
    rv = region_values_from_volume(img)
    assert set(rv) == set(IMAGING_REGIONS)
    for v in rv.values():
        assert 0.0 <= v <= 1.0


def test_write_anat_bids_nifti_and_sidecar(tmp_path):
    img = simulate_volume(seed=2)
    nii = write_anat_bids(img, tmp_path, subject="01", session="mri", suffix="T1w")

    assert nii.name == "sub-01_ses-mri_T1w.nii.gz"
    assert nii.exists()
    assert nii.parent == tmp_path / "sub-01" / "ses-mri" / "anat"
    sidecar = json.loads(nii.with_name("sub-01_ses-mri_T1w.json").read_text())
    assert "ConversionSoftware" in sidecar
    # BIDS skeleton present.
    assert (tmp_path / "dataset_description.json").exists()
    assert (tmp_path / "participants.tsv").exists()


def test_spect_derivatives_and_region_bridge(tmp_path):
    img = simulate_volume(seed=3)
    rv_path = tmp_path / "spect_regions.json"
    out = write_spect_derivatives(img, tmp_path, subject="01", region_values_path=rv_path)

    # Non-standard derivative tree with its own DatasetType.
    desc = json.loads((tmp_path / "derivatives" / "spect" / "dataset_description.json").read_text())
    assert desc["DatasetType"] == "derivative"
    assert out["nifti"].exists() and out["nifti"].suffixes[-2:] == [".nii", ".gz"]

    # Frontend bridge file: exactly the three imaging region ids, all in [0, 1].
    bridge = json.loads(rv_path.read_text())
    assert set(bridge) == set(IMAGING_REGIONS)
    assert all(0.0 <= v <= 1.0 for v in bridge.values())
    # Deterministic vs the pure helper.
    assert bridge == region_values_from_volume(simulate_volume(seed=3))
