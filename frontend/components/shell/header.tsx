"use client"

import { Menu, Radio, Layers } from "lucide-react"
import { useTelemetry } from "@/components/ouija/telemetry-provider"
import { useSources } from "@/components/sources/sources-provider"
import { StateChip } from "@/components/ui/state-chip"
import { DemoToggle } from "@/components/shell/demo-toggle"

export function ConsoleHeader({ onOpenNav, onToggleSources }: { onOpenNav: () => void; onToggleSources?: () => void }) {
  const { clockLocal, clockZulu, mindState, frame, connected } = useTelemetry()
  const { counts } = useSources()

  return (
    <header className="glass-header sticky top-0 z-20 px-4 sm:px-5 lg:px-7 py-3 flex items-center gap-3 sm:gap-4">
      <button onClick={onOpenNav} className="lg:hidden text-text-dim hover:text-foreground p-1" aria-label="Open navigation">
        <Menu className="w-5 h-5" />
      </button>

      {onToggleSources && (
        <button
          onClick={onToggleSources}
          aria-label="Toggle sources"
          className="flex items-center gap-1.5 rounded-md border border-border bg-panel-3/40 px-2 py-1 hover:border-perception/40 transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-perception" />
          <span className="hidden sm:inline text-[10px] font-mono text-text-dim tracking-wide">
            Sources · {counts.included}/{counts.total}
          </span>
        </button>
      )}

      <div className="flex items-center gap-2 min-w-0">
        <Radio className={`w-3.5 h-3.5 ${connected ? "text-perception blink-soft" : "text-coral"}`} />
        <span className="text-[11px] font-mono text-text-dim tracking-wide truncate">
          {connected ? "LIVE · streaming" : "OFFLINE"}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-4 sm:gap-5">
        <DemoToggle />
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono tabular text-text-dim" suppressHydrationWarning>
          <span className="text-foreground/80">{clockLocal || "--:--:--"}</span>
          <span className="text-text-faint">·</span>
          <span>{clockZulu || "--:--:--Z"}</span>
        </div>
        {frame && <StateChip state={mindState} size="sm" />}
      </div>
    </header>
  )
}
