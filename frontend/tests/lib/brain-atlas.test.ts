import { describe, expect, it } from "vitest"
import {
  BRAIN_REGIONS,
  CHANNEL_TO_REGIONS,
  regionContext,
  regionValue,
  regionValuesFromChannels,
} from "@/lib/brain-atlas"

describe("brain atlas", () => {
  it("every region has a 3D position and unique id", () => {
    const ids = new Set<string>()
    for (const r of BRAIN_REGIONS) {
      expect(r.pos).toHaveLength(3)
      r.pos.forEach((n) => expect(Number.isFinite(n)).toBe(true))
      expect(ids.has(r.id)).toBe(false)
      ids.add(r.id)
    }
  })

  it("maps Crown channels to regions", () => {
    expect(CHANNEL_TO_REGIONS["F5"]).toContain("frontal-l")
    expect(CHANNEL_TO_REGIONS["PO4"]).toContain("occipital-r")
  })

  it("region value is the mean of its channels", () => {
    const frontalL = BRAIN_REGIONS.find((r) => r.id === "frontal-l")!
    expect(regionValue(frontalL, { F5: 0.8 })).toBeCloseTo(0.8)
    const prefrontal = BRAIN_REGIONS.find((r) => r.id === "prefrontal")!
    expect(regionValue(prefrontal, { F5: 0.6, F6: 0.4 })).toBeCloseTo(0.5)
  })

  it("uncovered regions yield null and skip the value map", () => {
    const cerebellum = BRAIN_REGIONS.find((r) => r.id === "cerebellum")!
    expect(regionValue(cerebellum, { F5: 0.9 })).toBeNull()
    const rv = regionValuesFromChannels({ F5: 0.5 })
    expect(rv["frontal-l"]).toBeCloseTo(0.5)
    expect(rv["cerebellum"]).toBeUndefined()
  })

  it("regionContext is deterministic and data-aware", () => {
    const r = BRAIN_REGIONS.find((x) => x.id === "frontal-l")!
    const a = regionContext(r, 0.72, 0.6, "focused")
    const b = regionContext(r, 0.72, 0.6, "focused")
    expect(a).toBe(b)
    expect(a).toContain("Left Frontal")
    expect(a).toContain("72%")
    expect(a).toContain("FOCUSED")
    expect(a).toContain("▲12%")
  })

  it("regionContext explains uncovered regions", () => {
    const r = BRAIN_REGIONS.find((x) => x.id === "cerebellum")!
    expect(regionContext(r, null, null, "calm")).toContain("No direct EEG coverage")
  })
})
