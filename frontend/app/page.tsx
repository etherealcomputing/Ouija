"use client"

import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Layers } from "lucide-react"
import { TelemetryProvider } from "@/components/ouija/telemetry-provider"
import { SourcesProvider, useSources } from "@/components/sources/sources-provider"
import { SourceRail } from "@/components/sources/source-rail"
import { AtlasDataProvider } from "@/components/brain/atlas-data-provider"
import { SidebarContent } from "@/components/shell/sidebar"
import { ConsoleHeader } from "@/components/shell/header"
import { ConsoleFooter } from "@/components/shell/footer"
import { ConsoleView } from "@/components/views/console-view"
import { BrainView } from "@/components/views/brain-view"
import { PlaceholderView } from "@/components/views/placeholder-view"
import { NAVIGATION, type View } from "@/lib/views"
import { DUR, T, useMotionPrefs } from "@/lib/motion"
import { useFocusTrap } from "@/lib/use-focus-trap"

const STATUS_HEX: Record<string, string> = { offline: "#ff5c8a", partial: "#f6b73c", nominal: "#3ee6b0" }

export default function OuijaConsole() {
  return (
    <SourcesProvider>
      <TelemetryProvider>
        <AtlasDataProvider>
          <ConsoleLayout />
        </AtlasDataProvider>
      </TelemetryProvider>
    </SourcesProvider>
  )
}

/** The 44px collapsed spine for the persistent sources rail (xl+). */
function SourcesSpine({ onOpen }: { onOpen: () => void }) {
  const { coverage, counts } = useSources()
  return (
    <button
      onClick={onOpen}
      aria-label="Open sources"
      className="press h-full w-11 flex flex-col items-center gap-3 pt-4 text-text-dim hover:text-foreground transition-colors duration-200"
    >
      <Layers className="w-4 h-4 text-perception" />
      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_HEX[coverage], boxShadow: `0 0 8px ${STATUS_HEX[coverage]}` }} />
      <span className="text-[9px] font-mono tracking-[0.14em]" style={{ writingMode: "vertical-rl" }}>
        SOURCES · {counts.included}/{counts.total}
      </span>
    </button>
  )
}

function renderView(view: View, onNavigate: (view: View) => void): ReactNode {
  switch (view) {
    case "console":
      return <ConsoleView onNavigate={onNavigate} />
    case "brain":
      return <BrainView />
    default:
      return <PlaceholderView view={view} />
  }
}

const ConsoleMain = memo(function ConsoleMain({
  currentView,
  onNavigate,
}: {
  currentView: View
  onNavigate: (view: View) => void
}) {
  const { reduced } = useMotionPrefs()
  return (
    <main id="console-main" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-7 outline-none">
      {/* View-to-view crossfade: the outgoing pane accelerates out, then the
          incoming pane's ViewShell plays its own entrance (mode="wait"). */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={false}
          exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -8, transition: T.exit }}
        >
          {renderView(currentView, onNavigate)}
        </motion.div>
      </AnimatePresence>
    </main>
  )
})

function ConsoleLayout() {
  const [currentView, setCurrentView] = useState<View>("console")
  const [navOpen, setNavOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const { reduced } = useMotionPrefs()
  const navDrawerRef = useRef<HTMLElement>(null)
  const sourcesDrawerRef = useRef<HTMLElement>(null)
  useFocusTrap(navDrawerRef, navOpen)
  useFocusTrap(sourcesDrawerRef, sourcesOpen)

  const navigate = useCallback((view: View) => {
    setCurrentView(view)
    setNavOpen(false)
    setSourcesOpen(false)
  }, [])

  // Digit shortcuts (1–6) jump views; 'S' toggles the sources rail; suppressed while typing.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = (target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) || target?.isContentEditable
      if (e.metaKey || e.ctrlKey || e.altKey || typing) return
      if (e.key === "Escape") {
        setNavOpen(false)
        setSourcesOpen(false)
        return
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault()
        setSourcesOpen((v) => !v)
        return
      }
      const item = NAVIGATION.find((n) => n.shortcut === e.key)
      if (item) {
        e.preventDefault()
        setCurrentView(item.id)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-card to-background text-foreground overflow-hidden">
      <a
        href="#console-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[10000] focus:top-3 focus:left-3 focus:px-3 focus:py-2 focus:rounded-md focus:bg-perception focus:text-obsidian focus:text-[12px] focus:font-medium"
      >
        Skip to main content
      </a>

      <div className="fixed inset-0 opacity-60 grid-overlay pointer-events-none" />

      {/* Ambient pink/violet glows */}
      <div className="fixed inset-0 opacity-40 pointer-events-none" aria-hidden="true">
        <motion.div
          className="absolute top-[8%] left-[18%] w-[34rem] h-[34rem] bg-perception/10 rounded-full blur-[150px]"
          animate={reduced ? { opacity: 0.28 } : { scale: [1, 1.25, 1], opacity: [0.18, 0.4, 0.18], x: [0, 40, 0] }}
          transition={reduced ? { duration: 0 } : { duration: 16, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[10%] right-[16%] w-[38rem] h-[38rem] bg-operator/10 rounded-full blur-[170px]"
          animate={reduced ? { opacity: 0.28 } : { scale: [1.25, 1, 1.25], opacity: [0.4, 0.18, 0.4], x: [0, -50, 0] }}
          transition={reduced ? { duration: 0 } : { duration: 19, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </div>

      {/* Static sidebar — desktop */}
      <aside className="relative w-72 shrink-0 glass-sidebar z-10 scan-line-container hidden lg:flex flex-col">
        <SidebarContent currentView={currentView} onNavigate={navigate} />
      </aside>

      {/* Drawer sidebar — tablet / mobile */}
      <AnimatePresence>
        {navOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-obsidian/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNavOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              ref={navDrawerRef}
              className="fixed inset-y-0 left-0 z-40 w-[300px] max-w-[85vw] glass-sidebar flex flex-col lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Console navigation"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            >
              <SidebarContent currentView={currentView} onNavigate={navigate} onClose={() => setNavOpen(false)} idPrefix="drawer" />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Persistent sources rail — xl+ (44px spine when closed, never squeezes the brain) */}
      <aside
        className="hidden xl:flex shrink-0 glass-sidebar z-10 flex-col overflow-hidden transition-[width] duration-300"
        style={{ width: sourcesOpen ? 320 : 44 }}
        aria-label="Data sources"
      >
        {/* Content crossfades in as the width tweens, instead of popping. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={sourcesOpen ? "rail" : "spine"}
            className="h-full min-h-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : DUR.base, delay: reduced ? 0 : sourcesOpen ? 0.08 : 0 }}
          >
            {sourcesOpen ? (
              <SourceRail onNavigate={navigate} onClose={() => setSourcesOpen(false)} />
            ) : (
              <SourcesSpine onOpen={() => setSourcesOpen(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </aside>

      {/* Sources drawer — below xl */}
      <AnimatePresence>
        {sourcesOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-obsidian/70 backdrop-blur-sm xl:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSourcesOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              ref={sourcesDrawerRef}
              className="fixed inset-y-0 left-0 z-40 w-[340px] max-w-[88vw] glass-sidebar flex flex-col xl:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Data sources"
              initial={{ x: -360 }}
              animate={{ x: 0 }}
              exit={{ x: -360 }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            >
              <SourceRail onNavigate={navigate} onClose={() => setSourcesOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        <ConsoleHeader onOpenNav={() => setNavOpen(true)} onToggleSources={() => setSourcesOpen((v) => !v)} />
        <ConsoleMain currentView={currentView} onNavigate={navigate} />
        <ConsoleFooter />
      </div>
    </div>
  )
}
