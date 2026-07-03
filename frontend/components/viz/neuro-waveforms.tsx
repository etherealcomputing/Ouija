"use client"

import { motion } from "framer-motion"

export interface ChannelTrace {
  name: string
  /** Rolling window of normalized samples (0–1). */
  data: number[]
}

function toPath(data: number[], w = 100, h = 100) {
  if (data.length < 2) return ""
  const step = w / (data.length - 1)
  return data.map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)},${((1 - v) * h).toFixed(2)}`).join(" ")
}

/**
 * Live multi-channel EEG traces. Purely presentational — it renders whatever
 * rolling windows it is handed, so the same component works against the
 * simulated Neurosity adapter today and a real Crown stream later.
 */
export function NeuroWaveforms({
  channels,
  color = "var(--color-perception)",
}: {
  channels: ChannelTrace[]
  color?: string
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {channels.map((ch) => (
        <div key={ch.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-perception uppercase tracking-[0.16em] font-mono">{ch.name}</span>
            <span className="text-[9px] text-text-faint font-mono tabular">
              {ch.data.length ? Math.round((ch.data[ch.data.length - 1] ?? 0) * 100) : "—"}%
            </span>
          </div>
          <div className="h-12 bg-obsidian/50 rounded-sm overflow-hidden relative border border-border">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path
                d={toPath(ch.data)}
                fill="none"
                stroke={color}
                strokeWidth="1.4"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="absolute inset-0 data-grid-bg opacity-[0.14] pointer-events-none" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** A single labelled HRV bar with a shimmer sweep. */
export function HrvBar({ hrv }: { hrv: number }) {
  // Map 18–90 ms RMSSD onto 30–90% width.
  const pct = Math.max(30, Math.min(90, ((hrv - 18) / (90 - 18)) * 60 + 30))
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-mint uppercase tracking-[0.16em] font-display">HRV</span>
        <span className="text-[9px] text-text-dim font-mono tabular">{Math.round(hrv)} ms RMSSD</span>
      </div>
      <div className="h-2.5 bg-obsidian/60 rounded-full overflow-hidden border border-border relative">
        <motion.div
          className="h-full bg-gradient-to-r from-mint/40 via-mint to-mint/40 relative"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
        </motion.div>
      </div>
    </div>
  )
}
