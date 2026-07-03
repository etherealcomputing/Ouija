"use client"

import { motion } from "framer-motion"
import type { MindState } from "@/lib/ouija-data"
import { MIND_STATES } from "@/lib/ouija-data"
import { STATE_VISUALS } from "@/lib/state-visuals"

interface StateTimelineProps {
  states: { state: MindState; duration: number }[]
  compact?: boolean
}

export function StateTimeline({ states, compact = false }: StateTimelineProps) {
  const totalDuration = states.reduce((sum, s) => sum + s.duration, 0) || 1

  return (
    <div className="space-y-2.5">
      <div className="flex h-6 overflow-hidden rounded-sm bg-obsidian/70 border border-border relative">
        {states.map((item, index) => {
          const widthPercent = (item.duration / totalDuration) * 100
          return (
            <motion.div
              key={index}
              className={`${STATE_VISUALS[item.state].bg} relative group border-r border-obsidian/60 last:border-r-0`}
              style={{ width: `${widthPercent}%`, opacity: 0.82 }}
              initial={{ width: 0 }}
              animate={{ width: `${widthPercent}%` }}
              transition={{ delay: index * 0.08, duration: 0.6, ease: "easeOut" }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
              {!compact && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-obsidian/60">
                  <span className="text-[10px] text-foreground font-bold font-mono tabular">{item.duration}m</span>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-text-dim font-mono">
          {Array.from(new Set(states.map((s) => s.state))).map((state) => (
            <div key={state} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-[1px] ${STATE_VISUALS[state].bg}`} />
              <span className="uppercase tracking-[0.16em]">{MIND_STATES[state].label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
