// The distiller — turns raw multi-modal signals into palatable, actionable
// plain language for a normal person: the numbers are real, but what a
// layperson reads is a human sentence.
//
// Deterministic and offline by design (it always works, no API key, no network
// — robustness first). The shape is LLM-ready: swap `brainInsight` / `regionInsight`
// for a model call later and every consumer keeps working.

import type { MindState } from "./ouija-data"
import type { BrainRegion } from "./brain-atlas"
import type { SystemStatus } from "./modalities"

export interface Insight {
  /** One-line, human. */
  headline: string
  /** A sentence of context. */
  detail: string
  /** Something the person can actually do. */
  action: string
}

const STATE_INSIGHT: Record<MindState, Insight> = {
  focused: {
    headline: "You're locked in.",
    detail: "Focus is running high and steady — your attention networks are doing real work right now.",
    action: "Protect this window: silence notifications and take on your hardest task while it lasts.",
  },
  calm: {
    headline: "You're settled.",
    detail: "Low arousal, easy baseline — your mind is resting rather than pushing.",
    action: "Good for recovery. If you want to ramp up, a short walk or one easy first task will lift focus.",
  },
  stressed: {
    headline: "You're running hot.",
    detail: "Arousal is up and calm is low — your system is in high gear.",
    action: "Try slow exhales for two minutes; a short breathing reset reliably brings this down.",
  },
  fatigued: {
    headline: "You're running on reserves.",
    detail: "Focus and drive are both low — this reads as depletion, not laziness.",
    action: "A real break, water, or a short nap will do more for you than pushing through.",
  },
}

/** Whole-brain plain-language read. */
export function brainInsight(mindState: MindState, status: SystemStatus): Insight {
  const base = STATE_INSIGHT[mindState]
  if (status === "nominal") return base
  const note =
    status === "offline"
      ? " (No captures loaded yet — load your archive to start the read.)"
      : " (Reading from the captures online; include the rest for the full picture.)"
  return { ...base, detail: base.detail + note }
}

// ── Systemic reads (Body / Gut) — the brainstem anchors ────────────────────
// These modalities have no cortical region; they feed the whole system via the
// body-wide and gut-brain axes. Same plain-language contract as regions.

export interface SystemicRead {
  /** Accessible, human name for the anchor. */
  name: string
  /** What this axis is, in one plain phrase. */
  role: string
  /** The unit label shown next to the value. */
  metricLabel: string
  /** The plain-language read of the current value (or the "not fed" prompt). */
  insight: string
}

export type SystemicKind = "body" | "gut"

export function systemicRead(kind: SystemicKind, value: number | null): SystemicRead {
  const spec =
    kind === "body"
      ? { name: "Body", role: "whole-body vitality (weight, heart rate, vascular age)", metricLabel: "Vitality" }
      : { name: "Gut", role: "gut-brain axis (microbiome balance from your Viome read)", metricLabel: "Gut score" }
  if (value == null) {
    return {
      ...spec,
      insight: `Your ${spec.name.toLowerCase()} signal isn't loaded yet — include a ${
        kind === "body" ? "body-composition" : "gut"
      } source or upload a file to feed it.`,
    }
  }
  const level = value >= 0.66 ? "strong" : value >= 0.4 ? "steady" : "low"
  const read =
    kind === "body"
      ? level === "strong"
        ? "your body markers are in a good range — cardiovascular and composition are working for you"
        : level === "low"
          ? "your body markers are running below your usual — worth a closer look at sleep, recovery, and load"
          : "your body markers are holding at an everyday baseline"
      : level === "strong"
        ? "your microbiome is in a favorable balance — the gut-brain axis is on your side right now"
        : level === "low"
          ? "your gut score is low — diet and fiber shifts tend to move this the most"
          : "your gut balance is middling — small, consistent diet changes nudge it upward"
  return { ...spec, insight: `${spec.name} reads ${Math.round(value * 100)}% — ${read}.` }
}
const REGION_PLAIN: Record<string, string> = {
  prefrontal: "planning-and-reasoning center",
  "frontal-l": "focus-and-decisions center",
  "frontal-r": "attention-and-mood control",
  "central-l": "movement control (right side)",
  "central-r": "movement control (left side)",
  "parietal-l": "spatial-and-number sense",
  "parietal-r": "spatial awareness",
  "occipital-l": "vision center",
  "occipital-r": "vision center",
  "temporal-l": "language-and-memory area",
  "temporal-r": "sound-and-social area",
  cerebellum: "coordination-and-timing hub",
  limbic: "mood-and-drive core",
}

export function regionPlainRole(regionId: string): string {
  return REGION_PLAIN[regionId] ?? "brain region"
}

/** Plain-language, per-region read. */
export function regionInsight(
  region: BrainRegion,
  value: number | null,
  baseline: number | null,
  mindState: MindState,
): string {
  const role = regionPlainRole(region.id)
  if (value == null) {
    return `Your ${role} isn't being measured yet — include its data source to light it up.`
  }
  const level = value >= 0.66 ? "high" : value >= 0.4 ? "moderate" : "low"
  const activity = level === "high" ? "firing hot" : level === "low" ? "quiet" : "ticking along"
  let trend = ""
  if (baseline != null) {
    const d = value - baseline
    trend = d >= 0.03 ? ", and busier than your usual" : d <= -0.03 ? ", and calmer than your usual" : ""
  }
  const meaning = level === "high" ? region.high : level === "low" ? region.low : "steady, everyday activity"
  return `Your ${role} is ${activity}${trend} — that usually means ${meaning}. Right now your overall state reads ${mindState}.`
}
