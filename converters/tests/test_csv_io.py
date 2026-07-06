"""Robustness tests for the shared CSV reader and the loaders built on it.

Every malformed-input case a real device export can produce must raise a clear,
located ValueError (or FileNotFoundError) — never a bare StopIteration /
IndexError / opaque numpy error. Also covers the loaders that consume it and the
Chords gain guard.
"""

from __future__ import annotations

import numpy as np
import pytest

from converters.common.config import CHORDS_BOARDS, chords_counts_to_volts
from converters.common.csv_io import read_headered_csv
from converters.eeg.chords import load_chords_csv
from converters.eeg.neurosity_to_bids import load_csv
from converters.eeg.pieeg import load_pieeg_csv


def _write(tmp_path, name, text):
    p = tmp_path / name
    p.write_text(text)
    return p


# ── read_headered_csv: the parsing invariants ─────────────────────────────
def test_reads_well_formed_csv(tmp_path):
    p = _write(tmp_path, "ok.csv", "a,b,c\n1,2,3\n4,5,6\n")
    arr, header = read_headered_csv(p)
    assert header == ["a", "b", "c"]
    assert arr.shape == (2, 3)
    assert np.array_equal(arr, [[1, 2, 3], [4, 5, 6]])


def test_skips_blank_lines(tmp_path):
    p = _write(tmp_path, "blanks.csv", "a,b\n1,2\n\n3,4\n\n")
    arr, _ = read_headered_csv(p)
    assert arr.shape == (2, 2)


def test_missing_file_raises_filenotfound(tmp_path):
    with pytest.raises(FileNotFoundError, match="CSV not found"):
        read_headered_csv(tmp_path / "nope.csv")


def test_empty_file_raises_clear_error(tmp_path):
    p = _write(tmp_path, "empty.csv", "")
    with pytest.raises(ValueError, match="file is empty"):
        read_headered_csv(p)


def test_header_only_raises_no_data_rows(tmp_path):
    p = _write(tmp_path, "headeronly.csv", "a,b,c\n")
    with pytest.raises(ValueError, match="no data rows"):
        read_headered_csv(p)


def test_ragged_row_reports_line_and_counts(tmp_path):
    p = _write(tmp_path, "ragged.csv", "a,b,c\n1,2,3\n4,5\n")
    with pytest.raises(ValueError, match=r"line 3 has 2 column\(s\), expected 3"):
        read_headered_csv(p)


def test_non_numeric_cell_reports_location(tmp_path):
    p = _write(tmp_path, "bad.csv", "a,b,c\n1,2,3\n4,oops,6\n")
    with pytest.raises(ValueError, match=r"line 3, column 'b' is not numeric: 'oops'"):
        read_headered_csv(p)


# ── loaders inherit the clear errors ──────────────────────────────────────
def test_neurosity_load_csv_roundtrip(tmp_path):
    p = _write(tmp_path, "crown.csv", "CP3,C3,F5\n1,2,3\n4,5,6\n")
    data, names, sfreq = load_csv(p)
    assert names == ["CP3", "C3", "F5"]
    assert data.shape == (3, 2)  # (channels, samples)
    assert np.allclose(data, np.array([[1, 4], [2, 5], [3, 6]]) * 1e-6)


def test_neurosity_load_csv_empty_is_clear(tmp_path):
    p = _write(tmp_path, "empty.csv", "")
    with pytest.raises(ValueError, match="file is empty"):
        load_csv(p)


def test_pieeg_drops_time_column(tmp_path):
    p = _write(tmp_path, "pieeg.csv", "time,Fp1,Fp2,T7,C3,C4,T8,O1,O2\n0,1,2,3,4,5,6,7,8\n1,1,2,3,4,5,6,7,8\n")
    data, names, sfreq = load_pieeg_csv(p)
    assert len(names) == 8 and names[0] == "Fp1"
    assert data.shape == (8, 2)


def test_pieeg_time_only_header_is_clear(tmp_path):
    p = _write(tmp_path, "timeonly.csv", "time\n0\n1\n")
    with pytest.raises(ValueError, match="no channel columns"):
        load_pieeg_csv(p)


def test_chords_drops_counter_column(tmp_path):
    p = _write(tmp_path, "chords.csv", "Counter,Channel1\n0,512\n1,513\n")
    counts, names = load_chords_csv(p)
    assert names == ["Channel1"]
    assert counts.shape == (1, 2)
    assert np.array_equal(counts, [[512, 513]])


def test_chords_ragged_is_clear(tmp_path):
    p = _write(tmp_path, "chords.csv", "Counter,Channel1,Channel2\n0,512,500\n1,513\n")
    with pytest.raises(ValueError, match=r"line 3 has 2 column"):
        load_chords_csv(p)


# ── Chords gain guard ─────────────────────────────────────────────────────
@pytest.mark.parametrize("gain", [0.0, -1.0])
def test_chords_gain_must_be_positive(gain):
    board = CHORDS_BOARDS["UNO-R4"]
    with pytest.raises(ValueError, match="gain must be positive"):
        chords_counts_to_volts(np.array([100.0]), board.bits, board.vref, gain)


def test_chords_bad_board_specs_rejected():
    with pytest.raises(ValueError, match="board specs must be positive"):
        chords_counts_to_volts(np.array([100.0]), bits=0, vref=3.3, gain=100.0)
