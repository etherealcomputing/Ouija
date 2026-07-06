"use client"

// ConsoleView — the app's home: an at-a-glance aggregate of the top markers
// across every modality (best-of / need-to-know), a shrunken Brain Atlas box
// that opens the full pane on interaction, a compact resolution tracker, and
// recent activity. The whole app is a dashboard; this is its overview pane.

import { type CSSProperties } from "react"
import { useTelemetry } from "@/components/ouija/telemetry-provider"
import { useAtlas } from "@/components/brain/atlas-data-provider"
import { ViewShell, SectionLabel, KpiTile } from "@/components/ui/view-shell"
import { SummaryCard } from "@/components/ui/summary-card"
import { StateChip } from "@/components/ui/state-chip"
import { StateTimeline } from "@/components/ui/state-timeline"
import { EventLog } from "@/components/ui/event-log"
import { BrainInsight } from "@/components/brain/brain-insight"
import { BrainCanvas } from "@/components/brain/brain-canvas"
import { MindStateCore } from "@/components/viz/mind-state-radar"
import { deriveMindState, MIND_STATES, type MindState } from "@/lib/ouija-data"
import { MODALITIES, SYSTEM_STATUS_META } from "@/lib/modalities"
import type { View } from "@/lib/views"
import { Activity, ArrowRight, Brain, ScrollText, Waves } from "lucide-react"

const STATUS_HEX: Record<string, string> = { offline: "#ff5c8a", partial: "#f6b73c", nominal: "#3ee6b0" }

const RECESSED_WELL: CSSProperties = {
  background: "radial-gradient(120% 90% at 50% 35%, #14040e 0%, #0a0410 55%, #050109 100%)",
  boxShadow: "inset 0 3px 26px 5px rgba(0,0,0,0.78), inset 0 0 0 1px rgba(248,32,144,0.10)",
}

/** Run-length-encode the live calm/focus buffers into mind-state segments. */
function recentStates(calm: number[], focus: number[]): { state: MindState; duration: number }[] {
  const n = Math.min(calm.length, focus.length)
  const segs: { state: MindState; duration: number }[] = []
  for (let i = 0; i < n; i++) {
    const s = deriveMindState(calm[i], focus[i])
    const last = segs[segs.length - 1]
    if (last && last.state === s) last.duration += 1
    else segs.push({ state: s, duration: 1 })
  }
  return segs
}

export function ConsoleView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { frame, mindState, dimensions, confidence, buffers, events } = useTelemetry()
  const { regionValues, status, gutScore, bodyValue, modalities } = useAtlas()

  const meta = SYSTEM_STATUS_META[status]
  const hex = STATUS_HEX[status]
  const liveCount = modalities.filter((m) => m.live).length
  const total = modalities.length
  const offline = modalities.filter((m) => !m.live).map((m) => m.label)
  const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`)
  const segments = recentStates(buffers.calm, buffers.focus)

  return (
    <ViewShell title="Console" subtitle="At-a-glance — the top markers across every modality">
      <BrainInsight />

      {/* Top markers — best-of / need-to-know from each modality */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <KpiTile label="STATE" value={frame ? MIND_STATES[mindState].label : "—"} sub="mind-state" accent="perception" />
        <KpiTile label="FOCUS" value={frame ? pct(frame.focus) : "—"} sub="EEG" accent="perception" />
        <KpiTile label="CALM" value={frame ? pct(frame.calm) : "—"} sub="EEG" accent="operator" />
        <KpiTile label="HRV" value={frame ? `${Math.round(frame.hrv)} ms` : "—"} sub="autonomic" accent="mint" />
        <KpiTile label="GUT" value={pct(gutScore)} sub="Viome" accent="mint" />
        <KpiTile label="SIGNAL" value={frame ? pct(frame.signalQuality) : "—"} sub={frame ? `conf ${confidence}` : "offline"} accent="adaptation" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
        {/* Shrunken Brain Atlas — interacting opens the full pane */}
        <button
          type="button"
          onClick={() => onNavigate("brain")}
          aria-label="Open Brain Atlas"
          className="group relative rounded-xl overflow-hidden h-[300px] min-h-[260px] text-left ring-1 ring-perception/10 hover:ring-perception/40 transition-shadow"
          style={RECESSED_WELL}
        >
          {/* Passive preview — pointer-events go to the button so any click opens the pane. */}
          <div className="absolute inset-0 pointer-events-none">
            <BrainCanvas values={regionValues} hovered={null} selected={null} systemic={{ body: bodyValue, gut: gutScore }} onHover={() => {}} onSelect={() => {}} />
          </div>
          <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] font-mono tracking-[0.16em] text-text-dim pointer-events-none">
            <Brain className="w-3.5 h-3.5 text-perception" /> BRAIN ATLAS
          </div>
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-[11px] font-medium text-perception opacity-80 group-hover:opacity-100 pointer-events-none">
            Open <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>

        {/* Compact resolution tracker + mind-state */}
        <div className="flex flex-col gap-4">
          <SummaryCard title="System Resolution" icon={<Activity className="w-4 h-4" />} accent="perception" meta={`${liveCount}/${total}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-[0.16em] uppercase" style={{ color: hex }}>{meta.label}</span>
              <span className="text-[10px] font-mono text-text-dim tabular">{liveCount}/{total} sources</span>
            </div>
            <div className="h-1.5 rounded-full bg-obsidian/70 overflow-hidden flex gap-0.5 mb-3">
              {MODALITIES.map((m) => {
                const live = modalities.find((x) => x.id === m.id)?.live
                return <div key={m.id} className={`flex-1 rounded-sm ${live ? "bg-mint" : "bg-white/10"}`} />
              })}
            </div>
            {status === "nominal" ? (
              <p className="text-[10px] font-mono text-mint leading-relaxed">All {total} data sources connected · fully resolved.</p>
            ) : (
              <p className="text-[10px] font-mono text-amber leading-relaxed">
                <span className="text-foreground/70">Still needed: </span>
                {offline.join(", ")}.
              </p>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate("brain") }}
              className="mt-3 inline-flex items-center gap-1 text-[10px] font-mono text-perception hover:underline"
            >
              Resolve in Brain Atlas <ArrowRight className="w-3 h-3" />
            </button>
          </SummaryCard>

          <SummaryCard title="Mind-State" icon={<Brain className="w-4 h-4" />} accent="operator">
            <div className="flex flex-col items-center gap-3 py-1">
              <MindStateCore state={mindState} dimensions={dimensions} />
              <StateChip state={mindState} size="sm" />
            </div>
          </SummaryCard>
        </div>
      </div>

      {/* Recent activity */}
      <SectionLabel>Recent activity</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SummaryCard title="Mind-State Timeline" icon={<Waves className="w-4 h-4" />} accent="adaptation" meta="rolling window">
          <StateTimeline states={segments.length ? segments : [{ state: mindState, duration: 1 }]} />
        </SummaryCard>
        <SummaryCard title="Session Log" icon={<ScrollText className="w-4 h-4" />} accent="operator" meta={`${events.length} events`}>
          <EventLog events={events} maxItems={6} />
        </SummaryCard>
      </div>
    </ViewShell>
  )
}
