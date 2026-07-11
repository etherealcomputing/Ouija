"use client"

import { FlaskConical } from "lucide-react"

// The "research prototype" designation. Ouija replays one person's own
// de-identified neuro/health archive to make it legible — it is exploratory,
// not a medical or diagnostic device. This little pill states that plainly and
// consistently wherever the product names itself (the sidebar lockup and
// Settings); the footer carries the same phrase as plain microcopy.
const TITLE = "A personal research prototype — exploratory, not a medical or diagnostic device."

export function ResearchPrototypeBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const box = size === "md" ? "px-2 py-0.5 gap-1.5 text-[9px]" : "px-1.5 py-0.5 gap-1 text-[7px]"
  const icon = size === "md" ? "w-3 h-3" : "w-2.5 h-2.5"
  return (
    <span
      title={TITLE}
      className={`inline-flex items-center rounded-full border border-perception/25 bg-perception/5 font-mono uppercase tracking-[0.12em] text-perception/80 leading-none ${box}`}
    >
      <FlaskConical className={`${icon} shrink-0`} aria-hidden />
      <span className="whitespace-nowrap">Research Prototype</span>
    </span>
  )
}
