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
  sourceDateLabel,
  temporalKey,
  type ComposedSources,
  type SourceEntry,
  type SourceManifest,
} from "@/lib/sources"
import { regionValuesFromChannels } from "@/lib/brain-atlas"
import { MODALITY_BY_ID, systemStatus, type ModalityId, type SystemStatus } from "@/lib/modalities"

const EMPTY_COMPOSED: ComposedSources = {
  regionValues: {},
  channelValues: {},
  gutScore: null,
  bodyValue: null,
  modalities: new Set(),
  replay: null,
}

/** One stop on the cadence timeline — a capture date the planchette can rest on. */
export interface TimelineStop {
  /** Sortable temporal key (day_offset or parsed date). */
  key: number
  /** Human label — "2026-07-05" or "day 185". */
  dateLabel: string
  /** How many modalities are lit as of this stop (cumulative). */
  modalityCount: number
}

export interface Timeline {
  stops: TimelineStop[]
  /** Index of the stop the current include-set matches, or null when hand-picked. */
  cursorIndex: number | null
  /** True when there is more than one capture date to scrub across. */
  hasCadence: boolean
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
  /** The cadence timeline the planchette scrubs across (from capture dates). */
  timeline: Timeline
  // actions
  toggleInclude: (id: string) => void
  includeAll: () => void
  clearIncluded: () => void
  isIncluded: (id: string) => boolean
  setPreview: (id: string | null) => void
  /** Scrub the planchette to a timeline stop — grounds every capture up to that day. */
  scrubToDay: (stopIndex: number) => void
}

const SourcesContext = createContext<SourcesContextValue | null>(null)

export function useSources(): SourcesContextValue {
  const ctx = useContext(SourcesContext)
  if (!ctx) throw new Error("useSources must be used within <SourcesProvider>")
  return ctx
}

/** Only app-ready sources (with inlined values) can actually ground the brain. */
const isAppReady = (s: SourceEntry) => s.status === "app-ready" && s.app_values != null

/** The regions a source would light — mirrors composeIncluded so hover-preview
 *  and the committed lighting agree (incl. channel-only region-values sources). */
function regionsFor(s: SourceEntry): string[] {
  const v = s.app_values
  if (v && v.type === "region-values") {
    const ids = new Set<string>()
    if (v.channelValues) for (const r of Object.keys(regionValuesFromChannels(v.channelValues))) ids.add(r)
    if (v.regionValues) for (const r of Object.keys(v.regionValues)) ids.add(r)
    if (ids.size) return [...ids]
  }
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
    const appReadySources = sources.filter(isAppReady)

    // Sort included sources oldest→newest so composeIncluded's "later wins"
    // resolves to "the latest capture of each modality wins" (undated first).
    const includedSources = appReadySources
      .filter((s) => includedIds.has(s.id))
      .sort((a, b) => (temporalKey(a) ?? -Infinity) - (temporalKey(b) ?? -Infinity))
    const composed = includedSources.length ? composeIncluded(includedSources) : EMPTY_COMPOSED

    // Coverage = which required modalities the included set grounds.
    const live = new Set<ModalityId>()
    for (const s of includedSources) if (s.modality !== "unknown") live.add(s.modality as ModalityId)
    const coverage = systemStatus(live)

    const preview = previewId ? byId.get(previewId) ?? null : null
    const spotlightRegions = preview ? regionsFor(preview) : []

    // ── Cadence timeline ─────────────────────────────────────────────────
    // One stop per unique capture date among app-ready sources. Scrubbing to a
    // stop grounds every capture up to that day (cumulative "as of day N"),
    // plus any undated app-ready source (a baseline that has no place on the
    // axis). The planchette position is DERIVED from the include-set, so it
    // never desyncs: it rests on a stop only when the includes match exactly.
    const dated = appReadySources.filter((s) => temporalKey(s) != null)
    const undatedIds = appReadySources.filter((s) => temporalKey(s) == null).map((s) => s.id)
    const uniqueKeys = [...new Set(dated.map((s) => temporalKey(s) as number))].sort((a, b) => a - b)
    const idsUpTo = (key: number): Set<string> =>
      new Set([...dated.filter((s) => (temporalKey(s) as number) <= key).map((s) => s.id), ...undatedIds])
    const stopData = uniqueKeys.map((key) => {
      const rep = dated.find((s) => temporalKey(s) === key) as SourceEntry
      const ids = idsUpTo(key)
      const mods = new Set(appReadySources.filter((s) => ids.has(s.id) && s.modality !== "unknown").map((s) => s.modality))
      return { key, dateLabel: sourceDateLabel(rep), modalityCount: mods.size, ids }
    })
    const setEq = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x))
    let cursorIndex: number | null = null
    for (let i = 0; i < stopData.length; i++) {
      if (setEq(includedIds, stopData[i].ids)) { cursorIndex = i; break }
    }
    const timeline: Timeline = {
      stops: stopData.map(({ key, dateLabel, modalityCount }) => ({ key, dateLabel, modalityCount })),
      cursorIndex,
      hasCadence: stopData.length > 1,
    }

    const appReady = appReadySources.length

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
      timeline,
      toggleInclude: setToggle,
      includeAll: () => setIncludedIds(new Set(appReadySources.map((s) => s.id))),
      clearIncluded: () => setIncludedIds(new Set()),
      isIncluded: (id: string) => includedIds.has(id),
      setPreview: setPreviewId,
      scrubToDay: (i: number) => {
        const st = stopData[i]
        if (st) setIncludedIds(new Set(st.ids))
      },
    }
  }, [manifest, includedIds, previewId, loading, isSample])

  return <SourcesContext.Provider value={value}>{children}</SourcesContext.Provider>
}
