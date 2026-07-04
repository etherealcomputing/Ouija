"use client"

import { useTelemetry } from "@/components/ouija/telemetry-provider"
import { ViewShell, SectionLabel, KpiTile } from "@/components/ui/view-shell"
import { SummaryCard } from "@/components/ui/summary-card"
import { StateChip } from "@/components/ui/state-chip"
import { StateTimeline } from "@/components/ui/state-timeline"
import { EventLog } from "@/components/ui/event-log"
import { MindStateCore } from "@/components/viz/mind-state-radar"
import { RadialGauge } from "@/components/viz/radial-gauge"
import { Sparkline } from "@/components/viz/sparkline"
import { DemoEmptyState } from "@/components/shell/demo-empty-state"
import { deriveMindState, MIND_STATES, type MindState } from "@/lib/ouija-data"
import { Brain, Gauge, ScrollText, Waves } from "lucide-react"

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

export function DashboardView() {
  const { frame, mindState, dimensions, confidence, buffers, events } = useTelemetry()

  if (!frame) {
    return (
      <ViewShell title="Dashboard" subtitle="No device streaming">
        <DemoEmptyState
          title="Your dashboard is empty"
          hint="Mind-state, focus, calm and HRV appear here once a feed is live. Turn on Demo Mode to see it in action, or connect your own device."
        />
      </ViewShell>
    )
  }

  const pct = (v: number) => `${Math.round(v * 100)}%`
  const segments = recentStates(buffers.calm, buffers.focus)

  return (
    <ViewShell title="Dashboard" subtitle={MIND_STATES[mindState].meaning}>
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <KpiTile label="CALM" value={pct(frame.calm)} sub="Neurosity metric" accent="operator" />
        <KpiTile label="FOCUS" value={pct(frame.focus)} sub="Neurosity metric" accent="perception" />
        <KpiTile label="HRV" value={`${Math.round(frame.hrv)} ms`} sub="RMSSD" accent="mint" />
        <KpiTile label="SIGNAL" value={pct(frame.signalQuality)} sub={`confidence ${confidence}`} accent="adaptation" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mind-state core */}
        <SummaryCard title="Mind-State Core" icon={<Brain className="w-4 h-4" />} accent="perception" className="lg:col-span-2" meta="live estimate">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_240px] gap-6 items-center">
            <div className="flex justify-center">
              <MindStateCore state={mindState} dimensions={dimensions} />
            </div>
            <div className="space-y-3">
              <StateChip state={mindState} size="lg" />
              <div className="space-y-2">
                {(["focus", "calm", "load", "arousal", "fatigue"] as const).map((k) => (
                  <div key={k}>
                    <div className="flex justify-between text-[10px] font-mono text-text-dim mb-1">
                      <span className="uppercase tracking-[0.16em]">{k}</span>
                      <span className="tabular text-foreground/80">{pct(dimensions[k])}</span>
                    </div>
                    <div className="h-1 rounded-full bg-obsidian/70 overflow-hidden">
                      <div className="h-full bg-perception/70" style={{ width: pct(dimensions[k]) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SummaryCard>

        {/* Signal quality gauge */}
        <SummaryCard title="Signal Quality" icon={<Gauge className="w-4 h-4" />} accent="operator">
          <div className="flex flex-col items-center gap-3 py-2">
            <RadialGauge
              value={frame.signalQuality * 100}
              color="var(--color-perception)"
              label={pct(frame.signalQuality)}
              sublabel="contact"
              ticks={12}
            />
            <div className="w-full grid grid-cols-2 gap-2 text-center">
              <div className="rounded-sm border border-border bg-obsidian/50 py-2">
                <div className="text-[9px] text-text-dim font-mono tracking-[0.14em]">CALM</div>
                <Sparkline data={buffers.calm} color="var(--color-operator)" height={22} fill />
              </div>
              <div className="rounded-sm border border-border bg-obsidian/50 py-2">
                <div className="text-[9px] text-text-dim font-mono tracking-[0.14em]">FOCUS</div>
                <Sparkline data={buffers.focus} color="var(--color-perception)" height={22} fill />
              </div>
            </div>
          </div>
        </SummaryCard>
      </div>

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
