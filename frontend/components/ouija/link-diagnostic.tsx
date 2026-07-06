"use client"

// LinkDiagnostic — the visible hardware/telemetry diagnostic in the header.
// ─────────────────────────────────────────────────────────────────────────
// Surfaces what the TelemetryMonitor (lib/diagnostics.ts) derives: the
// effective link health (including STALE, which the raw device health never
// reports) and the dropped-frame count / delivery ratio. Split into a pure
// view (unit-tested) and a thin context wrapper so the console shows a single
// honest "is my signal healthy?" readout instead of a bare LIVE/OFFLINE flag.

import { Radio } from "lucide-react"
import { useTelemetry } from "@/components/ouija/telemetry-provider"
import type { LinkHealth } from "@/lib/telemetry"
import type { TelemetryDiagnostic } from "@/lib/diagnostics"

const LINK_META: Record<LinkHealth, { label: string; dot: string; text: string; pulse: boolean }> = {
  live: { label: "LIVE · streaming", dot: "text-perception", text: "text-text-dim", pulse: true },
  degraded: { label: "DEGRADED · poor contact", dot: "text-amber", text: "text-amber", pulse: true },
  stale: { label: "STALE · no frames", dot: "text-coral", text: "text-coral", pulse: false },
  disconnected: { label: "OFFLINE", dot: "text-coral", text: "text-text-dim", pulse: false },
}

export function LinkDiagnosticView({
  diagnostic,
  connected,
}: {
  diagnostic: TelemetryDiagnostic
  connected: boolean
}) {
  const meta = LINK_META[diagnostic.link]
  const { received, dropped } = diagnostic.integrity
  const showLoss = connected && received > 0
  const lossPct = Math.round((1 - diagnostic.deliveryRatio) * 100)

  const title = [
    `Link: ${diagnostic.link}`,
    `Frames: ${received} received, ${dropped} dropped`,
    diagnostic.msSinceFrame !== null ? `Last frame: ${diagnostic.msSinceFrame} ms ago` : null,
    ...diagnostic.warnings.slice(0, 3),
  ]
    .filter(Boolean)
    .join("\n")

  return (
    <div className="flex items-center gap-2 min-w-0" title={title} data-testid="link-diagnostic" data-link={diagnostic.link}>
      <Radio className={`w-3.5 h-3.5 ${meta.dot} ${meta.pulse ? "blink-soft" : ""}`} />
      <span className={`text-[11px] font-mono tracking-wide truncate ${meta.text}`}>{meta.label}</span>
      {showLoss && (
        <span
          className={`text-[10px] font-mono tabular ${dropped > 0 ? "text-amber" : "text-text-faint"}`}
          data-testid="frame-loss"
        >
          {dropped > 0 ? `· ${dropped} dropped (${lossPct}%)` : "· 0 dropped"}
        </span>
      )}
    </div>
  )
}

export function LinkDiagnostic() {
  const { diagnostic, connected } = useTelemetry()
  return <LinkDiagnosticView diagnostic={diagnostic} connected={connected} />
}
