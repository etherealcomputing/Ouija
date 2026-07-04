import { describe, expect, it } from "vitest"
import { parseViome, looksLikeViome, VIOME_SCORES } from "@/lib/viome"

describe("parseViome", () => {
  it("parses a Viome JSON report (0–100) into normalized 0–1 scores", () => {
    const r = parseViome(
      JSON.stringify({
        "Gut Microbiome Health": 82,
        "Metabolic Fitness": 74,
        "Inflammatory Activity": 61,
      }),
      "viome.json",
    )
    expect(r.scores["gut_microbiome_health"]).toBeCloseTo(0.82)
    expect(r.scores["metabolic_fitness"]).toBeCloseTo(0.74)
    expect(r.gutScore).toBeCloseTo((0.82 + 0.74 + 0.61) / 3)
    expect(r.label).toBe("viome.json")
  })

  it("parses a scores-wrapped JSON and CSV alike", () => {
    const wrapped = parseViome(JSON.stringify({ scores: { gut_microbiome_health: 90 } }), "w.json")
    expect(wrapped.scores["gut_microbiome_health"]).toBeCloseTo(0.9)

    const csv = parseViome("score,value\nGut Microbiome Health,88\nDigestive Efficiency,70", "v.csv")
    expect(csv.scores["gut_microbiome_health"]).toBeCloseTo(0.88)
    expect(csv.scores["digestive_efficiency"]).toBeCloseTo(0.7)
  })

  it("accepts already-normalized 0–1 values", () => {
    const r = parseViome(JSON.stringify({ gut_microbiome_health: 0.5, metabolic_fitness: 0.9 }), "n.json")
    expect(r.scores["gut_microbiome_health"]).toBeCloseTo(0.5)
    expect(r.scores["metabolic_fitness"]).toBeCloseTo(0.9)
  })

  it("warns on unrecognized fields but keeps recognized ones", () => {
    const r = parseViome(JSON.stringify({ gut_microbiome_health: 80, metabolic_fitness: 70, mystery: 5 }), "m.json")
    expect(Object.keys(r.scores).length).toBe(2)
    expect(r.warnings.some((w) => /unrecognized/i.test(w))).toBe(true)
  })

  it("throws when no recognized Viome scores are present", () => {
    expect(() => parseViome(JSON.stringify({ F5: 0.8, CP3: 0.4 }), "eeg.json")).toThrow(/Viome/i)
  })

  it("looksLikeViome detects a report by recognized keys", () => {
    expect(looksLikeViome({ gut_microbiome_health: 80, metabolic_fitness: 70 })).toBe(true)
    expect(looksLikeViome({ F5: 0.8 })).toBe(false)
  })

  it("exposes a canonical score panel", () => {
    expect(VIOME_SCORES.map((s) => s.key)).toContain("gut_microbiome_health")
  })
})
