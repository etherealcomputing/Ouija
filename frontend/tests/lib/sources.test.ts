import { describe, expect, it } from "vitest"
import { composeIncluded, groupByModality, type SourceEntry } from "@/lib/sources"

const base: Omit<SourceEntry, "id" | "modality" | "app_values"> = {
  label: "x", rel_path: "x", fmt: "F", kind: "derived", size_bytes: 0,
  converter: null, app_output: "region-values", status: "app-ready", note: "", tags: [],
}

const src = (id: string, modality: SourceEntry["modality"], app_values: SourceEntry["app_values"]): SourceEntry =>
  ({ ...base, id, modality, app_values })

describe("composeIncluded", () => {
  it("merges region-values from multiple sources; later wins on collision", () => {
    const c = composeIncluded([
      src("eeg", "eeg", { type: "region-values", regionValues: { "frontal-l": 0.7, "central-l": 0.4 } }),
      src("img", "imaging", { type: "region-values", regionValues: { "temporal-l": 0.3, "frontal-l": 0.9 } }),
    ])
    expect(c.regionValues["central-l"]).toBeCloseTo(0.4)
    expect(c.regionValues["temporal-l"]).toBeCloseTo(0.3)
    expect(c.regionValues["frontal-l"]).toBeCloseTo(0.9) // later source wins
    expect(c.modalities.has("eeg")).toBe(true)
    expect(c.modalities.has("imaging")).toBe(true)
  })

  it("derives region values from channel values", () => {
    const c = composeIncluded([src("eeg", "eeg", { type: "region-values", channelValues: { F5: 0.8 } })])
    // F5 → frontal-l via regionValuesFromChannels
    expect(c.regionValues["frontal-l"]).toBeCloseTo(0.8)
    expect(c.channelValues["F5"]).toBeCloseTo(0.8)
  })

  it("captures gut score, body value, and the first replay hint", () => {
    const c = composeIncluded([
      src("gut", "gut", { type: "gut-scores", scores: { gut_microbiome_health: 0.8 }, gutScore: 0.74 }),
      src("body", "body", { type: "phenotype", metrics: { weight_kg: 75 }, bodyValue: 0.72 }),
      src("eeg", "eeg", { type: "region-values", regionValues: { "frontal-l": 0.6 }, replay: { channelNames: ["F5"], bandSeries: [[0.5]] } }),
    ])
    expect(c.gutScore).toBeCloseTo(0.74)
    expect(c.bodyValue).toBeCloseTo(0.72)
    expect(c.replay?.channelNames).toEqual(["F5"])
  })

  it("ignores sources without app_values", () => {
    const c = composeIncluded([src("raw", "eeg", null)])
    expect(Object.keys(c.regionValues)).toHaveLength(0)
    expect(c.gutScore).toBeNull()
  })
})

describe("groupByModality", () => {
  it("groups in canonical modality order", () => {
    const groups = groupByModality([
      src("g", "gut", null), src("e", "eeg", null), src("i", "imaging", null),
    ])
    expect(groups.map((g) => g.modality)).toEqual(["eeg", "imaging", "gut"])
  })
})
