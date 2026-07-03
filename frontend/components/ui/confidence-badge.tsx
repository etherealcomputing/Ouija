"use client"

import { motion } from "framer-motion"
import type { ConfidenceLevel } from "@/lib/ouija-data"
import { Activity } from "lucide-react"

interface ConfidenceBadgeProps {
  level: ConfidenceLevel
  showLabel?: boolean
}

const confidenceConfig = {
  low: { label: "LOW", color: "text-coral", bg: "bg-coral/10", border: "border-coral/30", bars: 1 },
  medium: { label: "MED", color: "text-amber", bg: "bg-amber/10", border: "border-amber/30", bars: 2 },
  high: { label: "HIGH", color: "text-mint", bg: "bg-mint/10", border: "border-mint/30", bars: 3 },
}

export function ConfidenceBadge({ level, showLabel = true }: ConfidenceBadgeProps) {
  const config = confidenceConfig[level]

  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-sm ${config.bg} border ${config.border}`}>
      <Activity className={`w-3 h-3 ${config.color}`} />
      <div className="flex gap-0.5 items-end">
        {[1, 2, 3].map((bar) => (
          <motion.div
            key={bar}
            className={`w-1 ${bar <= config.bars ? config.color.replace("text-", "bg-") : "bg-white/10"}`}
            style={{ height: `${4 + bar * 3}px` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: bar * 0.08 }}
          />
        ))}
      </div>
      {showLabel && (
        <span className={`text-[10px] font-bold tracking-wider font-mono ${config.color}`}>{config.label}</span>
      )}
    </div>
  )
}
