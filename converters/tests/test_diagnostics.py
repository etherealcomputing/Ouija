"""Tests for the hardware/connector diagnostics harness.

Three layers, all on synthetic data:
  • unit      — the reusable signal-integrity primitives (finite / range / sidecar)
  • smoke     — every registered connector runs green end-to-end
  • regression— fault injection proves the diagnostic actually *fails* when a
                connector is broken (a self-test that can't fail is worthless)
"""

from __future__ import annotations

import json

import numpy as np
import pytest

from converters import diagnostics as dg


# ── unit: signal-integrity primitives ─────────────────────────────────────
def test_check_finite_passes_on_clean_array():
    assert dg.check_finite(np.zeros((4, 100))).passed


def test_check_finite_flags_nan_and_inf():
    a = np.zeros((2, 10))
    a[0, 0] = np.nan
    a[1, 1] = np.inf
    c = dg.check_finite(a)
    assert not c.passed
    assert "2" in c.detail  # counts both bad samples


def test_biopotential_range_accepts_microvolt_eeg():
    # 30 µV sinusoid across 4 channels → well inside the physiological band.
    t = np.linspace(0, 1, 256)
    data = np.vstack([np.sin(2 * np.pi * 10 * t) * 30e-6 for _ in range(4)])
    assert dg.check_biopotential_range(data).passed


def test_biopotential_range_rejects_volts_scale():
    # A connector that forgot to scale counts→volts would emit ~volt-level values.
    data = np.ones((4, 100)) * 2.0  # 2 V — impossible for EEG
    assert not dg.check_biopotential_range(data).passed


def test_biopotential_range_rejects_dead_channel():
    data = np.zeros((4, 100))  # flat line, no signal
    assert not dg.check_biopotential_range(data).passed


def test_sidecar_fields_reports_missing(tmp_path):
    (tmp_path / "sub-01_eeg.json").write_text(json.dumps({"Manufacturer": "X"}))
    c = dg._sidecar_fields(tmp_path, "eeg", ["Manufacturer", "PowerLineFrequency"])
    assert not c.passed
    assert "PowerLineFrequency" in c.detail


def test_sidecar_fields_passes_when_complete(tmp_path):
    (tmp_path / "sub-01_eeg.json").write_text(json.dumps({"Manufacturer": "X", "PowerLineFrequency": 60}))
    assert dg._sidecar_fields(tmp_path, "eeg", ["Manufacturer", "PowerLineFrequency"]).passed


# ── smoke: every connector runs green ─────────────────────────────────────
def test_registry_is_wired():
    keys = {c.key for c in dg.CONNECTORS}
    # Every documented device connector is present.
    assert {"crown", "pieeg", "chords", "fnirs", "imaging", "spect", "withings"} <= keys


@pytest.mark.parametrize("conn", dg.CONNECTORS, ids=lambda c: c.key)
def test_connector_diagnostic_passes(conn):
    result = dg.run_connector(conn)
    assert result.status == "ok", f"{conn.name}: {result.message}"
    assert result.checks, "a connector with no checks is not a diagnostic"
    assert all(c.passed for c in result.checks)
    assert result.duration_s >= 0.0


def test_run_diagnostics_all_healthy():
    results = dg.run_diagnostics()
    assert len(results) == len(dg.CONNECTORS)
    assert all(r.ok for r in results)


def test_run_diagnostics_filter_by_group():
    eeg = dg.run_diagnostics(only="eeg")
    assert {r.connector for r in eeg} == {"Neurosity Crown", "PiEEG (ADS1299)", "Upside Down Labs / Chords"}
    one = dg.run_diagnostics(only="withings")
    assert len(one) == 1 and one[0].connector == "Withings Body Scan"


# ── regression: the diagnostic must catch a broken connector ──────────────
def test_broken_connector_is_reported_as_error():
    def _explode(root):
        raise RuntimeError("simulated device failure")

    conn = dg.Connector("boom", "Broken Device", "EEG", "eeg/", "eeg", _explode)
    result = dg.run_connector(conn)
    assert result.status == "error"
    assert "simulated device failure" in result.message
    assert not result.ok


def test_failing_check_marks_connector_fail():
    def _bad_range(root):
        # Real-looking checks but with a units bug the range check must catch.
        return [dg.check_biopotential_range(np.ones((4, 10)) * 3.0)], {}

    conn = dg.Connector("mis", "Mis-scaled", "EEG", "eeg/", "eeg", _bad_range)
    result = dg.run_connector(conn)
    assert result.status == "fail"
    assert "biopotential_range" in result.message


def test_format_report_and_exit_semantics():
    results = dg.run_diagnostics(only="body")
    text = dg.format_report(results, verbose=True)
    assert "Withings Body Scan" in text
    assert "connectors healthy" in text
