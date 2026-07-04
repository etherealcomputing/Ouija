"""Convert an Upside Down Labs (Chords) recording into BIDS-valid EDF.

Chords records raw ADC counts (CSV) or streams them over LSL/Serial/BLE/WiFi —
there is no native EDF/BDF export, so we build one. Raw counts are converted to
volts with the per-board {bits, Vref} and the BioAmp {gain}, wrapped in an MNE
``Raw`` with a 10-20 montage, and written via ``mne-bids`` (reusing the shared
``write_bids`` writer) with a ``ChordsSidecarConfig``.

**Gain** is a required calibration constant — UDL does not publish a default, so
the CLI requires ``--gain`` and the value should be measured for your build.

Usage
-----
    python -m converters.eeg.chords_to_bids --simulate --board UNO-R4 --gain 100 \
        --seconds 10 --root /tmp/ouija_bids --subject 01 --session sim --task rest

    python -m converters.eeg.chords_to_bids --csv ChordsPy_20260704.csv \
        --board UNO-R4 --gain 100 --channels Fp1 \
        --root bids_dataset --subject 01 --session 2026-07-04 --task rest
"""

from __future__ import annotations

import argparse
from pathlib import Path

from converters.common.config import CHORDS_BOARDS, CHORDS_EEG_CHANNELS, ChordsSidecarConfig
from converters.eeg.chords import counts_to_bids_volts, load_chords_csv, simulate_chords
from converters.eeg.neurosity_to_bids import write_bids


def _cli() -> None:
    p = argparse.ArgumentParser(description="Convert an Upside Down Labs / Chords recording to BIDS EDF.")
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--csv", type=Path, help="Chords CSV (Counter, Channel1..N raw counts)")
    src.add_argument("--simulate", action="store_true", help="use a synthetic recording")
    p.add_argument("--board", required=True, choices=sorted(CHORDS_BOARDS), help="Chords board id")
    p.add_argument("--gain", type=float, required=True, help="BioAmp gain (measured calibration constant)")
    p.add_argument("--channels", nargs="+", default=None, help="channel names (10-20 labels); default Fp1")
    p.add_argument("--seconds", type=float, default=10.0)
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--root", type=Path, required=True)
    p.add_argument("--subject", required=True)
    p.add_argument("--session", default=None)
    p.add_argument("--task", default="rest")
    p.add_argument("--run", default=None)
    p.add_argument("--line-freq", type=float, default=60.0)
    args = p.parse_args()

    board = CHORDS_BOARDS[args.board]
    config = ChordsSidecarConfig(power_line_freq=args.line_freq)

    if args.simulate:
        ch_names = args.channels or CHORDS_EEG_CHANNELS
        counts, sfreq = simulate_chords(board, args.gain, seconds=args.seconds, n_channels=len(ch_names), seed=args.seed)
    else:
        counts, csv_names = load_chords_csv(args.csv)
        sfreq = board.sfreq
        ch_names = args.channels or (CHORDS_EEG_CHANNELS if counts.shape[0] == 1 else csv_names)

    volts = counts_to_bids_volts(counts, board, args.gain)
    bp = write_bids(volts, list(ch_names), sfreq, args.root, args.subject, args.session, args.task, args.run, config)
    print(f"Wrote {bp.fpath}")


if __name__ == "__main__":
    _cli()
