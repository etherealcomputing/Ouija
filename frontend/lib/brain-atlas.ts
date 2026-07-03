// Brain atlas knowledge base + data→region mapping + offline context generator.
// ─────────────────────────────────────────────────────────────────────────
// The 3D scene renders one glowing node per region at `pos`. Each region maps
// to zero or more Neurosity Crown channels; its live value is the mean band
// power of those channels (or an uploaded value). `regionContext` weaves the
// curated function blurb with the actual numbers into a deterministic,
// data-aware paragraph — no LLM, no network.

import type { MindState } from "./ouija-data"

export type Hemisphere = "L" | "R" | "C"

export interface BrainRegion {
  id: string
  name: string
  short: string
  hemisphere: Hemisphere
  lobe: string
  /** Position on the stylized brain hull, roughly anatomical. x=L(-)/R(+), y=post(-)/ant(+), z=down(-)/up(+). */
  pos: [number, number, number]
  /** Neurosity Crown channels overlying this region (empty = no direct EEG coverage). */
  channels: string[]
  /** One-line functional summary. */
  func: string
  /** What elevated / suppressed activity here tends to indicate. */
  high: string
  low: string
}

// 13 regions across a stylized brain. Only the 8 Crown channels
// (CP3,C3,F5,PO3,PO4,F6,C4,CP4) provide direct EEG coverage; the rest await
// imaging-derived values (uploaded).
export const BRAIN_REGIONS: BrainRegion[] = [
  { id: "frontal-l", name: "Left Frontal", short: "F-L", hemisphere: "L", lobe: "Frontal", pos: [-0.5, 0.85, 0.38], channels: ["F5"], func: "Executive function, working memory, voluntary attention.", high: "active goal-directed engagement", low: "disengagement or mental fatigue" },
  { id: "frontal-r", name: "Right Frontal", short: "F-R", hemisphere: "R", lobe: "Frontal", pos: [0.5, 0.85, 0.38], channels: ["F6"], func: "Sustained attention, inhibitory control, mood regulation.", high: "vigilant, effortful control", low: "reduced inhibition or low arousal" },
  { id: "central-l", name: "Left Central", short: "C-L", hemisphere: "L", lobe: "Sensorimotor", pos: [-0.62, 0.08, 0.78], channels: ["C3"], func: "Motor planning and sensorimotor integration (right-hand).", high: "motor readiness / movement", low: "sensorimotor idling (mu rhythm)" },
  { id: "central-r", name: "Right Central", short: "C-R", hemisphere: "R", lobe: "Sensorimotor", pos: [0.62, 0.08, 0.78], channels: ["C4"], func: "Motor planning and sensorimotor integration (left-hand).", high: "motor readiness / movement", low: "sensorimotor idling (mu rhythm)" },
  { id: "parietal-l", name: "Left Parietal", short: "P-L", hemisphere: "L", lobe: "Parietal", pos: [-0.56, -0.5, 0.62], channels: ["CP3"], func: "Spatial attention, sensory integration, number sense.", high: "active spatial / integrative processing", low: "reduced sensory binding" },
  { id: "parietal-r", name: "Right Parietal", short: "P-R", hemisphere: "R", lobe: "Parietal", pos: [0.56, -0.5, 0.62], channels: ["CP4"], func: "Spatial awareness, attention orienting, body schema.", high: "orienting to salient input", low: "narrowed spatial awareness" },
  { id: "occipital-l", name: "Left Occipital", short: "O-L", hemisphere: "L", lobe: "Occipital", pos: [-0.34, -0.96, 0.16], channels: ["PO3"], func: "Visual processing; alpha rhythm generator.", high: "eyes-closed alpha / visual rest", low: "active visual engagement" },
  { id: "occipital-r", name: "Right Occipital", short: "O-R", hemisphere: "R", lobe: "Occipital", pos: [0.34, -0.96, 0.16], channels: ["PO4"], func: "Visual processing; alpha rhythm generator.", high: "eyes-closed alpha / visual rest", low: "active visual engagement" },
  { id: "temporal-l", name: "Left Temporal", short: "T-L", hemisphere: "L", lobe: "Temporal", pos: [-0.97, 0.08, -0.22], channels: [], func: "Language comprehension, auditory processing, verbal memory.", high: "language / auditory engagement", low: "auditory rest" },
  { id: "temporal-r", name: "Right Temporal", short: "T-R", hemisphere: "R", lobe: "Temporal", pos: [0.97, 0.08, -0.22], channels: [], func: "Prosody, music, facial and social processing.", high: "social / prosodic processing", low: "auditory rest" },
  { id: "cerebellum", name: "Cerebellum", short: "CB", hemisphere: "C", lobe: "Cerebellum", pos: [0, -0.86, -0.56], channels: [], func: "Motor coordination, timing, and cognitive sequencing.", high: "coordinated timing / learning", low: "reduced motor tuning" },
  { id: "limbic", name: "Limbic / Midline", short: "LM", hemisphere: "C", lobe: "Limbic", pos: [0, -0.08, -0.34], channels: [], func: "Emotion, memory encoding, autonomic regulation.", high: "emotional / autonomic arousal", low: "affective calm" },
  { id: "prefrontal", name: "Prefrontal Pole", short: "PF", hemisphere: "C", lobe: "Frontal", pos: [0, 0.98, 0.14], channels: ["F5", "F6"], func: "Abstract reasoning, planning, self-referential thought.", high: "deliberate reasoning / planning", low: "mind-wandering or fatigue" },
]

export const CHANNEL_TO_REGIONS: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {}
  for (const r of BRAIN_REGIONS) {
    for (const ch of r.channels) {
      ;(map[ch] ??= []).push(r.id)
    }
  }
  return map
})()

/** Edges for the connectome arcs (visual): connect neighbouring regions. */
export const ATLAS_EDGES: [string, string][] = [
  ["prefrontal", "frontal-l"], ["prefrontal", "frontal-r"],
  ["frontal-l", "central-l"], ["frontal-r", "central-r"],
  ["central-l", "parietal-l"], ["central-r", "parietal-r"],
  ["parietal-l", "occipital-l"], ["parietal-r", "occipital-r"],
  ["frontal-l", "temporal-l"], ["frontal-r", "temporal-r"],
  ["temporal-l", "limbic"], ["temporal-r", "limbic"],
  ["occipital-l", "cerebellum"], ["occipital-r", "cerebellum"],
  ["limbic", "cerebellum"],
]

/** Mean of a region's channel values, or null when it has no direct coverage. */
export function regionValue(region: BrainRegion, channelValues: Record<string, number>): number | null {
  const vals = region.channels.map((c) => channelValues[c]).filter((v): v is number => typeof v === "number")
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/** Compute a region→value map from a channel→value map. */
export function regionValuesFromChannels(channelValues: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of BRAIN_REGIONS) {
    const v = regionValue(r, channelValues)
    if (v != null) out[r.id] = v
  }
  return out
}

function band(value: number): "elevated" | "moderate" | "low" {
  if (value >= 0.66) return "elevated"
  if (value >= 0.4) return "moderate"
  return "low"
}

/**
 * Deterministic, data-aware context for a region. Weaves the curated function
 * blurb with the live/uploaded numbers. Pure — same inputs → same string.
 */
export function regionContext(
  region: BrainRegion,
  value: number | null,
  baseline: number | null,
  mindState: MindState,
): string {
  if (value == null) {
    return `${region.name} (${region.lobe}). ${region.func} No direct EEG coverage in the 8-channel Crown montage — drop an imaging-derived values file to light this region up.`
  }
  const pct = Math.round(value * 100)
  const chan = region.channels.length ? `Channel ${region.channels.join(" / ")} · ` : ""
  let trend = ""
  if (baseline != null) {
    const d = Math.round((value - baseline) * 100)
    trend = d >= 3 ? `, ▲${d}% vs. your session baseline` : d <= -3 ? `, ▼${Math.abs(d)}% vs. your session baseline` : ", steady vs. baseline"
  }
  const b = band(value)
  const readout = b === "elevated" ? region.high : b === "low" ? region.low : "moderate activity"
  const stateNote = ` Consistent with a ${mindState.toUpperCase()} mind-state.`
  return `${region.name} (${region.lobe}). ${region.func} ${chan}${pct}% band power${trend} — ${b}, suggesting ${readout}.${stateNote}`
}
