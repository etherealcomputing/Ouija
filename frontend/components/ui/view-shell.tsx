"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

/** Standard view chrome: animated title block + vertical rhythm. */
export function ViewShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4 sm:space-y-6 max-w-[1500px]"
    >
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-px bg-gradient-to-r from-perception to-transparent" />
          <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-[0.08em]">{title}</h2>
        </div>
        <p className="text-text-dim text-[12px] tracking-wide ml-8">{subtitle}</p>
      </motion.div>
      {children}
    </motion.div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-display tracking-[0.2em] text-text-dim">{children}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

export function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-text-dim">{k}</span>
      <span className={`text-right ${accent ? "text-operator font-medium" : "text-foreground"}`}>{v}</span>
    </div>
  )
}

const kpiAccent: Record<string, string> = {
  perception: "text-perception",
  operator: "text-operator",
  adaptation: "text-adaptation",
  mint: "text-mint",
  neutral: "text-foreground",
}

export function KpiTile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <motion.div
      className="rounded-md border border-border bg-panel/60 px-3.5 py-3 relative overflow-hidden bracket-frame"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <div className="text-[9px] font-mono text-text-dim tracking-[0.14em] mb-1">{label}</div>
      <div className={`font-display text-lg tracking-wide tabular ${kpiAccent[accent] ?? kpiAccent.neutral}`}>{value}</div>
      <div className="text-[9px] text-text-faint mt-0.5 truncate">{sub}</div>
    </motion.div>
  )
}
