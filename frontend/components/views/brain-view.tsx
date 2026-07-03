"use client"

import { useMemo, useState } from "react"
import { ViewShell, SectionLabel } from "@/components/ui/view-shell"
import { BrainCanvas } from "@/components/brain/brain-canvas"
import { RegionPanel } from "@/components/brain/region-panel"
import { UploadDropzone } from "@/components/brain/upload-dropzone"
import { useAtlas } from "@/components/brain/atlas-data-provider"
import { BRAIN_REGIONS } from "@/lib/brain-atlas"

export function BrainView() {
  const { regionValues, regionBaseline, regionSeries, mindState, source } = useAtlas()
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const activeId = hovered ?? selected
  const region = useMemo(() => BRAIN_REGIONS.find((r) => r.id === activeId) ?? null, [activeId])
  const coveredCount = BRAIN_REGIONS.filter((r) => r.channels.length > 0).length

  return (
    <ViewShell
      title="Brain Atlas"
      subtitle={`Interactive God-View · ${source === "upload" ? "uploaded data" : "live simulated EEG"} · hover a region for context`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
        {/* 3D scene */}
        <div className="relative glass-panel rounded-lg overflow-hidden min-h-[440px] h-[56vh] scan-line-container">
          <BrainCanvas
            values={regionValues}
            hovered={hovered}
            selected={selected}
            onHover={setHovered}
            onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
          />
          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 pointer-events-none">
            <div className="flex items-center gap-2 text-[9px] font-mono text-text-dim">
              <span className="w-2 h-2 rounded-full bg-perception" style={{ boxShadow: "0 0 8px var(--color-perception)" }} />
              EEG-covered ({coveredCount})
            </div>
            <div className="flex items-center gap-2 text-[9px] font-mono text-text-dim">
              <span className="w-2 h-2 rounded-full" style={{ background: "#5a2a52" }} />
              awaiting imaging
            </div>
          </div>
          <div className="absolute top-3 right-3 text-[9px] font-mono text-text-faint pointer-events-none tracking-[0.16em]">
            DRAG TO ROTATE · SCROLL TO ZOOM
          </div>
        </div>

        {/* Context panel + upload */}
        <div className="flex flex-col gap-4">
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
            </button>
          )
        })}
      </div>
    </ViewShell>
  )
}
