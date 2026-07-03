import { describe, expect, it } from "vitest"
import { parseUpload } from "@/lib/uploads"

describe("parseUpload", () => {
  it("parses channel-keyed JSON and derives region values", () => {
    const r = parseUpload(JSON.stringify({ F5: 0.8, F6: 0.4, CP3: 0.6 }), "eeg.json")
    expect(r.channelValues["F5"]).toBeCloseTo(0.8)
    expect(r.regionValues["frontal-l"]).toBeCloseTo(0.8)
    expect(r.regionValues["parietal-l"]).toBeCloseTo(0.6)
  })

  it("parses channel-keyed CSV with a header row", () => {
    const csv = "channel,value\nF5,70\nF6,30\nCP4,50"
    const r = parseUpload(csv, "eeg.csv")
    // 0–100 range is normalized to 0–1.
    expect(r.regionValues["frontal-l"]).toBeCloseTo(0.7)
    expect(r.regionValues["parietal-r"]).toBeCloseTo(0.5)
  })

  it("parses region-keyed JSON directly", () => {
    const r = parseUpload(JSON.stringify({ regions: { "cerebellum": 0.3, "limbic": 0.9 } }), "regions.json")
    expect(r.regionValues["cerebellum"]).toBeCloseTo(0.3)
    expect(r.regionValues["limbic"]).toBeCloseTo(0.9)
  })

  it("normalizes raw magnitudes into 0–1", () => {
    const r = parseUpload(JSON.stringify({ F5: 10, F6: 20, CP3: 30 }), "raw.json")
    for (const v of Object.values(r.regionValues)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it("rejects files with no recognized ids", () => {
    expect(() => parseUpload(JSON.stringify({ foo: 1, bar: 2 }), "x.json")).toThrow()
  })

  it("rejects empty / non-numeric files", () => {
    expect(() => parseUpload("", "x.csv")).toThrow()
  })
})
