"""Convert an open-hardware PiEEG (ADS1299) recording into BIDS-valid EDF.

PiEEG streams 8 (or 16) channels of 24-bit EEG at 250 Hz. Its server records CSV
in microvolts; there is no native EDF/BDF export, so we build one. The recording
is wrapped in an MNE ``Raw`` with a 10-20 montage and written into a BIDS ``eeg/``
datatype via ``mne-bids``, injecting the sidecar fields the device doesn't carry
(SRB1 reference, BIAS ground, power-line frequency) from :class:`PiEegSidecarConfig`.

Reuses the generic ``write_bids`` writer from ``neurosity_to_bids`` — only the
montage + sidecar config differ per device.

Usage
-----
    python -m converters.eeg.pieeg_to_bids --simulate --seconds 10 \
        --root /tmp/ouija_bids --subject 01 --session sim --task rest

    python -m converters.eeg.pieeg_to_bids --csv pieeg_20260704_101500.csv \
        --root bids_dataset --subject 01 --session 2026-07-04 --task rest
"""

from __future__ import annotations

import argparse
from pathlib import Path

from converters.common.config import PiEegSidecarConfig
from converters.eeg.neurosity_to_bids import write_bids


def _cli() -> None:
    p = argparse.ArgumentParser(description="Convert a PiEEG recording to BIDS EDF.")
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--csv", type=Path, help="PiEEG-server CSV (time, chan_1..chan_N in µV)")
    src.add_argument("--simulate", action="store_true", help="use a synthetic recording")
    p.add_argument("--seconds", type=float, default=10.0)
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--root", type=Path, required=True)
    p.add_argument("--subject", required=True)
    p.add_argument("--session", default=None)
    p.add_argument("--task", default="rest")
    p.add_argument("--run", default=None)
    p.add_argument("--line-freq", type=float, default=60.0)
    args = p.parse_args()

    config = PiEegSidecarConfig(power_line_freq=args.line_freq)
    if args.simulate:
        from converters.eeg.pieeg import simulate_pieeg

        data, ch_names, sfreq = simulate_pieeg(seconds=args.seconds, seed=args.seed)
    else:
        from converters.eeg.pieeg import load_pieeg_csv

        data, ch_names, sfreq = load_pieeg_csv(args.csv)

    bp = write_bids(
        data, ch_names, sfreq, args.root, args.subject, args.session, args.task, args.run, config
    )
    print(f"Wrote {bp.fpath}")


if __name__ == "__main__":
    _cli()
