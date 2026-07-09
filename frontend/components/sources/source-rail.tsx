"use client"

// SourceRail — the toggleable "Séance" grounding rail. It itemizes the user's
// archived neuro/health files from the manifest; including a source literally
// lights the brain regions it powers (hover previews first), and the same
// selection seeds Demo-from-your-archive. Reads the SourcesProvider; commits go
// through the AtlasDataProvider overlay. Reuses the app's glass/pink primitives.

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useSources } from "./sources-provider"
import { regionValuesFromChannels } from "@/lib/brain-atlas"
import { groupByModality, modalityLabel, sourceDateLabel, type SourceEntry, type Modality } from "@/lib/sources"
import { SYSTEM_STATUS_META, type SystemStatus } from "@/lib/modalities"
import { SPRING, fadeUp, staggerContainer } from "@/lib/motion"
import type { View } from "@/lib/views"
import {
  BrainCircuit, HeartPulse, Scan, Scale, Dna, FileQuestion, Check, Terminal,
  Layers, Search, X, type LucideIcon,
} from "lucide-react"

const MODALITY_ICON: Record<Modality, LucideIcon> = {
  eeg: BrainCircuit, cardiac: HeartPulse, imaging: Scan, body: Scale, gut: Dna, unknown: FileQuestion,
}
const STATUS_HEX: Record<SystemStatus, string> = { offline: "#ff5c8a", partial: "#f6b73c", nominal: "#3ee6b0" }

/** A short human read of what including a source lights up. Region-values
 *  sources light regions directly or via their channels (EEG); gut/phenotype
 *  feed a systemic anchor rather than a cortical region. */
function lightsLabel(s: SourceEntry): string {
  const v = s.app_values
  if (v?.type === "region-values") {
    const ids = new Set<string>()
    if (v.regionValues) for (const r of Object.keys(v.regionValues)) ids.add(r)
    if (v.channelValues) for (const r of Object.keys(regionValuesFromChannels(v.channelValues))) ids.add(r)
    if (ids.size) return `lights ${ids.size} region${ids.size === 1 ? "" : "s"}`
  }
  if (v?.type === "gut-scores") return `gut ${v.gutScore.toFixed(2)}`
  return "systemic"
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  "app-ready": { label: "LIVE", cls: "text-mint border-mint/40" },
  convertible: { label: "CONVERT", cls: "text-amber border-amber/40" },
  raw: { label: "RAW", cls: "text-text-faint border-border" },
  review: { label: "REVIEW", cls: "text-coral border-coral/40" },
}

function CoverageRing({ status }: { status: SystemStatus }) {
  const hex = STATUS_HEX[status]
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${status !== "offline" ? "blink-soft" : ""}`}
      style={{ background: hex, boxShadow: `0 0 8px ${hex}` }}
      aria-hidden
    />
  )
}

function SourceRow({ source }: { source: SourceEntry }) {
  const { isIncluded, toggleInclude, setPreview } = useSources()
  const appReady = source.status === "app-ready" && source.app_values != null
  const included = isIncluded(source.id)
  const Icon = MODALITY_ICON[source.modality] ?? FileQuestion
  const pill = STATUS_STYLE[source.status] ?? STATUS_STYLE.raw
  const meta = [sourceDateLabel(source), source.fmt, source.kind.toUpperCase()].join(" · ")

  return (
    <motion.div
      variants={fadeUp}
      onMouseEnter={() => appReady && setPreview(source.id)}
      onMouseLeave={() => setPreview(null)}
      whileHover={appReady ? { y: -1, scale: 1.008 } : undefined}
      transition={SPRING.snappy}
      className={`flex items-start gap-2.5 px-2.5 py-2 rounded-md border transition-colors duration-200 ${
        included
          ? "border-perception/45 bg-perception/8"
          : appReady
            ? "border-border bg-obsidian/40 hover:border-perception/30 hover:bg-obsidian/60"
            : "border-border bg-obsidian/40 opacity-60"
      }`}
    >
      {/* Include toggle (only meaningful for app-ready sources) */}
      <button
        type="button"
        role="switch"
        aria-checked={included}
        disabled={!appReady}
        aria-label={`${included ? "Remove" : "Include"} ${source.label}`}
        onClick={() => toggleInclude(source.id)}
        className={`press mt-0.5 relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200 ${
          included ? "bg-perception/80" : "bg-panel-3"
        } ${appReady ? "" : "cursor-not-allowed"}`}
      >
        <motion.span className="inline-block h-3 w-3 rounded-full bg-foreground shadow" animate={{ x: included ? 14 : 2 }} transition={SPRING.snappy} />
      </button>

      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-colors duration-200 ${included ? "text-perception" : "text-text-faint"}`} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-foreground/90 truncate">{source.label}</span>
          <span className={`ml-auto shrink-0 text-[7px] font-mono tracking-wider border rounded px-1 py-px ${pill.cls}`}>{pill.label}</span>
        </div>
        <div className="text-[9px] font-mono text-text-faint truncate">{meta}</div>
        {appReady ? (
          <div className="text-[9px] font-mono text-perception/80 mt-0.5">{lightsLabel(source)}</div>
        ) : source.converter ? (
          <div className="mt-1 flex items-center gap-1 text-[8px] font-mono text-amber/90 truncate" title={`python -m ${source.converter}`}>
            <Terminal className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">python -m {source.converter}</span>
          </div>
        ) : (
          <div className="text-[9px] font-mono text-text-faint mt-0.5">{source.note}</div>
        )}
      </div>
    </motion.div>
  )
}

export function SourceRail({ onNavigate, onClose }: { onNavigate?: (v: View) => void; onClose?: () => void }) {
  const { sources, loading, isSample, coverage, counts, includeAll, clearIncluded } = useSources()
  const [filter, setFilter] = useState("")

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return sources
    return sources.filter((s) => s.label.toLowerCase().includes(q) || s.modality.includes(q) || s.fmt.toLowerCase().includes(q))
  }, [sources, filter])
  const groups = useMemo(() => groupByModality(filtered), [filtered])
  const meta = SYSTEM_STATUS_META[coverage]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
        <Layers className="w-4 h-4 text-perception" />
        <h2 className="font-display text-[13px] tracking-[0.14em] text-foreground">SOURCES</h2>
        <span className="ml-auto text-[9px] font-mono text-text-faint">
          {counts.total} files · {counts.appReady} ready
        </span>
        {onClose && (
          <button onClick={onClose} className="press tap-target text-text-dim hover:text-foreground p-0.5 transition-colors duration-150" aria-label="Close sources">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grounding coverage */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CoverageRing status={coverage} />
          <span className="text-[11px] text-foreground/90">
            Grounding the brain from <span className="text-perception font-medium">{counts.included}</span> of {counts.total} sources
          </span>
        </div>
        <div className="text-[9px] font-mono uppercase tracking-[0.16em] mt-1" style={{ color: STATUS_HEX[coverage] }}>
          {meta.label}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-2.5 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <button onClick={includeAll} className="press text-[10px] font-mono text-perception border border-perception/40 rounded px-2 py-1 hover:bg-perception/10 transition-colors duration-200">
            Include all
          </button>
          <button onClick={clearIncluded} className="press text-[10px] font-mono text-text-dim border border-border rounded px-2 py-1 hover:text-foreground transition-colors duration-200">
            Clear
          </button>
        </div>
        <div className="group relative">
          <Search className="w-3 h-3 text-text-faint group-focus-within:text-perception transition-colors duration-200 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter sources…"
            className="w-full bg-obsidian/60 border border-border rounded pl-6 pr-2 py-1.5 text-[11px] text-foreground placeholder:text-text-faint focus:border-perception/40 transition-colors duration-200 outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {loading ? (
          <div className="text-center text-[11px] font-mono text-text-faint py-8">Loading sources…</div>
        ) : !sources.length ? (
          <div className="text-center text-[11px] text-text-dim py-8 px-3 leading-relaxed">
            No source manifest found. Run <span className="font-mono text-perception">build_manifest.py</span> on your data
            folder (see docs/using-your-data.md) to itemize your archive here.
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.modality}>
              <div className="flex items-center gap-2 px-1 mb-1.5">
                <span className="text-[9px] font-mono tracking-[0.18em] uppercase text-text-dim">{modalityLabel(g.modality)}</span>
                <span className="text-[9px] font-mono text-text-faint">{g.items.length}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <motion.div className="space-y-1.5" variants={staggerContainer(0.03)} initial="hidden" animate="show">
                {g.items.map((s) => <SourceRow key={s.id} source={s} />)}
              </motion.div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        {isSample && (
          <p className="text-[9px] font-mono text-amber/90 leading-relaxed mb-1.5">
            Showing a sample archive. Drop your real <span className="text-foreground">sources.json</span> into public/ to use your data.
          </p>
        )}
        <p className="text-[9px] font-mono text-text-faint leading-relaxed">
          Include a source to ground the brain from it. Convert the amber ones first — nothing unconverted reads as live.
        </p>
      </div>
    </div>
  )
}
