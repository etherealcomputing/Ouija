"use client"

import { memo, useCallback, useEffect, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { TelemetryProvider } from "@/components/ouija/telemetry-provider"
import { AtlasDataProvider } from "@/components/brain/atlas-data-provider"
import { SidebarContent } from "@/components/shell/sidebar"
import { ConsoleHeader } from "@/components/shell/header"
import { ConsoleFooter } from "@/components/shell/footer"
import { DashboardView } from "@/components/views/dashboard-view"
import { SignalsView } from "@/components/views/signals-view"
import { BrainView } from "@/components/views/brain-view"
import { PlaceholderView } from "@/components/views/placeholder-view"
import { NAVIGATION, type View } from "@/lib/views"

export default function OuijaConsole() {
  return (
    <TelemetryProvider>
      <AtlasDataProvider>
        <ConsoleLayout />
      </AtlasDataProvider>
    </TelemetryProvider>
  )
}

const VIEWS: Record<View, () => ReactNode> = {
  dashboard: () => <DashboardView />,
  signals: () => <SignalsView />,
  brain: () => <BrainView />,
  trends: () => <PlaceholderView view="trends" />,
  devices: () => <PlaceholderView view="devices" />,
  settings: () => <PlaceholderView view="settings" />,
}

const ConsoleMain = memo(function ConsoleMain({ currentView }: { currentView: View }) {
  return (
    <main id="console-main" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-7 outline-none">
      <div key={currentView}>{VIEWS[currentView]()}</div>
    </main>
  )
})

function ConsoleLayout() {
  const [currentView, setCurrentView] = useState<View>("brain")
  const [navOpen, setNavOpen] = useState(false)

  const navigate = useCallback((view: View) => {
    setCurrentView(view)
    setNavOpen(false)
  }, [])

  // Digit shortcuts (1–6) jump views; suppressed while typing.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = (target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) || target?.isContentEditable
      if (e.metaKey || e.ctrlKey || e.altKey || typing) return
      if (e.key === "Escape") {
        setNavOpen(false)
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
          animate={{ scale: [1, 1.25, 1], opacity: [0.18, 0.4, 0.18], x: [0, 40, 0] }}
          transition={{ duration: 16, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[10%] right-[16%] w-[38rem] h-[38rem] bg-operator/10 rounded-full blur-[170px]"
          animate={{ scale: [1.25, 1, 1.25], opacity: [0.4, 0.18, 0.4], x: [0, -50, 0] }}
          transition={{ duration: 19, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
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

      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        <ConsoleHeader onOpenNav={() => setNavOpen(true)} />
        <ConsoleMain currentView={currentView} />
        <ConsoleFooter />
      </div>
    </div>
  )
}
