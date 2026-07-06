"""Convert a Neurosity Crown EEG recording into a BIDS-valid EDF dataset.

The Crown SDK streams raw EEG as epochs shaped like:
    { "data": float[8][16], "info": { "channelNames": [...], "samplingRate": 256 } }

Concatenating those epochs gives an (n_channels, n_samples) array. This module
takes that array (or a CSV of it), wraps it in an MNE ``Raw`` with a 10-20
montage, and writes it into a BIDS ``eeg/`` datatype as EDF via ``mne-bids`` —
injecting the sidecar fields the Crown does not report (reference, ground,
power-line frequency) from :class:`EegSidecarConfig`.

Usage
-----
    # From a synthetic recording (no hardware needed):
    python -m converters.eeg.neurosity_to_bids --simulate --seconds 10 \
        --root /tmp/ouija_bids --subject 01 --session sim --task rest

    # From a CSV (rows = samples, columns = the 8 Crown channels, with header):
    python -m converters.eeg.neurosity_to_bids --csv recording.csv \
        --root bids_dataset --subject 01 --session 2026-07-01 --task rest
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

from converters.common.config import CROWN_CHANNELS, CROWN_SFREQ, EegSidecarConfig


def build_raw(data: np.ndarray, ch_names: list[str], sfreq: float, config: EegSidecarConfig):
    """Wrap (n_channels, n_samples) volts into an MNE Raw with a 10-20 montage."""
    import mne

    if data.shape[0] != len(ch_names):
        raise ValueError(f"data has {data.shape[0]} channels but {len(ch_names)} names were given")

    info = mne.create_info(ch_names=list(ch_names), sfreq=float(sfreq), ch_types="eeg")
    raw = mne.io.RawArray(data, info, verbose="ERROR")
    # 10-20 labels → standard positions (used for montage / plotting). Names not
    # in the template are ignored rather than raising.
    montage = mne.channels.make_standard_montage(config.montage)
    raw.set_montage(montage, match_case=False, on_missing="warn", verbose="ERROR")
    raw.info["line_freq"] = config.power_line_freq
    return raw


def write_bids(
    data: np.ndarray,
    ch_names: list[str],
    sfreq: float,
    root: Path,
    subject: str,
    session: str | None,
    task: str,
    run: str | None = None,
    config: EegSidecarConfig | None = None,
):
    """Write the recording into ``root`` as a BIDS eeg/ EDF and patch the sidecar.

    Returns the :class:`mne_bids.BIDSPath` that was written.
    """
    from mne_bids import BIDSPath, write_raw_bids, update_sidecar_json

    config = config or EegSidecarConfig()
    raw = build_raw(data, ch_names, sfreq, config)

    bids_path = BIDSPath(
        subject=subject,
        session=session,
        task=task,
        run=run,
        datatype="eeg",
        root=str(root),
    )
    # EDF is a BIDS-recommended EEG format; allow_preload lets us write an
    # in-memory RawArray. mne-bids validates entities + structure on write.
    write_raw_bids(
        raw,
        bids_path,
        format="EDF",
        allow_preload=True,
        overwrite=True,
        verbose="ERROR",
    )

    # Inject the fields the Crown stream does not carry.
    sidecar = bids_path.copy().update(suffix="eeg", extension=".json")
    update_sidecar_json(
        bids_path=sidecar,
        entries={
            "EEGReference": config.eeg_reference,
            "EEGGround": config.eeg_ground,
            "PowerLineFrequency": config.power_line_freq,
            "Manufacturer": config.manufacturer,
            "ManufacturersModelName": config.model,
            "SoftwareFilters": config.software_filters,
        },
        verbose="ERROR",
    )
    return bids_path


def load_csv(path: Path, sfreq: float = CROWN_SFREQ) -> tuple[np.ndarray, list[str], float]:
    """Load a CSV of shape (n_samples, n_channels) with a channel-name header.

    Returns (data[n_channels, n_samples] in volts, ch_names, sfreq). Values are
    assumed to be microvolts and converted to volts. Malformed files (empty,
    header-only, ragged, non-numeric) raise a clear ValueError naming the file
    and offending line/column.
    """
    from converters.common.csv_io import read_headered_csv

    arr, header = read_headered_csv(path)  # (n_samples, n_channels)
    ch_names = [h.strip() for h in header]
    return arr.T * 1e-6, ch_names, sfreq  # → (n_channels, n_samples) in volts


def _cli() -> None:
    p = argparse.ArgumentParser(description="Convert a Neurosity Crown recording to BIDS EDF.")
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--csv", type=Path, help="CSV (rows=samples, cols=channels, with header)")
    src.add_argument("--simulate", action="store_true", help="use a synthetic recording")
    p.add_argument("--seconds", type=float, default=10.0, help="synthetic duration")
    p.add_argument("--seed", type=int, default=0, help="synthetic seed")
    p.add_argument("--root", type=Path, required=True, help="BIDS dataset root")
    p.add_argument("--subject", required=True)
    p.add_argument("--session", default=None)
    p.add_argument("--task", default="rest")
    p.add_argument("--run", default=None)
    p.add_argument("--line-freq", type=float, default=60.0)
    args = p.parse_args()

    config = EegSidecarConfig(power_line_freq=args.line_freq)
    if args.simulate:
        from converters.eeg.simulate import simulate_crown

        data, ch_names, sfreq = simulate_crown(seconds=args.seconds, seed=args.seed)
    else:
        data, ch_names, sfreq = load_csv(args.csv)

    bp = write_bids(
        data, ch_names, sfreq, args.root, args.subject, args.session, args.task, args.run, config
    )
    print(f"Wrote {bp.fpath}")


if __name__ == "__main__":
    _cli()
