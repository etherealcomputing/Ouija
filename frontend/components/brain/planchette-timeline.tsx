"use client"

// The Planchette — a séance-style cadence scrubber under the brain. It glides
// across your real capture dates; resting on a stop grounds every capture up to
// that day, so the atlas morphs as your archive fills date-by-date. Position is
// derived from the include-set (SourcesProvider), so the Source Rail, Replay
// toggle, and this scrubber always agree.

import { motion } from "framer-motion"
import { useSources } from "@/components/sources/sources-provider"
import { SPRING } from "@/lib/motion"

/** A small Ouija planchette pointing down at the active capture date. */
function Planchette({ dim }: { dim: boolean }) {
  return (
    <svg width="26" height="30" viewBox="0 0 26 30" className={dim ? "opacity-45" : ""} style={{ filter: "drop-shadow(0 0 6px rgba(248,32,144,0.6))" }} aria-hidden>
      {/* teardrop body, apex pointing down to the track */}
      <path
        d="M13 29 C5 22 2 16 2 11 A11 11 0 0 1 24 11 C24 16 21 22 13 29 Z"
        fill="rgba(20,4,14,0.85)"
        stroke="#f82090"
        strokeWidth="1.4"
      />
      {/* viewing hole */}
      <circle cx="13" cy="11" r="4.4" fill="none" stroke="#f82090" strokeWidth="1.2" />
      <circle cx="13" cy="11" r="1.3" fill="#ff7ab8" />
    </svg>
  )
}

export function PlanchetteTimeline() {
  const { timeline, scrubToDay } = useSources()
  const { stops, cursorIndex, hasCadence } = timeline

  if (!hasCadence) return null // nothing to scrub across (0–1 capture dates)

  const max = stops.length - 1
  const posOf = (i: number) => (max === 0 ? 50 : (i / max) * 100)
  // Where the planchette rests: on a stop, or parked before the first when the
  // include-set is empty / hand-picked (detached).
  const detached = cursorIndex == null
  const restIndex = cursorIndex ?? 0
  const restPos = detached ? 0 : posOf(restIndex)
  const active = detached ? null : stops[restIndex]

  const move = (dir: -1 | 1 | "home" | "end") => {
    const from = cursorIndex ?? -1
    let to: number
    if (dir === "home") to = 0
    else if (dir === "end") to = max
    else to = Math.max(0, Math.min(max, from + dir))
    scrubToDay(to)
  }

  return (
    <div className="glass-panel rounded-lg px-4 pt-3 pb-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-display tracking-[0.18em] text-foreground/90 uppercase">Cadence</span>
          <span className="text-[9px] font-mono text-text-faint">{stops.length} capture dates</span>
        </div>
        <div className="text-[10px] font-mono text-perception tabular">
          {active ? `as of ${active.dateLabel} · ${active.modalityCount}/5` : detached ? "hand-picked" : ""}
        </div>
      </div>

      {/* Scrub track — an accessible slider snapped to capture dates. */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Scrub your capture cadence"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={cursorIndex ?? 0}
        aria-valuetext={active ? `${active.dateLabel}, ${active.modalityCount} of 5 modalities` : "not set"}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); move(1) }
          else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); move(-1) }
          else if (e.key === "Home") { e.preventDefault(); move("home") }
          else if (e.key === "End") { e.preventDefault(); move("end") }
        }}
        className="relative mt-5 mb-1 h-8 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-perception/50 rounded"
      >
        {/* rail */}
        <div className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-border" />
        {/* filled portion — glides with the planchette on the same spring (scaleX
            from the left) instead of jumping to the new stop. */}
        <motion.div
          className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-[2px] origin-left rounded-full bg-gradient-to-r from-perception/40 to-perception"
          initial={false}
          animate={{ scaleX: detached ? 0 : restPos / 100 }}
          transition={SPRING.glide}
        />
        {/* stop ticks — pointer-clickable, but aria-hidden and NOT in the tab
            order: the slider itself is the single keyboard control (arrows). */}
        {stops.map((s, i) => {
          const on = !detached && i <= restIndex
          return (
            <div
              key={s.key}
              onClick={() => scrubToDay(i)}
              title={`${s.dateLabel} · ${s.modalityCount}/5`}
              aria-hidden
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center w-6 h-8 cursor-pointer group/tick"
              style={{ left: `${posOf(i)}%` }}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full border transition-all duration-200 group-active/tick:scale-90 ${
                  on ? "bg-perception border-perception scale-110" : "bg-obsidian border-text-faint/50 group-hover/tick:border-perception/60"
                }`}
                style={on ? { boxShadow: "0 0 8px var(--color-perception)" } : undefined}
              />
            </div>
          )
        })}
        {/* the gliding planchette */}
        <motion.div
          className="absolute -top-3 -translate-x-1/2 pointer-events-none"
          initial={false}
          animate={{ left: `${restPos}%` }}
          transition={SPRING.glide}
        >
          <Planchette dim={detached} />
        </motion.div>
      </div>

      {/* date rail labels — first & last for orientation */}
      <div className="flex justify-between text-[8px] font-mono text-text-faint tracking-wide">
        <span>{stops[0]?.dateLabel}</span>
        <span>{stops[max]?.dateLabel}</span>
      </div>
    </div>
  )
}
