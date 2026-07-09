// The Ouija motion system — one source of truth for durations, easings, spring
// presets, interaction feedback, and reusable variants. Before this, framer
// transitions were scattered magic numbers (0.25 vs 0.26 vs 0.3…) with no
// press states and no reduced-motion gating. Everything animated should pull
// from here so the whole surface feels like one instrument.
//
// CSS twins of the duration/easing scale live in app/globals.css (@theme:
// --dur-* / --ease-*) for the class-based (non-framer) controls.

import { useReducedMotion, type Transition, type Variants } from "framer-motion"

type Bezier = [number, number, number, number]

/** Duration scale (seconds). fast=micro feedback, base=most transitions,
 *  slow=entrances, slower=value roll-ups. */
export const DUR = { fast: 0.12, base: 0.2, slow: 0.32, slower: 0.45 } as const

/** House easing curves. */
export const EASE: Record<"standard" | "emphasized" | "exit", Bezier> = {
  standard: [0.4, 0, 0.2, 1], // symmetric in/out — the default
  emphasized: [0.2, 0, 0, 1], // decelerate — entrances land softly
  exit: [0.4, 0, 1, 1], // accelerate — exits leave quickly
}

/** Named spring presets. `glide` matches the planchette's proven feel. */
export const SPRING: Record<"snappy" | "glide" | "soft", Transition> = {
  snappy: { type: "spring", stiffness: 420, damping: 34, mass: 0.7 },
  glide: { type: "spring", stiffness: 260, damping: 26 },
  soft: { type: "spring", stiffness: 180, damping: 24 },
}

/** Common transitions built from the scale above. */
export const T: Record<"base" | "enter" | "exit", Transition> = {
  base: { duration: DUR.base, ease: EASE.standard },
  enter: { duration: DUR.slow, ease: EASE.emphasized },
  exit: { duration: DUR.fast, ease: EASE.exit },
}

/** Interaction feedback. PRESS = the 1px dip on click; LIFT = hover elevation. */
export const PRESS = { scale: 0.975, y: 0.5 } as const
export const PRESS_SOFT = { scale: 0.985 } as const
export const LIFT = { y: -2 } as const
export const LIFT_CARD = { y: -3 } as const

/** Reusable entrance/exit variants (pair with `initial="hidden" animate="show"`). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: T.enter },
  exit: { opacity: 0, y: -8, transition: T.exit },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  show: { opacity: 1, scale: 1, transition: T.enter },
  exit: { opacity: 0, scale: 0.98, transition: T.exit },
}

/** A container that cascades its children in. Default 30ms stagger — enough to
 *  read as a wave, quick enough to never feel slow. */
export const staggerContainer = (stagger = 0.03, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
  exit: {},
})

/** Motion-free variants for the reduced-motion path (opacity only, no transform). */
const REDUCED_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
}

/**
 * The reduced-motion gate. framer's CSS reduced-motion query only covers CSS
 * animations — the JS/framer motion (entrances, springs, ambient loops) is NOT
 * covered unless we check here. Every animated component should read this and
 * neutralize accordingly.
 */
export function useMotionPrefs() {
  const reduced = useReducedMotion() ?? false
  return {
    reduced,
    /** A duration that collapses to 0 when the user prefers reduced motion. */
    dur: (d: number) => (reduced ? 0 : d),
    /** Pass a transition through, or make it instant under reduced motion. */
    t: (transition: Transition): Transition => (reduced ? { duration: 0 } : transition),
    /** whileTap value, or undefined (no transform) under reduced motion. */
    press: reduced ? undefined : PRESS,
    /** whileHover value, or undefined under reduced motion. */
    lift: reduced ? undefined : LIFT,
    /** Swap any variant set for the opacity-only reduced set when appropriate. */
    variants: (v: Variants): Variants => (reduced ? REDUCED_VARIANTS : v),
  }
}
