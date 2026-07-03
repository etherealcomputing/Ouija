"use client"

import { motion } from "framer-motion"
import type { MindState } from "@/lib/ouija-data"
import { MIND_STATES } from "@/lib/ouija-data"
import { STATE_VISUALS } from "@/lib/state-visuals"
import { Waves, Target, Zap, BatteryLow, type LucideIcon } from "lucide-react"

interface StateChipProps {
  state: MindState
  size?: "sm" | "md" | "lg"
}

const STATE_ICONS: Record<MindState, LucideIcon> = {
  calm: Waves,
  focused: Target,
  stressed: Zap,
  fatigued: BatteryLow,
}

const sizeConfig = {
  sm: "px-2.5 py-1 text-[10px] gap-1",
  md: "px-3 py-1.5 text-[11px] gap-1.5",
  lg: "px-4 py-2 text-xs gap-2",
}

export function StateChip({ state, size = "md" }: StateChipProps) {
  const visual = STATE_VISUALS[state]
  const Icon = STATE_ICONS[state]

  return (
    <motion.div
      className={`inline-flex items-center rounded-md bg-gradient-to-r ${visual.gradient} border ${visual.border} ${visual.text} ${sizeConfig[size]} font-mono tracking-[0.18em] font-semibold backdrop-blur-sm relative overflow-hidden group`}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{ scale: 1.04 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ["-200%", "200%"] }}
        transition={{ duration: 3.4, repeat: Number.POSITIVE_INFINITY, ease: "linear", repeatDelay: 2.4 }}
      />
      <Icon className={`w-3.5 h-3.5 ${visual.glow} relative z-10`} strokeWidth={2.25} />
      <span className="relative z-10">{MIND_STATES[state].label}</span>
    </motion.div>
  )
}
