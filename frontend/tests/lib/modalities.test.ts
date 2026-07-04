import { describe, expect, it } from "vitest"
import { MODALITIES, REGION_MODALITY, systemStatus, type ModalityId } from "@/lib/modalities"
import { BRAIN_REGIONS } from "@/lib/brain-atlas"

describe("modalities", () => {
  it("every modality's regions reference real brain regions", () => {
    const ids = new Set(BRAIN_REGIONS.map((r) => r.id))
    for (const m of MODALITIES) {
      for (const r of m.regions) expect(ids.has(r)).toBe(true)
    }
  })

  it("every brain region is powered by exactly one modality", () => {
    for (const r of BRAIN_REGIONS) {
      expect(REGION_MODALITY[r.id]).toBeDefined()
    }
    // Region assignments are disjoint (no region claimed by two modalities).
    const counts: Record<string, number> = {}
    for (const m of MODALITIES) for (const r of m.regions) counts[r] = (counts[r] ?? 0) + 1
    for (const n of Object.values(counts)) expect(n).toBe(1)
  })

  it("systemStatus reflects how many required modalities are live", () => {
    // All required modalities live → nominal (derived from MODALITIES so adding
    // a modality can't silently break the nominal contract).
    const all = new Set<ModalityId>(MODALITIES.filter((m) => m.required).map((m) => m.id))
    expect(systemStatus(new Set())).toBe("offline")
    expect(systemStatus(new Set<ModalityId>(["eeg"]))).toBe("partial")
    expect(systemStatus(new Set<ModalityId>(["eeg", "cardiac"]))).toBe("partial")
    expect(systemStatus(all)).toBe("nominal")
    // Missing one required modality → not nominal.
    const allButGut = new Set(all)
    allButGut.delete("gut")
    expect(systemStatus(allButGut)).toBe("partial")
  })
})
