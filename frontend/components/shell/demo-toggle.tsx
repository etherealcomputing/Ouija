"use client"

// ReplayControl — loads the whole archive at once (vs. hand-picking sources in
// the Source Rail). "Replay" = play your own captured data back; there is no
// simulation. Off → nothing grounded; on → every app-ready source included.

import { motion } from "framer-motion"
import { PlayCircle } from "lucide-react"
import { useTelemetry } from "@/components/ouija/telemetry-provider"
import { SPRING } from "@/lib/motion"

export function ReplayControl() {
  const { replayMode, setReplayMode } = useTelemetry()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={replayMode}
      aria-label={replayMode ? "Clear your archive" : "Replay your archive"}
      onClick={() => setReplayMode(!replayMode)}
      className={`press group flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors duration-200 ${
        replayMode ? "border-perception/50 bg-perception/10" : "border-border bg-panel-3/40 hover:border-perception/30"
      }`}
    >
      {/* Icon springs a touch on activation. */}
      <motion.span animate={{ scale: replayMode ? [1, 1.25, 1] : 1 }} transition={SPRING.snappy} className="inline-flex">
        <PlayCircle className={`w-3.5 h-3.5 transition-colors duration-200 ${replayMode ? "text-perception" : "text-text-faint group-hover:text-text-dim"}`} />
      </motion.span>
      <span
        className={`text-[10px] font-mono tracking-[0.18em] uppercase transition-colors duration-200 ${
          replayMode ? "text-perception" : "text-text-faint group-hover:text-text-dim"
        }`}
      >
        Replay
      </span>
      <span
        className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors duration-200 ${
          replayMode ? "bg-perception/80" : "bg-panel-3"
        }`}
      >
        {/* The knob glides on a spring instead of a linear CSS translate. */}
        <motion.span
          className="inline-block h-2.5 w-2.5 rounded-full bg-foreground shadow"
          animate={{ x: replayMode ? 12 : 2 }}
          transition={SPRING.snappy}
        />
      </span>
    </button>
  )
}
