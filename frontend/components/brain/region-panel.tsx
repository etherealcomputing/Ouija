"use client"

import { motion } from "framer-motion"
import { Sparkline } from "@/components/viz/sparkline"
import { regionContext, type BrainRegion } from "@/lib/brain-atlas"
import { regionInsight } from "@/lib/insights"
import type { MindState } from "@/lib/ouija-data"
import { Brain } from "lucide-react"

export function RegionPanel({
  region,
  value,
  baseline,
  series,
  mindState,
}: {
  region: BrainRegion | null
  value: number | null
  baseline: number | null
  series: number[]
  mindState: MindState
}) {
  // Enter-only, keyed by region — no AnimatePresence exit-wait (which can
  // deadlock and leave the panel blank on rapid hover/select changes).
  return (
    <div className="glass-panel rounded-lg p-5 h-full min-h-[280px] relative overflow-hidden">
      <motion.div
        key={region?.id ?? "empty"}
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.26, ease: "easeOut" }}
        className="space-y-4"
      >
        {region ? (
          <>
            <div className="flex items-center gap-2.5">
              <span className="w-[3px] h-4 bg-perception rounded-full" />
              <h3 className="font-display text-base tracking-[0.12em] text-foreground">{region.name}</h3>
              <span className="ml-auto text-[9px] font-mono text-text-faint border border-border rounded px-1.5 py-0.5 tracking-wider uppercase">
                {region.lobe}
              </span>
            </div>

            {value != null ? (
              <>
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[9px] font-mono text-text-dim tracking-[0.16em]">BAND POWER</span>
                    <span className="font-display text-2xl text-perception tabular">{Math.round(value * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-obsidian/70 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-perception/70 to-perception"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(value * 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
                {series.length > 1 && (
                  <div className="rounded-sm border border-border bg-obsidian/50 px-2 py-2">
                    <div className="text-[9px] text-text-dim font-mono tracking-[0.14em] mb-1">ROLLING TRACE</div>
                    <Sparkline data={series} color="var(--color-perception)" height={30} />
                  </div>
                )}
              </>
            ) : (
              <div className="text-[10px] font-mono text-text-faint border border-border rounded px-2 py-1.5 inline-block">
                No direct EEG coverage
              </div>
            )}

            {/* Plain-language read leads; the technical line is secondary. */}
            <p className="text-[13px] leading-relaxed text-foreground/90">
              {regionInsight(region, value, baseline, mindState)}
            </p>
            <p className="text-[10px] leading-relaxed text-text-faint font-mono border-l border-border pl-2.5">
              {regionContext(region, value, baseline, mindState)}
            </p>

            {region.channels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {region.channels.map((c) => (
                  <span key={c} className="text-[9px] font-mono text-perception/90 border border-perception/30 rounded px-1.5 py-0.5">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-10">
            <Brain className="w-8 h-8 text-perception/40" />
            <p className="text-[12px] text-text-dim max-w-[220px] leading-relaxed">
              Hover or click a glowing region node to read its live, data-driven context.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
