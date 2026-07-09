"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"
import { DUR, EASE, LIFT, T, fadeUp } from "@/lib/motion"

/** Standard view chrome: animated title block + vertical rhythm. The view-to-
 *  view exit is driven by the AnimatePresence in page.tsx; this handles enter. */
export function ViewShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.slow, ease: EASE.emphasized }}
      className="space-y-4 sm:space-y-6 max-w-[1500px]"
    >
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...T.enter, delay: 0.06 }}>
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

/** A row of KpiTiles that cascades its tiles in. Wrap the KPI strip in this. */
export function KpiStrip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045 } } }}
      initial="hidden"
      animate="show"
    >
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

export function KpiTile({ label, value, sub, accent }: { label: string; value: ReactNode; sub: string; accent: string }) {
  return (
    <motion.div
      className="rounded-md border border-border bg-panel/60 px-3.5 py-3 relative overflow-hidden bracket-frame"
      variants={fadeUp}
      whileHover={LIFT}
      transition={T.base}
    >
      <div className="text-[9px] font-mono text-text-dim tracking-[0.14em] mb-1">{label}</div>
      <div className={`font-display text-lg tracking-wide tabular ${kpiAccent[accent] ?? kpiAccent.neutral}`}>{value}</div>
      <div className="text-[9px] text-text-faint mt-0.5 truncate">{sub}</div>
    </motion.div>
  )
}
