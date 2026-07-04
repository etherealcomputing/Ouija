"""Imaging data path: synthesize a NIfTI volume, load a real DICOM series, and
derive brain-region values that feed the God-View 3D brain.

Real DICOM→NIfTI conversion is done by the external ``dcm2niix`` binary (the
community standard) — :func:`load_dicom_series` shells out to it when present.
The synthetic/test path builds a volume with nibabel so the converter runs and
is tested with no scanner export and no binary.
"""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

# The three brain regions the `imaging` modality powers in the frontend atlas
# (frontend/lib/modalities.ts) — the only regions with no EEG coverage, so
# imaging is what lights them up. Keys match BRAIN_REGIONS ids in the app.
IMAGING_REGIONS = ["temporal-l", "temporal-r", "cerebellum"]


def simulate_volume(shape: tuple[int, int, int] = (64, 64, 40), seed: int = 0):
    """Return a synthetic anatomical ``nibabel.Nifti1Image`` (int16, 1 mm iso).

    A smooth ellipsoidal "brain" (higher intensity toward the centre) plus a
    little deterministic texture — enough to exercise the writer and produce
    non-trivial region values. Deterministic for a given seed.
    """
    import nibabel as nib
    import numpy as np

    rng = np.random.default_rng(seed)
    nx, ny, nz = shape
    xs = (np.arange(nx) - nx / 2) / (nx / 2)
    ys = (np.arange(ny) - ny / 2) / (ny / 2)
    zs = (np.arange(nz) - nz / 2) / (nz / 2)
    gx, gy, gz = np.meshgrid(xs, ys, zs, indexing="ij")
    r2 = gx**2 + gy**2 + gz**2
    brain = np.clip(1.0 - r2, 0.0, 1.0)  # ellipsoid mask, bright centre
    texture = 0.08 * rng.standard_normal(shape)
    vol = ((brain + texture).clip(0.0) * 1000.0).astype(np.int16)
    affine = np.eye(4)  # 1 mm isotropic, RAS
    img = nib.Nifti1Image(vol, affine)
    img.header.set_xyzt_units(xyz="mm", t="sec")  # declare units → validator-clean
    return img


def region_values_from_volume(img, seed: int = 0) -> dict[str, float]:
    """Derive ``{temporal-l, temporal-r, cerebellum}`` values in [0, 1] from a volume.

    Honest "imaging-derived" values: the mean intensity of three anatomical-ish
    sub-boxes (left-lateral, right-lateral, inferior-posterior) normalized by the
    volume's peak. This is the file the frontend Upload dropzone consumes to light
    the imaging regions on the 3D brain.
    """
    import numpy as np

    data = np.asarray(img.get_fdata(), dtype=np.float64)
    nx, ny, nz = data.shape
    peak = float(data.max()) or 1.0

    def box_mean(xsl, ysl, zsl) -> float:
        return float(data[xsl, ysl, zsl].mean()) / peak

    # Left/right split on X; cerebellum ≈ inferior (low Z) posterior (low Y).
    lx, rx = slice(0, nx // 3), slice(2 * nx // 3, nx)
    mid_y, mid_z = slice(ny // 3, 2 * ny // 3), slice(nz // 3, 2 * nz // 3)
    post_y, inf_z = slice(0, ny // 3), slice(0, nz // 3)
    return {
        "temporal-l": round(min(1.0, box_mean(lx, mid_y, mid_z)), 4),
        "temporal-r": round(min(1.0, box_mean(rx, mid_y, mid_z)), 4),
        "cerebellum": round(min(1.0, box_mean(slice(nx // 3, 2 * nx // 3), post_y, inf_z)), 4),
    }


def load_dicom_series(dicom_dir: Path):
    """Convert a real DICOM series to a ``nibabel`` image via ``dcm2niix``.

    ``dcm2niix`` (the community-standard DICOM→NIfTI tool) is required for real
    scanner exports and is not needed for the synthetic path. Raises a clear
    error if the binary is not on PATH.
    """
    import nibabel as nib

    exe = shutil.which("dcm2niix")
    if exe is None:
        raise RuntimeError(
            "dcm2niix not found on PATH. Install it (https://github.com/rordenlab/dcm2niix) "
            "to convert real DICOM series; the --simulate path needs no binary."
        )
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [exe, "-z", "y", "-f", "converted", "-o", tmp, str(dicom_dir)],
            check=True,
            capture_output=True,
        )
        niis = sorted(Path(tmp).glob("*.nii*"))
        if not niis:
            raise RuntimeError(f"dcm2niix produced no NIfTI from {dicom_dir}")
        return nib.load(str(niis[0]))
