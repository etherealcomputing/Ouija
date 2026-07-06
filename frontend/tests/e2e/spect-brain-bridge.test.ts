// End-to-end contract test for the Python → frontend "brain bridge".
// ─────────────────────────────────────────────────────────────────────────
// converters/imaging/spect_to_derivatives.py emits a region-values JSON in the
// exact shape frontend/lib/uploads.ts accepts, so a SPECT scan can light the
// imaging-only regions (temporal-l/-r, cerebellum — the ones EEG can't reach)
// on the God-View 3D brain. This test feeds the *actual converter output*
// (checked in as a golden fixture, regenerated & re-locked by the Python side
// in converters/tests/test_brain_bridge.py) through the real parseUpload and
// asserts the bridge lights exactly those regions.
//
// This is the integration the README claimed a Playwright check covered but
// which never existed — pinned here across the language boundary by one shared
// artifact, no flaky browser.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { parseUpload } from "@/lib/uploads"
import { REGION_MODALITY } from "@/lib/modalities"

const GOLDEN = join(__dirname, "../../../tests/fixtures/spect_regions.golden.json")
const IMAGING_REGIONS = ["temporal-l", "temporal-r", "cerebellum"]

describe("SPECT → brain bridge (converter output → parseUpload)", () => {
  const text = readFileSync(GOLDEN, "utf8")

  it("the golden fixture is the imaging-region contract", () => {
    const obj = JSON.parse(text)
    expect(Object.keys(obj).sort()).toEqual([...IMAGING_REGIONS].sort())
    // Every region is imaging-powered on the frontend side.
    for (const id of IMAGING_REGIONS) expect(REGION_MODALITY[id]).toBe("imaging")
  })

  it("parseUpload lights exactly the imaging regions", () => {
    const parsed = parseUpload(text, "spect_regions.golden.json")
    expect(Object.keys(parsed.regionValues).sort()).toEqual([...IMAGING_REGIONS].sort())
    for (const id of IMAGING_REGIONS) {
      expect(parsed.regionValues[id]).toBeGreaterThanOrEqual(0)
      expect(parsed.regionValues[id]).toBeLessThanOrEqual(1)
    }
    // Region-keyed upload → no channel interpretation, no spurious warnings.
    expect(parsed.channelValues).toEqual({})
    expect(parsed.warnings).toHaveLength(0)
  })

  it("preserves the converter's relative activation ordering", () => {
    // temporal-r > temporal-l > cerebellum in the synthetic volume; the bridge
    // must not reorder or renormalize away that structure.
    const { regionValues } = parseUpload(text)
    expect(regionValues["temporal-r"]).toBeGreaterThan(regionValues["cerebellum"])
    expect(regionValues["temporal-l"]).toBeGreaterThan(regionValues["cerebellum"])
  })
})
