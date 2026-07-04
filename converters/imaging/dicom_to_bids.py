"""Write an anatomical volume into a BIDS ``anat/`` datatype (NIfTI + JSON).

Real use: point ``--dicom-dir`` at a scanner export; it is converted to NIfTI by
``dcm2niix`` and filed as ``sub-XX[/ses-YY]/anat/..._<suffix>.nii.gz``. The
``--simulate`` path writes a synthetic volume so the converter runs with no
scanner data. (MRI/fMRI are NIfTI+JSON in BIDS — mne-bids does not handle these,
so the writer is hand-rolled on nibabel.)

Usage
-----
    python -m converters.imaging.dicom_to_bids --simulate \
        --root /tmp/ouija_bids --subject 01 --session mri --suffix T1w
    python -m converters.imaging.dicom_to_bids --dicom-dir ./DICOM/T1 \
        --root bids_dataset --subject 01 --session 2026-07-04 --suffix T1w
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from converters.common.bids_skeleton import ensure_dataset, ensure_participant


def write_anat_bids(
    img,
    root: Path,
    subject: str = "01",
    session: str | None = None,
    suffix: str = "T1w",
) -> Path:
    """Save ``img`` (a nibabel image) as a BIDS ``anat/`` NIfTI + sidecar.

    Returns the path to the written ``.nii.gz``.
    """
    import nibabel as nib

    root = Path(root)
    ensure_dataset(root)
    ensure_participant(root, subject)
    sub = subject if subject.startswith("sub-") else f"sub-{subject}"

    parts = [sub]
    subdir = root / sub
    stem = sub
    if session is not None:
        ses = session if session.startswith("ses-") else f"ses-{session}"
        parts.append(ses)
        subdir = subdir / ses
        stem = f"{sub}_{ses}"
    anat = subdir / "anat"
    anat.mkdir(parents=True, exist_ok=True)

    nii_path = anat / f"{stem}_{suffix}.nii.gz"
    nib.save(img, str(nii_path))

    # Minimal, honest sidecar — no fabricated scanner specs. Real dcm2niix output
    # carries Manufacturer/MagneticFieldStrength/etc. that a real export would add.
    sidecar = {"ConversionSoftware": "ouija-dicom_to_bids"}
    nii_path.with_name(f"{stem}_{suffix}.json").write_text(json.dumps(sidecar, indent=4) + "\n")
    return nii_path


def _cli() -> None:
    p = argparse.ArgumentParser(description="Convert an anatomical scan to BIDS anat/ NIfTI.")
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--dicom-dir", type=Path, help="directory of a DICOM series (needs dcm2niix)")
    src.add_argument("--simulate", action="store_true", help="write a synthetic anatomical volume")
    p.add_argument("--seed", type=int, default=0, help="synthetic seed")
    p.add_argument("--root", type=Path, required=True, help="BIDS dataset root")
    p.add_argument("--subject", default="01")
    p.add_argument("--session", default=None)
    p.add_argument("--suffix", default="T1w", help="anat suffix (T1w, T2w, …)")
    args = p.parse_args()

    if args.simulate:
        from converters.imaging.imaging import simulate_volume

        img = simulate_volume(seed=args.seed)
    else:
        from converters.imaging.imaging import load_dicom_series

        img = load_dicom_series(args.dicom_dir)

    nii = write_anat_bids(img, args.root, args.subject, args.session, args.suffix)
    print(f"Wrote {nii}")


if __name__ == "__main__":
    _cli()
