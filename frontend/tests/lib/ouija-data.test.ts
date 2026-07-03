import { describe, expect, it } from "vitest"
import {
  deriveConfidence,
  deriveMindState,
  MIND_STATES,
  STATE_FLOW,
  STATE_DIMENSIONS,
  type MindState,
} from "@/lib/ouija-data"
import { STATE_VISUALS } from "@/lib/state-visuals"
import { NAVIGATION } from "@/lib/views"

describe("deriveMindState", () => {
  it("classifies high focus + adequate calm as focused", () => {
    expect(deriveMindState(0.6, 0.8)).toBe("focused")
  })
  it("classifies low calm as stressed", () => {
    expect(deriveMindState(0.2, 0.5)).toBe("stressed")
  })
  it("classifies low focus + low-mid calm as fatigued", () => {
    expect(deriveMindState(0.5, 0.2)).toBe("fatigued")
  })
  it("falls back to calm otherwise", () => {
    expect(deriveMindState(0.75, 0.45)).toBe("calm")
  })
  it("is a total function over the unit square", () => {
    const valid = new Set(STATE_FLOW)
    for (let c = 0; c <= 1.0001; c += 0.1) {
      for (let f = 0; f <= 1.0001; f += 0.1) {
        expect(valid.has(deriveMindState(c, f))).toBe(true)
      }
    }
  })
})

describe("deriveConfidence", () => {
  it("maps signal quality to a band", () => {
    expect(deriveConfidence(0.9)).toBe("high")
    expect(deriveConfidence(0.5)).toBe("medium")
    expect(deriveConfidence(0.1)).toBe("low")
  })
})

describe("registries", () => {
  it("every mind-state has metadata, dimensions and visuals", () => {
    for (const state of STATE_FLOW as MindState[]) {
      expect(MIND_STATES[state].label).toBeTruthy()
      expect(STATE_DIMENSIONS[state]).toBeDefined()
      expect(STATE_VISUALS[state].cssVar).toContain("--color-state-")
    }
  })
  it("dimensions are all within [0,1]", () => {
    for (const dims of Object.values(STATE_DIMENSIONS)) {
      for (const v of Object.values(dims)) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })
  it("navigation shortcuts are unique", () => {
    const shortcuts = NAVIGATION.map((n) => n.shortcut).filter(Boolean)
    expect(new Set(shortcuts).size).toBe(shortcuts.length)
  })
})
