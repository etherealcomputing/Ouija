"use client"

// BrainHud — the 2D GUI layer painted over the WebGL brain core. Pure overlay:
// corner reticle brackets, a live system readout, an activity meter, and the
// active-region caption. Everything here is pointer-events-none except nothing
// (it never blocks the canvas below), so drag/hover still reach the 3D scene.

import type { SystemStatus } from "@/lib/modalities"
import { SYSTEM_STATUS_META } from "@/lib/modalities"

// Hex per status for the inline glow (the meta map only carries Tailwind classes).
const STATUS_HEX: Record<SystemStatus, string> = {
  offline: "#ff5c8a",
  partial: "#f6b73c",
  nominal: "#3ee6b0",
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base = "absolute w-6 h-6 border-perception/40"
  const map: Record<string, string> = {
    tl: "top-2 left-2 border-t border-l rounded-tl",
    tr: "top-2 right-2 border-t border-r rounded-tr",
    bl: "bottom-2 left-2 border-b border-l rounded-bl",
    br: "bottom-2 right-2 border-b border-r rounded-br",
  }
  return <div className={`${base} ${map[pos]}`} />
}

export function BrainHud({
  status,
  liveCount,
  totalModalities,
  activity,
  activeName,
}: {
  status: SystemStatus
  liveCount: number
  totalModalities: number
  activity: number
  activeName: string | null
}) {
  const meta = SYSTEM_STATUS_META[status]
  const hex = STATUS_HEX[status]
  const pct = Math.round(activity * 100)

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Reticle brackets */}
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />

      {/* Top-left: live system readout */}
      <div className="absolute top-4 left-4 space-y-1.5">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full blink-soft"
            style={{ background: hex, boxShadow: `0 0 8px ${hex}` }}
          />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: hex }}>
            {meta.label}
          </span>
        </div>
        <div className="text-[9px] font-mono text-text-faint tracking-[0.12em]">
          {liveCount}/{totalModalities} MODALITIES · {pct}% CORTICAL DRIVE
        </div>
        {/* Activity meter */}
        <div className="w-28 h-[3px] rounded-full bg-obsidian/70 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg,#b96ce6,#f82090)" }}
          />
        </div>
      </div>

      {/* Center crosshair */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative w-8 h-8 opacity-30">
          <div className="absolute top-1/2 left-0 w-2.5 h-px bg-perception -translate-y-1/2" />
          <div className="absolute top-1/2 right-0 w-2.5 h-px bg-perception -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 h-2.5 w-px bg-perception -translate-x-1/2" />
          <div className="absolute left-1/2 bottom-0 h-2.5 w-px bg-perception -translate-x-1/2" />
        </div>
      </div>

      {/* Bottom-right: active region caption */}
      <div className="absolute bottom-4 right-4 text-right">
        <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-text-faint">Focus</div>
        <div className="text-[11px] font-mono text-perception">{activeName ?? "hover a region"}</div>
      </div>
    </div>
  )
}
