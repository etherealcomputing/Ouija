"use client"

import { motion } from "framer-motion"
import type { EventLog as EventLogType } from "@/lib/ouija-data"
import { Clock, PenLine, Cpu, CalendarClock, Radio } from "lucide-react"
import { format } from "date-fns"
import { ConfidenceBadge } from "./confidence-badge"

interface EventLogProps {
  events: EventLogType[]
  maxItems?: number
}

const typeConfig = {
  session: { icon: CalendarClock, color: "text-adaptation", label: "SESSION", rail: "bg-adaptation" },
  note: { icon: PenLine, color: "text-operator", label: "NOTE", rail: "bg-operator" },
  device: { icon: Cpu, color: "text-mint", label: "DEVICE", rail: "bg-mint" },
  signal: { icon: Radio, color: "text-perception", label: "SIGNAL", rail: "bg-perception" },
}

export function EventLog({ events, maxItems = 10 }: EventLogProps) {
  const displayEvents = events.slice(0, maxItems)

  if (displayEvents.length === 0) {
    return <p className="text-[11px] text-text-faint font-mono py-6 text-center">Awaiting the first session event…</p>
  }

  return (
    <div className="space-y-1.5">
      {displayEvents.map((event, index) => {
        const config = typeConfig[event.type]
        const Icon = config.icon

        return (
          <motion.div
            key={event.id}
            className="flex items-start gap-3 p-3 rounded-sm bg-obsidian/40 hover:bg-panel-3/70 transition-colors border border-border relative overflow-hidden group"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.3) }}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${config.rail} opacity-60`} />
            <div className={`mt-0.5 p-1.5 rounded-sm bg-obsidian/70 border border-border ${config.color}`}>
              <Icon className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold tracking-[0.18em] font-mono ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-[9px] text-text-faint font-mono tabular inline-flex items-center gap-1" suppressHydrationWarning>
                  <Clock className="w-3 h-3" />
                  {format(event.timestamp, "HH:mm:ss")}
                </span>
              </div>
              <p className="text-[11px] text-foreground/75 leading-relaxed">{event.message}</p>
              {event.confidence && (
                <div className="mt-2">
                  <ConfidenceBadge level={event.confidence} showLabel={false} />
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
