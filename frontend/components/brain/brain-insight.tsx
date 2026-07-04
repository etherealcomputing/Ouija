"use client"

import { motion } from "framer-motion"
import { useTelemetry } from "@/components/ouija/telemetry-provider"
import { useAtlas } from "./atlas-data-provider"
import { brainInsight } from "@/lib/insights"
import { Sparkles, ArrowRight } from "lucide-react"

/** The plain-English read of the whole brain — for a normal person. */
export function BrainInsight() {
  const { mindState, frame } = useTelemetry()
  const { status } = useAtlas()
  if (!frame) return null
  const insight = brainInsight(mindState, status)

  return (
    <motion.div
      key={insight.headline}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-panel-elevated rounded-lg p-5 relative overflow-hidden"
    >
      <div className="holo-shimmer absolute inset-0 opacity-40 pointer-events-none" />
      <div className="flex items-start gap-3 relative">
        <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg grid place-items-center bg-perception/12 border border-perception/30">
          <Sparkles className="w-4 h-4 text-perception" />
        </div>
        <div className="min-w-0">
          <div className="text-[9px] font-mono text-text-dim tracking-[0.2em] uppercase">Your brain, right now</div>
          <h2 className="font-display text-xl sm:text-2xl text-foreground mt-1 tracking-wide">{insight.headline}</h2>
          <p className="text-[13px] text-foreground/80 mt-1.5 leading-relaxed max-w-2xl">{insight.detail}</p>
          <div className="mt-3 inline-flex items-start gap-2 text-[12px] text-perception">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="leading-relaxed">{insight.action}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
