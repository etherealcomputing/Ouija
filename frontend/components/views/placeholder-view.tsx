"use client"

import { ViewShell } from "@/components/ui/view-shell"
import { ResearchPrototypeBadge } from "@/components/brand/research-prototype-badge"
import { DEVICES } from "@/lib/ouija-data"
import { LEGAL_LINKS, LEGAL_PENDING } from "@/lib/legal"
import type { View } from "@/lib/views"
import { Cpu, FileText } from "lucide-react"

const COPY: Partial<Record<View, { title: string; subtitle: string; body: string }>> = {
  trends: {
    title: "Trends",
    subtitle: "Longitudinal body-composition, HRV and mind-state trends",
    body: "Daily Withings panels and session summaries roll up here. Fed by the FastAPI backend's pandas aggregations over the BIDS phenotype/ directory.",
  },
  settings: {
    title: "Settings",
    subtitle: "Cadence protocol, device pairing and export",
    body: "Configure the daily/weekly/monthly capture cadence and the BIDS export targets (personal store, NeuroJSON, periodic OpenNeuro snapshot).",
  },
}

export function PlaceholderView({ view }: { view: View }) {
  if (view === "devices") return <DevicesView />
  const copy = COPY[view] ?? { title: "Coming soon", subtitle: "", body: "" }
  return (
    <ViewShell title={copy.title} subtitle={copy.subtitle}>
      {view === "settings" && <AboutPrototype />}
      <div className="glass-panel rounded-lg p-8">
        <div className="inline-flex items-center gap-2 text-[10px] font-mono text-operator border border-operator/30 rounded px-2 py-1 mb-4 tracking-[0.18em]">
          ROADMAP
        </div>
        <p className="text-sm text-text-dim leading-relaxed max-w-xl">{copy.body}</p>
      </div>
      {view === "settings" && <LegalSection />}
    </ViewShell>
  )
}

function AboutPrototype() {
  return (
    <div className="glass-panel rounded-lg p-6">
      <div className="flex items-center gap-2 mb-3">
        <ResearchPrototypeBadge size="md" />
      </div>
      <p className="text-sm text-text-dim leading-relaxed max-w-xl">
        Ouija is a personal research prototype. It replays a de-identified copy of one person&rsquo;s own
        neuro-imaging and physiological archive to make it legible &mdash; exploratory, not a medical or
        diagnostic device. Nothing here should be used to guide clinical decisions.
      </p>
    </div>
  )
}

function LegalSection() {
  return (
    <div className="glass-panel rounded-lg p-6">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-perception" />
        <h3 className="text-[11px] font-bold text-foreground/90 tracking-[0.18em] uppercase font-display">Legal</h3>
      </div>
      <div className="flex flex-col gap-2">
        {LEGAL_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-perception hover:underline w-fit"
          >
            {l.label}
            {LEGAL_PENDING && <span className="text-text-faint text-[11px]"> · document forthcoming</span>}
          </a>
        ))}
      </div>
    </div>
  )
}

function DevicesView() {
  return (
    <ViewShell title="Devices" subtitle="The personal cadence-protocol hardware">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DEVICES.map((d) => (
          <div key={d.id} className="glass-panel rounded-lg p-4 bracket-frame">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-perception" />
              <h3 className="text-[12px] font-bold text-foreground tracking-wide uppercase">{d.name}</h3>
            </div>
            <div className="text-[10px] text-text-dim font-mono mb-3">{d.vendor}</div>
            <ul className="space-y-1 mb-3">
              {d.modalities.map((m) => (
                <li key={m} className="text-[11px] text-foreground/75 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-operator" />
                  {m}
                </li>
              ))}
            </ul>
            <div className="text-[9px] font-mono text-text-faint border-t border-border pt-2">→ {d.bidsTarget}</div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-text-faint font-mono px-1">
        Real pairing (Neurosity auth, Withings OAuth, UDL serial/BLE) happens on your own machine.
      </p>
    </ViewShell>
  )
}
