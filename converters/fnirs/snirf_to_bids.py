"""Write a SNIRF fNIRS recording into a BIDS ``nirs/`` datatype.

BIDS stores fNIRS as SNIRF (not NIfTI). ``mne-bids`` writes the `.snirf` plus the
`_nirs.json` / `_channels.tsv` / `_optodes.tsv` / `_coordsystem.json` scaffolding
from an MNE Raw; we then inject the manufacturer / power-line fields the SNIRF
stream does not carry (from :class:`NirsSidecarConfig`), mirroring the EEG path.

Usage
-----
    python -m converters.fnirs.snirf_to_bids --simulate --seconds 8 \
        --root /tmp/ouija_bids --subject 01 --session nirs --task rest
    python -m converters.fnirs.snirf_to_bids --snirf recording.snirf \
        --root bids_dataset --subject 01 --session 2026-07-04 --task rest
"""

from __future__ import annotations

import argparse
from pathlib import Path

from converters.common.config import NirsSidecarConfig


def write_nirs_bids(
    raw,
    root: Path,
    subject: str,
    session: str | None,
    task: str,
    run: str | None = None,
    config: NirsSidecarConfig | None = None,
):
    """Write ``raw`` (an fNIRS MNE Raw) into ``root`` as BIDS nirs/ and patch the sidecar.

    Returns the :class:`mne_bids.BIDSPath` that was written.
    """
    from mne_bids import BIDSPath, write_raw_bids, update_sidecar_json

    config = config or NirsSidecarConfig()
    raw.info["line_freq"] = config.power_line_freq

    bids_path = BIDSPath(
        subject=subject,
        session=session,
        task=task,
        run=run,
        datatype="nirs",
        root=str(root),
    )
    write_raw_bids(raw, bids_path, overwrite=True, verbose="ERROR")

    # Inject the fields the SNIRF stream does not carry.
    sidecar = bids_path.copy().update(suffix="nirs", extension=".json")
    update_sidecar_json(
        bids_path=sidecar,
        entries={
            "Manufacturer": config.manufacturer,
            "ManufacturersModelName": config.model,
            "PowerLineFrequency": config.power_line_freq,
            "SoftwareFilters": config.software_filters,
        },
        verbose="ERROR",
    )
    return bids_path


def _cli() -> None:
    p = argparse.ArgumentParser(description="Convert a SNIRF fNIRS recording to BIDS nirs/.")
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--snirf", type=Path, help="a .snirf recording")
    src.add_argument("--simulate", action="store_true", help="synthesize a SNIRF recording")
    p.add_argument("--seconds", type=float, default=8.0, help="synthetic duration")
    p.add_argument("--seed", type=int, default=0, help="synthetic seed")
    p.add_argument("--root", type=Path, required=True, help="BIDS dataset root")
    p.add_argument("--subject", required=True)
    p.add_argument("--session", default=None)
    p.add_argument("--task", default="rest")
    p.add_argument("--run", default=None)
    args = p.parse_args()

    from converters.fnirs.fnirs import load_snirf

    if args.simulate:
        import tempfile

        from converters.fnirs.fnirs import simulate_snirf

        with tempfile.TemporaryDirectory() as tmp:
            snirf_path = simulate_snirf(Path(tmp) / "synthetic.snirf", seconds=args.seconds, seed=args.seed)
            raw = load_snirf(snirf_path)
            bp = write_nirs_bids(raw, args.root, args.subject, args.session, args.task, args.run)
    else:
        raw = load_snirf(args.snirf)
        bp = write_nirs_bids(raw, args.root, args.subject, args.session, args.task, args.run)

    print(f"Wrote {bp.fpath}")


if __name__ == "__main__":
    _cli()
