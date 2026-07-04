"use client"

// DemoToggle — flips the console between its empty/idle default and the
// simulated demo feed. Off by default so the app boots ready-to-use; on
// instantiates the SimulatedNeurosityAdapter (the "demo content" that was
// previously always playing).

import { useTelemetry } from "@/components/ouija/telemetry-provider"

export function DemoToggle() {
  const { demoMode, setDemoMode } = useTelemetry()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={demoMode}
      aria-label="Toggle Demo Mode"
      onClick={() => setDemoMode(!demoMode)}
      className={`group flex items-center gap-2 rounded-full border px-2.5 py-1 transition-colors ${
        demoMode
          ? "border-perception/50 bg-perception/10"
          : "border-border bg-panel-3/40 hover:border-perception/30"
      }`}
    >
      <span
        className={`text-[10px] font-mono tracking-[0.18em] uppercase transition-colors ${
          demoMode ? "text-perception" : "text-text-faint group-hover:text-text-dim"
        }`}
      >
        Demo
      </span>
      <span
        className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors ${
          demoMode ? "bg-perception/80" : "bg-panel-3"
        }`}
      >
        <span
          className={`inline-block h-2.5 w-2.5 transform rounded-full bg-foreground shadow transition-transform ${
            demoMode ? "translate-x-3" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  )
}
