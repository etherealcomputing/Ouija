"use client"

// DemoEmptyState — the idle prompt every live view falls back to when no device
// is streaming and Demo Mode is off. Ouija boots empty and ready-to-use; this
// panel tells the user how to get data flowing (enable the demo, or connect
// their own hardware) instead of a dead "connecting…" spinner.

import { PlayCircle, Radio } from "lucide-react"
import { useTelemetry } from "@/components/ouija/telemetry-provider"

export function DemoEmptyState({
  title,
  hint,
}: {
  title?: string
  hint?: string
}) {
  const { setDemoMode } = useTelemetry()

  return (
    <div className="glass-panel rounded-lg p-10 sm:p-14 text-center">
      <div className="mx-auto grid place-items-center w-12 h-12 rounded-full border border-perception/30 bg-perception/10 mb-5">
        <Radio className="w-5 h-5 text-perception" />
      </div>
      <h3 className="font-display text-lg tracking-[0.06em] text-foreground">{title ?? "No signal yet"}</h3>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-text-dim">
        {hint ??
          "Ouija is ready to use, but nothing is streaming. Turn on Demo Mode to explore with a simulated feed, or connect your own device."}
      </p>
      <button
        type="button"
        onClick={() => setDemoMode(true)}
        className="mt-6 inline-flex items-center gap-2 rounded-md border border-perception/40 bg-perception/10 px-4 py-2 text-[13px] font-medium text-perception transition-colors hover:bg-perception/20"
      >
        <PlayCircle className="w-4 h-4" />
        Enable Demo Mode
      </button>
      <p className="mt-4 text-[10px] font-mono tracking-wide text-text-faint">
        Bring your own hardware — any LSL / BrainFlow / EDF source works.
      </p>
    </div>
  )
}
