// Canonical visual tokens per mind-state. Single source of truth — StateChip,
// StateTimeline, and MindStateCore all derive from this map so a state never
// renders with two different hues anywhere in the console.

import type { MindState } from "./ouija-data"

export interface StateVisual {
  /** CSS variable reference for SVG / inline-style consumers. */
  cssVar: string
  /** Tailwind text utility. */
  text: string
  /** Tailwind background utility (solid fill). */
  bg: string
  /** Tailwind border utility at chip opacity. */
  border: string
  /** Chip gradient classes. */
  gradient: string
  /** Glow drop-shadow (matches the state hue). */
  glow: string
}

export const STATE_VISUALS: Record<MindState, StateVisual> = {
  calm: {
    cssVar: "var(--color-state-calm)",
    text: "text-state-calm",
    bg: "bg-state-calm",
    border: "border-state-calm/40",
    gradient: "from-state-calm/22 via-state-calm/10 to-transparent",
    glow: "drop-shadow-[0_0_10px_rgba(185,140,230,0.5)]",
  },
  focused: {
    cssVar: "var(--color-state-focused)",
    text: "text-state-focused",
    bg: "bg-state-focused",
    border: "border-state-focused/40",
    gradient: "from-state-focused/22 via-state-focused/10 to-transparent",
    glow: "drop-shadow-[0_0_10px_rgba(248,32,144,0.55)]",
  },
  stressed: {
    cssVar: "var(--color-state-stressed)",
    text: "text-state-stressed",
    bg: "bg-state-stressed",
    border: "border-state-stressed/40",
    gradient: "from-state-stressed/22 via-state-stressed/10 to-transparent",
    glow: "drop-shadow-[0_0_10px_rgba(255,51,102,0.5)]",
  },
  fatigued: {
    cssVar: "var(--color-state-fatigued)",
    text: "text-state-fatigued",
    bg: "bg-state-fatigued",
    border: "border-state-fatigued/40",
    gradient: "from-state-fatigued/22 via-state-fatigued/10 to-transparent",
    glow: "drop-shadow-[0_0_10px_rgba(122,92,176,0.5)]",
  },
}

export const stateColor = (state: MindState) => STATE_VISUALS[state].cssVar
