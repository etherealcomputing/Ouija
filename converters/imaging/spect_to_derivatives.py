"""Write a SPECT volume into a documented non-standard ``derivatives/spect/`` tree,
and emit the region-values file that lights the God-View brain's imaging regions.

There is **no ratified BIDS modality for SPECT** (see docs/spect-non-standard.md),
so it is never claimed as validator-clean raw BIDS. Instead it lives under
``derivatives/spect/`` with its own ``dataset_description.json``
(``DatasetType: "derivative"``). Alongside, the converter writes a small
region-values JSON — the exact format the frontend Upload dropzone accepts
(``frontend/lib/uploads.ts``) — so a SPECT scan can light temporal-l/temporal-r/
cerebellum on the 3D brain.

Usage
-----
    python -m converters.imaging.spect_to_derivatives --simulate \
        --root /tmp/ouija_bids --subject 01 --region-values /tmp/spect_regions.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from converters.imaging.imaging import region_values_from_volume

DERIV_NAME = "spect"


def write_spect_derivatives(
    img,
    root: Path,
    subject: str = "01",
    session: str | None = None,
    region_values_path: Path | None = None,
) -> dict:
    """Write ``img`` under ``derivatives/spect/`` + a region-values JSON.

    Returns ``{"nifti": Path, "region_values": Path, "values": dict}``.
    """
    import nibabel as nib

    root = Path(root)
    deriv = root / "derivatives" / DERIV_NAME
    sub = subject if subject.startswith("sub-") else f"sub-{subject}"

    # The derivative dataset carries its own description (non-standard, documented).
    deriv.mkdir(parents=True, exist_ok=True)
    desc = deriv / "dataset_description.json"
    if not desc.exists():
        desc.write_text(
            json.dumps(
                {
                    "Name": "Ouija SPECT (non-standard derivative)",
                    "BIDSVersion": "1.9.0",
                    "DatasetType": "derivative",
                    "GeneratedBy": [{"Name": "ouija-spect_to_derivatives"}],
                    "SourceDatasets": [{"Description": "SPECT — no ratified BIDS raw modality; see docs/spect-non-standard.md"}],
                },
                indent=4,
            )
            + "\n"
        )

    subdir = deriv / sub
    stem = sub
    if session is not None:
        ses = session if session.startswith("ses-") else f"ses-{session}"
        subdir = subdir / ses
        stem = f"{sub}_{ses}"
    subdir.mkdir(parents=True, exist_ok=True)

    nii_path = subdir / f"{stem}_spect.nii.gz"
    nib.save(img, str(nii_path))
    nii_path.with_name(f"{stem}_spect.json").write_text(
        json.dumps({"Modality": "SPECT", "ConversionSoftware": "ouija-spect_to_derivatives"}, indent=4) + "\n"
    )

    # Frontend bridge: region-values JSON (temporal-l/temporal-r/cerebellum in 0–1).
    values = region_values_from_volume(img)
    rv_path = Path(region_values_path) if region_values_path else (subdir / f"{stem}_regions.json")
    rv_path.parent.mkdir(parents=True, exist_ok=True)
    rv_path.write_text(json.dumps(values, indent=4) + "\n")

    return {"nifti": nii_path, "region_values": rv_path, "values": values}


def _cli() -> None:
    p = argparse.ArgumentParser(description="Convert SPECT to a documented derivatives/spect/ tree + region values.")
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--nifti", type=Path, help="an already-reconstructed SPECT NIfTI")
    src.add_argument("--simulate", action="store_true", help="write a synthetic SPECT volume")
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--root", type=Path, required=True, help="dataset root (derivatives/spect/ is written under it)")
    p.add_argument("--subject", default="01")
    p.add_argument("--session", default=None)
    p.add_argument("--region-values", type=Path, default=None, help="where to write the frontend region-values JSON")
    args = p.parse_args()

    if args.simulate:
        from converters.imaging.imaging import simulate_volume

        img = simulate_volume(seed=args.seed)
    else:
        import nibabel as nib

        img = nib.load(str(args.nifti))

    out = write_spect_derivatives(img, args.root, args.subject, args.session, args.region_values)
    print(f"Wrote {out['nifti']}")
    print(f"Region values ({out['values']}) -> {out['region_values']}")


if __name__ == "__main__":
    _cli()
