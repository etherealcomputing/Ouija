"use client"

import { motion } from "framer-motion"
import { systemicRead, type SystemicKind } from "@/lib/insights"
import { Dna, Scale } from "lucide-react"

const ACCENT: Record<SystemicKind, { bar: string; icon: typeof Dna; hex: string }> = {
  body: { bar: "bg-operator", hex: "#b96ce6", icon: Scale },
  gut: { bar: "bg-mint", hex: "#ff7ab8", icon: Dna },
}

// The Body / Gut counterpart to RegionPanel — surfaced when a brainstem anchor
// is hovered or selected. Same plain-language-first contract as the regions.
export function SystemicPanel({ kind, value }: { kind: SystemicKind; value: number | null }) {
  const read = systemicRead(kind, value)
  const accent = ACCENT[kind]
  const Icon = accent.icon

  return (
    <div className="glass-panel rounded-lg p-5 h-full min-h-[280px] relative overflow-hidden">
      <motion.div
        key={kind}
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.26, ease: "easeOut" }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-[3px] h-4 rounded-full" style={{ background: accent.hex }} />
          <h3 className="font-display text-base tracking-[0.12em] text-foreground">{read.name}</h3>
          <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-mono text-text-faint border border-border rounded px-1.5 py-0.5 tracking-wider uppercase">
            <Icon className="w-3 h-3" /> systemic
          </span>
        </div>

        {value != null ? (
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[9px] font-mono text-text-dim tracking-[0.16em]">{read.metricLabel.toUpperCase()}</span>
              <span className="font-display text-2xl tabular" style={{ color: accent.hex }}>
                {Math.round(value * 100)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-obsidian/70 overflow-hidden">
              <motion.div
                className={`h-full ${accent.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(value * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        ) : (
          <div className="text-[10px] font-mono text-text-faint border border-border rounded px-2 py-1.5 inline-block">
            Not loaded yet
          </div>
        )}

        <p className="text-[13px] leading-relaxed text-foreground/90">{read.insight}</p>
        <p className="text-[10px] leading-relaxed text-text-faint font-mono border-l border-border pl-2.5">
          {read.role}. Feeds the whole system rather than one region — anchored below the brainstem in the atlas.
        </p>
      </motion.div>
    </div>
  )
}
