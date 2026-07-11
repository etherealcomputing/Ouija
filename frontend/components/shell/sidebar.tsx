"use client"

import { motion } from "framer-motion"
import { NAVIGATION, type View } from "@/lib/views"
import { useTelemetry } from "@/components/ouija/telemetry-provider"
import { EtherealMark } from "@/components/brand/ethereal-mark"
import { ResearchPrototypeBadge } from "@/components/brand/research-prototype-badge"
import { SPRING, fadeUp, staggerContainer } from "@/lib/motion"
import { X } from "lucide-react"

export function SidebarContent({
  currentView,
  onNavigate,
  onClose,
  idPrefix = "nav",
}: {
  currentView: View
  onNavigate: (view: View) => void
  onClose?: () => void
  idPrefix?: string
}) {
  const { grounded, archiveLabel, captureLabel } = useTelemetry()

  return (
    <div className="flex flex-col h-full">
      {/* Brand lockup */}
      <div className="px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative grid place-items-center shrink-0 -my-1" style={{ filter: "drop-shadow(0 0 10px rgba(248,32,144,0.45))" }}>
            <EtherealMark size={48} />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-display text-base tracking-[0.14em] text-foreground leading-none">OUIJA</span>
              <ResearchPrototypeBadge />
            </div>
            <div className="text-[9px] text-text-dim font-mono tracking-[0.12em] mt-1">God View for Your Brain</div>
            <a
              href="https://www.etherealcomputing.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[8px] text-perception/85 font-mono tracking-[0.16em] mt-0.5 lowercase no-underline"
            >
              ethereal computing
            </a>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="press tap-target lg:hidden text-text-dim hover:text-foreground p-1 transition-colors duration-150"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav — items cascade in (once on desktop mount, each time the drawer opens). */}
      <motion.nav
        className="flex-1 px-3 py-2 space-y-1 overflow-y-auto"
        aria-label="Console views"
        variants={staggerContainer(0.04)}
        initial="hidden"
        animate="show"
      >
        {NAVIGATION.map((item) => {
          const active = item.id === currentView
          const Icon = item.icon
          return (
            <motion.button
              key={item.id}
              id={`${idPrefix}-${item.id}`}
              variants={fadeUp}
              onClick={() => onNavigate(item.id)}
              aria-current={active ? "page" : undefined}
              className={`press w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] transition-colors duration-200 relative group ${
                active
                  ? "bg-perception/10 text-perception border border-perception/30"
                  : "text-text-dim hover:text-foreground hover:bg-panel-3/60 border border-transparent"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`${idPrefix}-active`}
                  transition={SPRING.glide}
                  className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-perception"
                />
              )}
              <motion.span animate={{ scale: active ? 1.12 : 1 }} transition={SPRING.snappy} className="shrink-0">
                <Icon className="w-4 h-4" />
              </motion.span>
              <span className="font-medium tracking-wide">{item.label}</span>
              {item.roadmap && (
                <span className="ml-auto text-[8px] font-mono text-text-faint border border-border rounded px-1 py-0.5 tracking-wider">SOON</span>
              )}
              {item.shortcut && !item.roadmap && (
                <span className="ml-auto text-[9px] font-mono text-text-faint">{item.shortcut}</span>
              )}
            </motion.button>
          )
        })}
      </motion.nav>

      {/* Archive status footer */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${grounded ? "bg-mint blink-soft" : "bg-text-faint/40"}`}
            style={grounded ? { boxShadow: "0 0 7px var(--color-mint)" } : undefined}
          />
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-foreground/80 truncate">{archiveLabel}</div>
            <div className="text-[9px] font-mono text-text-faint tracking-wider uppercase">
              {grounded ? `reading · ${captureLabel ?? "latest capture"}` : "nothing loaded"}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[9px] text-text-faint font-mono leading-relaxed">Not a diagnostic instrument.</p>
      </div>
    </div>
  )
}
