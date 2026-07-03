"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface SummaryCardProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  action?: ReactNode
  /** Section-accent for the header rule + icon. */
  accent?: "perception" | "operator" | "adaptation" | "neutral" | "mint" | "amber"
  /** Optional small meta string shown at top-right of the header. */
  meta?: ReactNode
  className?: string
}

const accentMap = {
  perception: { text: "text-perception", bar: "bg-perception" },
  operator: { text: "text-operator", bar: "bg-operator" },
  adaptation: { text: "text-adaptation", bar: "bg-adaptation" },
  neutral: { text: "text-operator", bar: "bg-operator" },
  mint: { text: "text-mint", bar: "bg-mint" },
  amber: { text: "text-amber", bar: "bg-amber" },
}

export function SummaryCard({ title, icon, children, action, accent = "neutral", meta, className = "" }: SummaryCardProps) {
  const a = accentMap[accent]

  return (
    <motion.div
      className={`glass-panel p-5 rounded-lg relative overflow-hidden group ${className}`}
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      {/* instrument-frame corner brackets - perception (TL) · operator (BR) emphasized */}
      <span className="pointer-events-none absolute -top-px -left-px w-3.5 h-3.5 border-t-[1.5px] border-l-[1.5px] border-perception/55 rounded-tl-[3px] transition-all duration-300 group-hover:w-4 group-hover:h-4 group-hover:border-perception/80" />
      <span className="pointer-events-none absolute -top-px -right-px w-2.5 h-2.5 border-t border-r border-perception/20 rounded-tr-[3px]" />
      <span className="pointer-events-none absolute -bottom-px -left-px w-2.5 h-2.5 border-b border-l border-operator/20 rounded-bl-[3px]" />
      <span className="pointer-events-none absolute -bottom-px -right-px w-3.5 h-3.5 border-b-[1.5px] border-r-[1.5px] border-operator/55 rounded-br-[3px] transition-all duration-300 group-hover:w-4 group-hover:h-4 group-hover:border-operator/80" />

      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-border relative">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-[3px] h-3.5 ${a.bar} rounded-full opacity-80 shrink-0`} />
          {icon && (
            <motion.div className={`${a.text} opacity-80 group-hover:opacity-100 transition-opacity`}>{icon}</motion.div>
          )}
          <h3 className="text-[11px] font-bold text-foreground/90 tracking-[0.18em] uppercase font-display truncate">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          {meta && <span className="text-[9px] text-text-faint font-mono tabular tracking-wider">{meta}</span>}
          {action}
        </div>
      </div>

      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
