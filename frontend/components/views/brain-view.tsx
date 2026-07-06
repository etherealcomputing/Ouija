"use client"

import { useMemo, useState, type CSSProperties } from "react"
import { PlayCircle } from "lucide-react"
import { ViewShell, SectionLabel, KpiTile } from "@/components/ui/view-shell"
import { BrainCanvas } from "@/components/brain/brain-canvas"
import { RegionPanel } from "@/components/brain/region-panel"
import { UploadDropzone } from "@/components/brain/upload-dropzone"
import { SystemReadiness } from "@/components/brain/system-readiness"
import { BrainInsight } from "@/components/brain/brain-insight"
import { BrainHud } from "@/components/brain/brain-hud"
import { useAtlas } from "@/components/brain/atlas-data-provider"
import { useTelemetry } from "@/components/ouija/telemetry-provider"
import { useSources } from "@/components/sources/sources-provider"
import { BRAIN_REGIONS } from "@/lib/brain-atlas"
import { MIND_STATES } from "@/lib/ouija-data"
import { REGION_MODALITY, MODALITY_BY_ID, MODALITIES } from "@/lib/modalities"

const SUBTITLE: Record<string, string> = {
  offline: "Idle · turn on Demo Mode or connect a data source",
  partial: "Populating region-by-region as your data comes online",
  nominal: "All data sources feeding · fully resolved",
}

// The recessed "well" the brain sits in — a sunken viewport, the dashboard's focal point.
const RECESSED_WELL: CSSProperties = {
  background: "radial-gradient(120% 90% at 50% 35%, #14040e 0%, #0a0410 55%, #050109 100%)",
  boxShadow:
    "inset 0 3px 30px 6px rgba(0,0,0,0.78), inset 0 0 0 1px rgba(248,32,144,0.10), inset 0 -1px 0 rgba(255,255,255,0.03)",
}

export function BrainView() {
  const { regionValues, regionBaseline, regionSeries, mindState, status, source, liveIds, gutScore, bodyValue } = useAtlas()
  const { demoMode, setDemoMode, frame } = useTelemetry()
  const { spotlightRegions } = useSources()
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const activeId = hovered ?? selected
  const region = useMemo(() => BRAIN_REGIONS.find((r) => r.id === activeId) ?? null, [activeId])

  // Nothing is driving the brain: no demo feed and no uploaded data.
  const idle = !demoMode && source === "live" && Object.keys(regionValues).length === 0

  // HUD readouts.
  const activity = useMemo(() => {
    const vs = Object.values(regionValues)
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0
  }, [regionValues])

  const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`)

  return (
    <ViewShell title="Brain Atlas" subtitle={SUBTITLE[status]}>
      <BrainInsight />

      {/* Headline KPI strip — the dashboard's numbers land here too. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <KpiTile label="STATE" value={frame ? MIND_STATES[mindState].label : "—"} sub="mind-state" accent="perception" />
        <KpiTile label="FOCUS" value={frame ? pct(frame.focus) : "—"} sub="engagement" accent="perception" />
        <KpiTile label="CALM" value={frame ? pct(frame.calm) : "—"} sub="Neurosity" accent="operator" />
        <KpiTile label="GUT" value={pct(gutScore)} sub="Viome" accent="mint" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4">
        {/* 3D scene — the recessed focal point */}
        <div
          className="relative rounded-xl overflow-hidden min-h-[380px] h-[54vh] sm:h-[58vh] lg:h-[62vh] scan-line-container ring-1 ring-perception/10"
          style={RECESSED_WELL}
        >
          <BrainCanvas
            values={regionValues}
            hovered={hovered}
            selected={selected}
            spotlight={spotlightRegions}
            systemic={{ body: bodyValue, gut: gutScore }}
            onHover={setHovered}
            onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
          />

          {/* GUI layer over the WebGL core */}
          <BrainHud
            status={status}
            liveCount={liveIds.size}
            totalModalities={MODALITIES.length}
            activity={activity}
            activeName={region?.name ?? null}
          />

          <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none z-10">
            <div className="flex items-center gap-2 text-[9px] font-mono text-text-dim">
              <span className="w-2 h-2 rounded-full bg-perception" style={{ boxShadow: "0 0 8px var(--color-perception)" }} />
              powered by a live modality
            </div>
            <div className="flex items-center gap-2 text-[9px] font-mono text-text-dim">
              <span className="w-2 h-2 rounded-full" style={{ background: "#5a2a52" }} />
              awaiting its modality
            </div>
            <div className="text-[8px] font-mono text-text-faint tracking-[0.16em] mt-0.5">DRAG · SCROLL · HOVER</div>
          </div>

          {idle && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-obsidian/40 backdrop-blur-[1px]">
              <div className="text-center px-6">
                <p className="text-[13px] text-foreground/90 font-medium">The brain is at rest</p>
                <p className="mx-auto mt-1 max-w-xs text-[11px] text-text-dim leading-relaxed">
                  Regions light up as your signals stream. Turn on Demo Mode to bring it to life, or drop in your own data below.
                </p>
                <button
                  type="button"
                  onClick={() => setDemoMode(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-md border border-perception/40 bg-perception/10 px-3.5 py-1.5 text-[12px] font-medium text-perception transition-colors hover:bg-perception/20"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Enable Demo Mode
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Readiness + context + upload */}
        <div className="flex flex-col gap-4">
          <SystemReadiness />
          <RegionPanel
            region={region}
            value={region ? regionValues[region.id] ?? null : null}
            baseline={region ? regionBaseline[region.id] ?? null : null}
            series={region ? regionSeries(region.id) : []}
            mindState={mindState}
          />
          <UploadDropzone />
        </div>
      </div>

      <SectionLabel>All regions</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {BRAIN_REGIONS.map((r) => {
          const v = regionValues[r.id]
          const active = activeId === r.id
          const modality = MODALITY_BY_ID[REGION_MODALITY[r.id]]
          return (
            <button
              key={r.id}
              onMouseEnter={() => setHovered(r.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelected((cur) => (cur === r.id ? null : r.id))}
              className={`text-left rounded-md border px-3 py-2.5 min-h-[44px] transition-colors ${
                active ? "border-perception/50 bg-perception/10" : "border-border bg-panel/50 hover:border-perception/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-foreground/85 truncate">{r.name}</span>
                <span className="text-[10px] font-mono tabular text-perception">{v != null ? `${Math.round(v * 100)}%` : "—"}</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-obsidian/70 overflow-hidden">
                <div className="h-full bg-perception/70" style={{ width: v != null ? `${Math.round(v * 100)}%` : "0%" }} />
              </div>
              <div className="mt-1 text-[8px] font-mono text-text-faint uppercase tracking-wider">{modality?.short ?? "—"}</div>
            </button>
          )
        })}
      </div>
    </ViewShell>
  )
}
