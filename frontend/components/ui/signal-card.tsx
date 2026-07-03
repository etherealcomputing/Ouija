"use client"

import { motion } from "framer-motion"
import type { SignalChannel } from "@/lib/ouija-data"
import { ConfidenceBadge } from "./confidence-badge"
import { format } from "date-fns"
import { Clock, BrainCircuit, HeartPulse, Scale, type LucideIcon } from "lucide-react"

interface SignalCardProps {
  signal: SignalChannel
}

const statusConfig = {
  stable: { color: "text-mint", bg: "bg-mint/10", border: "border-mint/30", dot: "bg-mint" },
  strained: { color: "text-amber", bg: "bg-amber/10", border: "border-amber/30", dot: "bg-amber" },
  unavailable: { color: "text-text-dim", bg: "bg-white/5", border: "border-border", dot: "bg-text-faint" },
}

const groupConfig: Record<SignalChannel["group"], { accent: string; border: string; icon: LucideIcon; label: string }> = {
  eeg: { accent: "text-perception", border: "hover:border-perception/40", icon: BrainCircuit, label: "EEG" },
  cardiac: { accent: "text-operator", border: "hover:border-operator/40", icon: HeartPulse, label: "CARDIAC" },
  body: { accent: "text-adaptation", border: "hover:border-adaptation/40", icon: Scale, label: "BODY" },
}

export function SignalCard({ signal }: SignalCardProps) {
  const config = statusConfig[signal.status]
  const group = groupConfig[signal.group]
  const GroupIcon = group.icon
  const pct = signal.reading != null ? Math.min(100, signal.reading * 100) : null
  const thetaPct = signal.theta != null ? signal.theta * 100 : null

  return (
    <motion.div
      className={`p-4 rounded-lg bg-panel/70 border border-border ${group.border} transition-colors relative overflow-hidden bracket-frame`}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <GroupIcon className={`w-3.5 h-3.5 ${group.accent} shrink-0`} />
          <h4 className="text-[11px] font-bold text-foreground tracking-wide uppercase truncate">{signal.name}</h4>
        </div>
        <ConfidenceBadge level={signal.confidence} showLabel={false} />
      </div>
      <p className="text-[10px] text-text-dim mb-3 font-mono leading-relaxed">{signal.description}</p>

      <div className={`px-3 py-2 rounded-sm ${config.bg} border ${config.border} mb-3`}>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-text-dim tracking-[0.16em] uppercase font-mono">Status</span>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${config.color} uppercase tracking-wider font-mono`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} blink-soft`} />
            {signal.status}
          </span>
        </div>
        {signal.value && <div className="mt-1.5 text-[11px] text-foreground/85 font-mono tabular">{signal.value}</div>}
      </div>

      {pct != null && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1 text-[9px] font-mono text-text-dim">
            <span>READING</span>
            {thetaPct != null && <span className="tabular">ref {signal.theta?.toFixed(2)}</span>}
          </div>
          <div className="relative h-1.5 rounded-full bg-obsidian/80 overflow-hidden">
            <motion.div
              className={`absolute inset-y-0 left-0 ${thetaPct != null && pct > thetaPct ? "bg-coral" : "bg-perception"}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            {thetaPct != null && <div className="absolute inset-y-0 w-px bg-amber/80" style={{ left: `${thetaPct}%` }} />}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[9px] text-text-faint font-mono">
        <span className="inline-flex items-center gap-1.5" suppressHydrationWarning>
          <Clock className="w-3 h-3" />
          {format(signal.lastUpdated, "HH:mm:ss")}
        </span>
        {signal.contributesToConfidence && (
          <span className={`inline-flex items-center gap-1 ${group.accent}`}>
            <span className="w-1 h-1 rounded-full bg-current" />
            feeds estimate
          </span>
        )}
      </div>
    </motion.div>
  )
}
