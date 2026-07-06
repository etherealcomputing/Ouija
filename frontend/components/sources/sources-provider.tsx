"use client"

// SourcesProvider — loads the source manifest, holds the "included" set (which
// archived sources are grounding the brain right now), and composes their
// app-facing values into one atlas contribution. The Source Rail renders the
// manifest + selection; AtlasDataProvider overlays `composed` onto the live
// atlas so including a source literally lights the regions it powers.
//
// Selection is the whole interaction model: including a source grounds the read
// AND (later) seeds Demo-from-your-archive — one gesture, per the design spec.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  composeIncluded,
  loadManifest,
  type ComposedSources,
  type SourceEntry,
  type SourceManifest,
} from "@/lib/sources"
import { MODALITY_BY_ID, systemStatus, type ModalityId, type SystemStatus } from "@/lib/modalities"

const EMPTY_COMPOSED: ComposedSources = {
  regionValues: {},
  channelValues: {},
  gutScore: null,
  bodyValue: null,
  modalities: new Set(),
  replay: null,
}

interface SourcesContextValue {
  loading: boolean
  /** True when the committed sample template is in use (real sources.json absent). */
  isSample: boolean
  manifest: SourceManifest | null
  sources: SourceEntry[]
  includedIds: Set<string>
  includedSources: SourceEntry[]
  composed: ComposedSources
  /** Region ids a hovered source would light (preview before commit). */
  spotlightRegions: string[]
  previewId: string | null
  /** Modality coverage of the included set → the rail's OFFLINE/PARTIAL/NOMINAL ring. */
  coverage: SystemStatus
  counts: { total: number; appReady: number; included: number }
  // actions
  toggleInclude: (id: string) => void
  includeAll: () => void
  clearIncluded: () => void
  isIncluded: (id: string) => boolean
  setPreview: (id: string | null) => void
}

const SourcesContext = createContext<SourcesContextValue | null>(null)

export function useSources(): SourcesContextValue {
  const ctx = useContext(SourcesContext)
  if (!ctx) throw new Error("useSources must be used within <SourcesProvider>")
  return ctx
}

/** Only app-ready sources (with inlined values) can actually ground the brain. */
const isAppReady = (s: SourceEntry) => s.status === "app-ready" && s.app_values != null

/** The regions a source would light: its own values if app-ready, else its modality's. */
function regionsFor(s: SourceEntry): string[] {
  const v = s.app_values
  if (v && v.type === "region-values" && v.regionValues) return Object.keys(v.regionValues)
  const def = MODALITY_BY_ID[s.modality as ModalityId]
  return def ? def.regions : []
}

export function SourcesProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [isSample, setIsSample] = useState(false)
  const [manifest, setManifest] = useState<SourceManifest | null>(null)
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set())
  const [previewId, setPreviewId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadManifest()
      .then((res) => {
        if (!alive) return
        if (res) {
          setManifest(res.manifest)
          setIsSample(res.isSample)
        }
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const value = useMemo<SourcesContextValue>(() => {
    const sources = manifest?.sources ?? []
    const byId = new Map(sources.map((s) => [s.id, s]))
    const includedSources = sources.filter((s) => includedIds.has(s.id) && isAppReady(s))
    const composed = includedSources.length ? composeIncluded(includedSources) : EMPTY_COMPOSED

    // Coverage = which required modalities the included set grounds.
    const live = new Set<ModalityId>()
    for (const s of includedSources) if (s.modality !== "unknown") live.add(s.modality as ModalityId)
    const coverage = systemStatus(live)

    const preview = previewId ? byId.get(previewId) ?? null : null
    const spotlightRegions = preview ? regionsFor(preview) : []

    const appReady = sources.filter(isAppReady).length

    const setToggle = (id: string) => {
      const s = byId.get(id)
      if (!s || !isAppReady(s)) return // only app-ready sources can ground the brain
      setIncludedIds((prev) => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
      })
    }

    return {
      loading,
      isSample,
      manifest,
      sources,
      includedIds,
      includedSources,
      composed,
      spotlightRegions,
      previewId,
      coverage,
      counts: { total: sources.length, appReady, included: includedSources.length },
      toggleInclude: setToggle,
      includeAll: () => setIncludedIds(new Set(sources.filter(isAppReady).map((s) => s.id))),
      clearIncluded: () => setIncludedIds(new Set()),
      isIncluded: (id: string) => includedIds.has(id),
      setPreview: setPreviewId,
    }
  }, [manifest, includedIds, previewId, loading, isSample])

  return <SourcesContext.Provider value={value}>{children}</SourcesContext.Provider>
}
