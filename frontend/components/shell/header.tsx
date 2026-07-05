"use client"

import { Menu } from "lucide-react"
import { useTelemetry } from "@/components/ouija/telemetry-provider"
import { StateChip } from "@/components/ui/state-chip"
import { DemoToggle } from "@/components/shell/demo-toggle"
import { LinkDiagnostic } from "@/components/ouija/link-diagnostic"

export function ConsoleHeader({ onOpenNav }: { onOpenNav: () => void }) {
  const { clockLocal, clockZulu, mindState, frame } = useTelemetry()

  return (
    <header className="glass-header sticky top-0 z-20 px-4 sm:px-5 lg:px-7 py-3 flex items-center gap-4">
      <button onClick={onOpenNav} className="lg:hidden text-text-dim hover:text-foreground p-1" aria-label="Open navigation">
        <Menu className="w-5 h-5" />
      </button>

      <LinkDiagnostic />

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
