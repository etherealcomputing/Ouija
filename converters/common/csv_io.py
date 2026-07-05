"""Robust headered-numeric-CSV reader shared by the EEG connectors.

The Neurosity, PiEEG, and Chords loaders all ingest the same shape — a header
row of channel labels followed by numeric sample rows — and all three used the
same terse ``[[float(x) for x in row] for row in reader]`` one-liner. That line
fails opaquely on the inputs real device exports actually produce:

  * an empty file      → ``StopIteration`` bubbling out of ``next(reader)``
  * a header, no data  → ``IndexError`` when a 1-D array is sliced ``[:, k:]``
  * a ragged row       → ``ValueError: setting an array element with a sequence``
  * a non-numeric cell → ``could not convert string to float: 'x'`` (no location)

This reader gives one clear, actionable error per case — always naming the file,
and for bad data the 1-based line and the offending column — so a malformed
recording is diagnosed, not just rejected.
"""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np


def _is_float(s: str) -> bool:
    try:
        float(s)
        return True
    except (ValueError, TypeError):
        return False


def read_headered_csv(path: Path | str) -> tuple[np.ndarray, list[str]]:
    """Read a headered numeric CSV into ``(data[n_rows, n_cols], header)``.

    ``data`` is a 2-D float64 array (always 2-D, even for a single column), row-
    major as written. Blank lines are skipped. Raises :class:`FileNotFoundError`
    if the path is missing and :class:`ValueError` — with the file name, and for
    data errors the 1-based line and column — for every malformed-content case.
    """
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"CSV not found: {p}")

    with open(p, newline="") as fh:
        reader = csv.reader(fh)
        try:
            header = [h.strip() for h in next(reader)]
        except StopIteration:
            raise ValueError(f"{p}: file is empty (no header row)") from None
        if not header or all(h == "" for h in header):
            raise ValueError(f"{p}: header row is empty")

        rows: list[list[float]] = []
        for lineno, row in enumerate(reader, start=2):  # line 1 is the header
            if not row or all(c.strip() == "" for c in row):
                continue  # skip blank lines
            if len(row) != len(header):
                raise ValueError(
                    f"{p}: line {lineno} has {len(row)} column(s), expected "
                    f"{len(header)} from the header"
                )
            bad = next((j for j, c in enumerate(row) if not _is_float(c)), None)
            if bad is not None:
                label = header[bad] if bad < len(header) else f"column {bad + 1}"
                raise ValueError(
                    f"{p}: line {lineno}, column '{label}' is not numeric: {row[bad]!r}"
                )
            rows.append([float(c) for c in row])

    if not rows:
        raise ValueError(f"{p}: header present but no data rows")
    return np.asarray(rows, dtype=np.float64), header
