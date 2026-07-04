"use client"

import { motion } from "framer-motion"
import { useAtlas } from "./atlas-data-provider"
import { MODALITIES, SYSTEM_STATUS_META, type ModalityId } from "@/lib/modalities"
import { Activity, BrainCircuit, Dna, HeartPulse, Plus, Scan, Scale, Check, type LucideIcon } from "lucide-react"

const MODALITY_ICON: Record<string, LucideIcon> = {
  eeg: BrainCircuit,
  cardiac: HeartPulse,
  imaging: Scan,
  body: Scale,
  gut: Dna,
}

export function SystemReadiness() {
  const {
    modalities,
    status,
    connectImaging,
    connectBody,
    connectGut,
    imagingConnected,
    bodyConnected,
    gutConnected,
  } = useAtlas()
  const meta = SYSTEM_STATUS_META[status]
  const liveCount = modalities.filter((m) => m.live).length
  const total = modalities.length
  const offline = modalities.filter((m) => !m.live).map((m) => m.label)

  // Which still-offline modalities can be demo-connected in one click.
  const connectable: Partial<Record<ModalityId, () => void>> = {
    imaging: !imagingConnected ? connectImaging : undefined,
    body: !bodyConnected ? connectBody : undefined,
    gut: !gutConnected ? connectGut : undefined,
  }

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-perception" />
          <h3 className="text-[11px] font-bold text-foreground/90 tracking-[0.18em] uppercase font-display">System Readiness</h3>
        </div>
        <div className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-[0.16em] ${meta.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${status !== "offline" ? "blink-soft" : ""}`} />
          {meta.label}
        </div>
      </div>

      {/* Modality progress */}
      <div className="mb-3">
        <div className="flex justify-between text-[9px] font-mono text-text-dim mb-1">
          <span>MODALITIES ONLINE</span>
          <span className="tabular">{liveCount}/{total}</span>
        </div>
        <div className="h-1.5 rounded-full bg-obsidian/70 overflow-hidden flex gap-0.5">
          {MODALITIES.map((m) => {
            const live = modalities.find((x) => x.id === m.id)?.live
            return <div key={m.id} className={`flex-1 rounded-sm ${live ? "bg-mint" : "bg-white/8"}`} />
          })}
        </div>
      </div>

      {/* Per-modality rows */}
      <div className="space-y-1.5">
        {modalities.map((m) => {
          const Icon = MODALITY_ICON[m.id] ?? Activity
          const connectFn = connectable[m.id]
          return (
            <motion.div
              key={m.id}
              layout
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-sm border ${
                m.live ? "border-mint/25 bg-mint/5" : "border-border bg-obsidian/40"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${m.live ? "text-mint" : "text-text-faint"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold ${m.live ? "text-foreground" : "text-text-dim"}`}>{m.label}</span>
                  {m.live && m.via && (
                    <span className="text-[8px] font-mono text-mint/80 border border-mint/25 rounded px-1 tracking-wider uppercase">{m.via}</span>
                  )}
                </div>
                <div className="text-[9px] font-mono text-text-faint">
                  {m.regionCount > 0 ? `${m.poweredRegions}/${m.regionCount} regions lit` : "systemic"}
                </div>
              </div>
              {m.live ? (
                <Check className="w-3.5 h-3.5 text-mint shrink-0" />
              ) : connectFn ? (
                <button
                  onClick={connectFn}
                  aria-label={`Connect ${m.label}`}
                  className="inline-flex items-center gap-1 text-[9px] font-mono text-perception border border-perception/40 rounded px-2 py-1.5 min-h-[30px] hover:bg-perception/10 transition-colors shrink-0"
                >
                  <Plus className="w-3 h-3" /> CONNECT
                </button>
              ) : (
                <span className="text-[9px] font-mono text-text-faint shrink-0">awaiting</span>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Adaptive notification — recomputes on every data change. */}
      {status === "nominal" ? (
        <p className="mt-3 flex items-start gap-1.5 text-[9px] font-mono leading-relaxed text-mint">
          <Check className="w-3 h-3 shrink-0 mt-px" />
          All {total} data sources connected · fully resolved.
        </p>
      ) : (
        <p className="mt-3 text-[9px] font-mono leading-relaxed text-amber">
          <span className="text-foreground/70">Still needed: </span>
          {offline.join(", ")}. Upload a file or connect to finish resolving your brain
          ({liveCount}/{total} online).
        </p>
      )}
    </div>
  )
}
