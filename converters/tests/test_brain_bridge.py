"""Python side of the SPECT → frontend brain-bridge contract.

`spect_to_derivatives` emits a region-values JSON that the frontend Upload
dropzone (frontend/lib/uploads.ts) consumes to light the imaging-only brain
regions. This test re-locks that contract: it regenerates the values from the
real converter and asserts they match the checked-in golden fixture that the
frontend e2e test (frontend/tests/e2e/spect-brain-bridge.test.ts) reads.

If the converter's output shape or values drift, both this test and the
frontend e2e break — the bridge cannot silently rot on either side.
"""

from __future__ import annotations

import json
from pathlib import Path

from converters.imaging.imaging import region_values_from_volume, simulate_volume
from converters.imaging.spect_to_derivatives import write_spect_derivatives

# converters/tests/ -> repo root -> tests/fixtures/
GOLDEN = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "spect_regions.golden.json"
IMAGING_REGIONS = {"temporal-l", "temporal-r", "cerebellum"}


def test_region_values_match_golden_fixture():
    values = region_values_from_volume(simulate_volume(seed=0))
    golden = json.loads(GOLDEN.read_text())
    assert set(values) == IMAGING_REGIONS
    assert values == golden, (
        "converter output drifted from the golden brain-bridge fixture; "
        "regenerate tests/fixtures/spect_regions.golden.json and update the "
        "frontend e2e expectations together."
    )


def test_full_spect_path_writes_bridge_file(tmp_path):
    out = write_spect_derivatives(simulate_volume(seed=0), tmp_path, subject="01", session="diag")
    on_disk = json.loads(Path(out["region_values"]).read_text())
    assert set(on_disk) == IMAGING_REGIONS
    assert all(0.0 <= v <= 1.0 for v in on_disk.values())
    assert on_disk == json.loads(GOLDEN.read_text())
