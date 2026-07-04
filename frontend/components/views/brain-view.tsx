"use client"

import { useMemo, useState } from "react"
import { ViewShell, SectionLabel } from "@/components/ui/view-shell"
import { BrainCanvas } from "@/components/brain/brain-canvas"
import { RegionPanel } from "@/components/brain/region-panel"
import { UploadDropzone } from "@/components/brain/upload-dropzone"
import { SystemReadiness } from "@/components/brain/system-readiness"
import { BrainInsight } from "@/components/brain/brain-insight"
import { useAtlas } from "@/components/brain/atlas-data-provider"
import { BRAIN_REGIONS } from "@/lib/brain-atlas"
import { REGION_MODALITY, MODALITY_BY_ID } from "@/lib/modalities"

const SUBTITLE: Record<string, string> = {
  offline: "God-View · establishing device link…",
  partial: "God-View · populating region-by-region as modalities come online",
  nominal: "God-View · all modalities feeding · output nominal",
}

export function BrainView() {
  const { regionValues, regionBaseline, regionSeries, mindState, status } = useAtlas()
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const activeId = hovered ?? selected
  const region = useMemo(() => BRAIN_REGIONS.find((r) => r.id === activeId) ?? null, [activeId])

  return (
    <ViewShell title="Brain Atlas" subtitle={SUBTITLE[status]}>
      <BrainInsight />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4">
        {/* 3D scene — the focal point */}
        <div className="relative glass-panel rounded-lg overflow-hidden min-h-[520px] h-[64vh] scan-line-container">
          <BrainCanvas
            values={regionValues}
            hovered={hovered}
            selected={selected}
            onHover={setHovered}
            onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
          />
          <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 pointer-events-none">
            <div className="flex items-center gap-2 text-[9px] font-mono text-text-dim">
              <span className="w-2 h-2 rounded-full bg-perception" style={{ boxShadow: "0 0 8px var(--color-perception)" }} />
              powered by a live modality
            </div>
            <div className="flex items-center gap-2 text-[9px] font-mono text-text-dim">
              <span className="w-2 h-2 rounded-full" style={{ background: "#5a2a52" }} />
              awaiting its modality
            </div>
          </div>
          <div className="absolute top-3 right-3 text-[9px] font-mono text-text-faint pointer-events-none tracking-[0.16em]">
            DRAG TO ROTATE · SCROLL TO ZOOM
          </div>
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
              className={`text-left rounded-md border px-3 py-2 transition-colors ${
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
