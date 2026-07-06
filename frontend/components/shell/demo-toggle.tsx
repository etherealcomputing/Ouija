"use client"

// ReplayControl — loads the whole archive at once (vs. hand-picking sources in
// the Source Rail). "Replay" = play your own captured data back; there is no
// simulation. Off → nothing grounded; on → every app-ready source included.

import { PlayCircle } from "lucide-react"
import { useTelemetry } from "@/components/ouija/telemetry-provider"

export function ReplayControl() {
  const { replayMode, setReplayMode } = useTelemetry()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={replayMode}
      aria-label={replayMode ? "Clear your archive" : "Replay your archive"}
      onClick={() => setReplayMode(!replayMode)}
      className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors ${
        replayMode ? "border-perception/50 bg-perception/10" : "border-border bg-panel-3/40 hover:border-perception/30"
      }`}
    >
      <PlayCircle className={`w-3.5 h-3.5 ${replayMode ? "text-perception" : "text-text-faint group-hover:text-text-dim"}`} />
      <span
        className={`text-[10px] font-mono tracking-[0.18em] uppercase transition-colors ${
          replayMode ? "text-perception" : "text-text-faint group-hover:text-text-dim"
        }`}
      >
        Replay
      </span>
      <span
        className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors ${
          replayMode ? "bg-perception/80" : "bg-panel-3"
        }`}
      >
        <span
          className={`inline-block h-2.5 w-2.5 transform rounded-full bg-foreground shadow transition-transform ${
            replayMode ? "translate-x-3" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  )
}
