"""Tests for the source manifest generator + anonymization. Synthetic only."""

from __future__ import annotations

from converters.build_manifest import anonymize_manifest, build_manifest


def _archive(tmp_path):
    (tmp_path / "eeg").mkdir()
    (tmp_path / "gut").mkdir()
    (tmp_path / "eeg" / "neurosity_crown_rest_20260705.edf").write_text("x")
    (tmp_path / "eeg" / "neurosity_crown_rest_20260708.csv").write_text("x")
    # An app-ready source via its sidecar.
    (tmp_path / "gut" / "viome_gut_20260515.json").write_text("{}")
    (tmp_path / "gut" / "viome_gut_20260515.json.app.json").write_text(
        '{"type":"gut-scores","scores":{"gut_microbiome_health":0.8},"gutScore":0.8}'
    )
    return tmp_path


def test_build_manifest_indexes_and_classifies(tmp_path):
    m = _archive(tmp_path)
    manifest = build_manifest(m)
    assert manifest["manifestVersion"] == 2
    assert manifest["counts"]["files"] == 3  # sidecar excluded
    labels = {s["label"] for s in manifest["sources"]}
    assert any("viome_gut" in l for l in labels)
    gut = next(s for s in manifest["sources"] if s["modality"] == "gut")
    assert gut["status"] == "app-ready" and gut["app_values"]["type"] == "gut-scores"
    assert gut["date"] == "2026-05-15"


def test_anonymize_removes_identifiers_and_dateshifts(tmp_path):
    manifest = build_manifest(_archive(tmp_path))
    anon = anonymize_manifest(manifest)

    assert anon["anonymized"] is True
    assert anon["root"] == "archive"
    for s in anon["sources"]:
        # No filenames, no folder structure, no absolute dates.
        assert s["date"] is None
        assert "20260" not in s["label"]  # no date digits leaked into labels
        assert s["rel_path"] == f"{s['modality']}/{s['id']}"
        assert s["id"].startswith(s["modality"])
        # de-identified derived values are preserved verbatim.
    gut = next(s for s in anon["sources"] if s["modality"] == "gut")
    assert gut["app_values"]["gutScore"] == 0.8
    # Relative day offsets preserve the cadence: earliest = day 0.
    offsets = [s["day_offset"] for s in anon["sources"] if s["day_offset"] is not None]
    assert min(offsets) == 0
