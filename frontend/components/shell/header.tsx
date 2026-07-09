"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Menu, Archive, Layers } from "lucide-react"
import { useTelemetry } from "@/components/ouija/telemetry-provider"
import { useSources } from "@/components/sources/sources-provider"
import { StateChip } from "@/components/ui/state-chip"
import { ReplayControl } from "@/components/shell/demo-toggle"
import { T } from "@/lib/motion"

export function ConsoleHeader({ onOpenNav, onToggleSources }: { onOpenNav: () => void; onToggleSources?: () => void }) {
  const { clockLocal, clockZulu, mindState, frame, grounded, archiveLabel, captureLabel } = useTelemetry()
  const { counts } = useSources()

  return (
    <header className="glass-header sticky top-0 z-20 px-4 sm:px-5 lg:px-7 py-3 flex items-center gap-3 sm:gap-4">
      <button
        onClick={onOpenNav}
        className="press tap-target lg:hidden text-text-dim hover:text-foreground p-1 transition-colors duration-150"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {onToggleSources && (
        <button
          onClick={onToggleSources}
          aria-label="Toggle sources"
          className="press flex items-center gap-1.5 rounded-md border border-border bg-panel-3/40 px-2 py-1 hover:border-perception/40 transition-colors duration-200"
        >
          <Layers className="w-3.5 h-3.5 text-perception" />
          <span className="hidden sm:inline text-[10px] font-mono text-text-dim tracking-wide">
            Sources · {counts.included}/{counts.total}
          </span>
        </button>
      )}

      <div className="flex items-center gap-2 min-w-0">
        <Archive className={`w-3.5 h-3.5 transition-colors duration-300 ${grounded ? "text-perception" : "text-text-faint"}`} />
        <span className="text-[11px] font-mono text-text-dim tracking-wide truncate">
          {grounded ? `${archiveLabel}${captureLabel ? ` · ${captureLabel}` : ""}` : "No archive loaded"}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-4 sm:gap-5">
        <ReplayControl />
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono tabular text-text-dim" suppressHydrationWarning>
          <span className="text-foreground/80">{clockLocal || "--:--:--"}</span>
          <span className="text-text-faint">·</span>
          <span>{clockZulu || "--:--:--Z"}</span>
        </div>
        <AnimatePresence>
          {frame && (
            <motion.div key="statechip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T.base}>
              <StateChip state={mindState} size="sm" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
