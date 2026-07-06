"""Error-path robustness tests for the Withings getmeas loader.

A malformed export must raise a clear, located ValueError naming the file and
the offending group/measure — never a bare KeyError / ValueError from deep
inside the decode.
"""

from __future__ import annotations

import json

import pytest

from converters.withings.withings import load_withings_json


def _write(tmp_path, payload, *, raw=None):
    p = tmp_path / "getmeas.json"
    p.write_text(raw if raw is not None else json.dumps(payload))
    return p


def test_invalid_json_is_clear(tmp_path):
    p = _write(tmp_path, None, raw="{not json")
    with pytest.raises(ValueError, match="not valid JSON"):
        load_withings_json(p)


def test_non_object_payload_rejected(tmp_path):
    p = _write(tmp_path, [1, 2, 3])
    with pytest.raises(ValueError, match="expected a getmeas object"):
        load_withings_json(p)


def test_measuregrps_not_a_list_rejected(tmp_path):
    p = _write(tmp_path, {"body": {"measuregrps": {"oops": 1}}})
    with pytest.raises(ValueError, match="'measuregrps' must be a list"):
        load_withings_json(p)


def test_empty_measuregrps_is_ok(tmp_path):
    p = _write(tmp_path, {"body": {"measuregrps": []}})
    assert load_withings_json(p) == []


def test_bad_date_reports_group(tmp_path):
    p = _write(tmp_path, {"body": {"measuregrps": [{"date": "yesterday", "measures": []}]}})
    with pytest.raises(ValueError, match=r"measuregrps\[0\].date is not a valid epoch"):
        load_withings_json(p)


def test_measure_missing_value_reports_location(tmp_path):
    p = _write(tmp_path, {"body": {"measuregrps": [{"date": 1767225600, "measures": [{"type": 1}]}]}})
    with pytest.raises(ValueError, match=r"measuregrps\[0\].measures\[0\] missing 'type' or 'value'"):
        load_withings_json(p)


def test_measure_non_numeric_reports_location(tmp_path):
    p = _write(
        tmp_path,
        {"body": {"measuregrps": [{"date": 1767225600, "measures": [{"type": 1, "value": "heavy"}]}]}},
    )
    with pytest.raises(ValueError, match=r"measuregrps\[0\].measures\[0\] has non-numeric fields"):
        load_withings_json(p)


def test_unknown_measure_type_is_skipped_not_errored(tmp_path):
    p = _write(
        tmp_path,
        {"body": {"measuregrps": [{"date": 1767225600, "measures": [
            {"type": 999, "value": 1, "unit": 0},
            {"type": 1, "value": 75000, "unit": -3},
        ]}]}},
    )
    rows = load_withings_json(p)
    assert rows[0]["weight_kg"] == 75.0
    assert "999" not in rows[0]


def test_bare_measuregrps_envelope_accepted(tmp_path):
    # No "body" wrapper — the loader accepts the bare form too.
    p = _write(tmp_path, {"measuregrps": [{"date": 1767225600, "measures": [{"type": 1, "value": 70000, "unit": -3}]}]})
    rows = load_withings_json(p)
    assert rows[0]["weight_kg"] == 70.0
