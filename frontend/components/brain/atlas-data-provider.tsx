"use client"

// AtlasDataProvider — resolves the brain atlas's per-region values from the
// owner's REAL archive (the included Source Rail sources) plus any manual
// upload. A modality lights ONLY when a real source feeds it — nothing is
// fabricated or simulated. The brain populates region-by-region as the
// archive's captures come online.
//
//   EEG      → cortical regions (from the replayed archive frame, or an upload)
//   Imaging  → temporal + cerebellum (from an included imaging source, or upload)
//   Body     → systemic anchor (from an included Withings/phenotype source)
//   Gut      → systemic anchor (from an included Viome source, or upload)
//
// Sits inside TelemetryProvider so it can read the replayed archive frame.

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react"
import { useTelemetry } from "@/components/ouija/telemetry-provider"
import { useSources } from "@/components/sources/sources-provider"
import { BRAIN_REGIONS, regionValuesFromChannels, type BrainRegion } from "@/lib/brain-atlas"
import {
  MODALITIES,
  MODALITY_BY_ID,
  systemStatus,
  type ModalityId,
  type SystemStatus,
} from "@/lib/modalities"
import type { ParsedUpload } from "@/lib/uploads"
import type { ParsedViome } from "@/lib/viome"
import type { MindState } from "@/lib/ouija-data"

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export interface ModalityStatus {
  id: ModalityId
  label: string
  short: string
  description: string
  devices: string[]
  live: boolean
  /** How this modality became live: device / cardiac / connect / upload / null. */
  via: string | null
  regionCount: number
  poweredRegions: number
}

interface AtlasContextValue {
  source: "live" | "upload"
  uploadLabel: string | null
  warnings: string[]
  regionValues: Record<string, number>
  regionBaseline: Record<string, number>
  channelValues: Record<string, number>
  mindState: MindState
  regionSeries: (regionId: string) => number[]
  // Modality readiness
  modalities: ModalityStatus[]
  liveIds: Set<ModalityId>
  status: SystemStatus
  setUpload: (parsed: ParsedUpload) => void
  clearUpload: () => void
  /** Gut Intelligence (Viome) overall score in 0–1, or null when not fed. */
  gutScore: number | null
  /** Body (Withings) systemic vitality in 0–1, or null when not fed. */
  bodyValue: number | null
  gutLabel: string | null
  setGut: (parsed: ParsedViome) => void
  clearGut: () => void
}

const AtlasContext = createContext<AtlasContextValue | null>(null)

export function useAtlas(): AtlasContextValue {
  const ctx = useContext(AtlasContext)
  if (!ctx) throw new Error("useAtlas must be used within <AtlasDataProvider>")
  return ctx
}

function regionMean(region: BrainRegion, byChannel: Record<string, number[]>): number[] {
  const series = region.channels.map((c) => byChannel[c]).filter(Boolean)
  if (!series.length) return []
  const len = Math.min(...series.map((s) => s.length))
  const out: number[] = []
  for (let i = 0; i < len; i++) out.push(mean(series.map((s) => s[i])))
  return out
}

export function AtlasDataProvider({ children }: { children: ReactNode }) {
  const { frame, channelNames, buffers, mindState } = useTelemetry()
  const { composed } = useSources()
  const [upload, setUploadState] = useState<ParsedUpload | null>(null)
  const [gut, setGutState] = useState<ParsedViome | null>(null)
  const baselineRef = useRef<Record<string, number>>({})

  const value = useMemo<AtlasContextValue>(() => {
    // EEG channel values + rolling windows from the current capture.
    const liveChannels: Record<string, number> = {}
    if (frame) channelNames.forEach((n, i) => (liveChannels[n.toUpperCase()] = frame.eeg[i] ?? 0))
    const byChannel: Record<string, number[]> = {}
    channelNames.forEach((n, i) => (byChannel[n.toUpperCase()] = buffers.eeg[i] ?? []))

    const uploadRegions = upload?.regionValues ?? {}
    const uploadChannels = upload?.channelValues ?? {}
    const uploadHasImaging = MODALITY_BY_ID.imaging.regions.some((r) => r in uploadRegions)

    // Included source archive (the Source Rail) — composed region/gut/body values.
    const composedRegions = composed.regionValues
    const composedHasEeg = MODALITY_BY_ID.eeg.regions.some((r) => r in composedRegions)
    const composedHasImaging = MODALITY_BY_ID.imaging.regions.some((r) => r in composedRegions)
    const composedHasRegions = Object.keys(composedRegions).length > 0

    // Modality live states — a modality lights ONLY from a real included archive
    // source or a real upload. Nothing is fabricated / simulated on click.
    const eegLive = frame != null || Object.keys(uploadChannels).length > 0 || composedHasEeg
    const cardiacLive = false // Autonomic needs a dedicated cardiac source (fast-follow)
    const imagingLive = uploadHasImaging || composedHasImaging
    const bodyLive = composed.bodyValue != null
    const gutLive = gut != null || composed.gutScore != null

    // Assemble region values: capture channels → regions, then upload, then the
    // included archive overlays (the explicit selections win).
    const rv: Record<string, number> = {}
    if (frame != null || Object.keys(uploadChannels).length > 0) {
      Object.assign(rv, regionValuesFromChannels(upload ? uploadChannels : liveChannels))
    }
    Object.assign(rv, uploadRegions)
    Object.assign(rv, composedRegions)

    const source: "live" | "upload" = upload ? "upload" : "live"
    // Only region-value overrides (upload or an archive source that overlays
    // cortical/imaging regions) replace the rolling live trend. A gut/body-only
    // archive source overlays no region, so it must not freeze the live EEG trend.
    const overriding = upload != null || composedHasRegions

    // Baseline for trend (live EEG regions only): mean of the earliest window.
    if (!overriding) {
      for (const r of BRAIN_REGIONS) {
        const series = regionMean(r, byChannel)
        if (series.length >= 8 && baselineRef.current[r.id] == null) {
          baselineRef.current[r.id] = mean(series.slice(0, 8))
        }
      }
    }
    const regionBaseline = overriding ? { ...rv } : baselineRef.current

    const regionSeries = (regionId: string): number[] => {
      if (overriding) return []
      const r = BRAIN_REGIONS.find((x) => x.id === regionId)
      return r ? regionMean(r, byChannel) : []
    }

    const liveIds = new Set<ModalityId>()
    if (eegLive) liveIds.add("eeg")
    if (cardiacLive) liveIds.add("cardiac")
    if (imagingLive) liveIds.add("imaging")
    if (bodyLive) liveIds.add("body")
    if (gutLive) liveIds.add("gut")

    const via: Record<ModalityId, string | null> = {
      eeg: eegLive ? (frame ? "archive" : upload ? "upload" : "archive") : null,
      cardiac: cardiacLive ? "archive" : null,
      imaging: imagingLive ? (composedHasImaging ? "archive" : "upload") : null,
      body: bodyLive ? "archive" : null,
      gut: gutLive ? (gut ? "upload" : "archive") : null,
    }
    const modalities: ModalityStatus[] = MODALITIES.map((m) => ({
      id: m.id,
      label: m.label,
      short: m.short,
      description: m.description,
      devices: m.devices,
      live: liveIds.has(m.id),
      via: via[m.id],
      regionCount: m.regions.length,
      poweredRegions: m.regions.filter((r) => r in rv).length,
    }))

    return {
      source,
      uploadLabel: upload?.label ?? null,
      warnings: upload?.warnings ?? [],
      regionValues: rv,
      regionBaseline,
      channelValues: upload ? uploadChannels : liveChannels,
      mindState,
      regionSeries,
      modalities,
      liveIds,
      status: systemStatus(liveIds),
      setUpload: (p: ParsedUpload) => setUploadState(p),
      clearUpload: () => setUploadState(null),
      gutScore: gut ? gut.gutScore : composed.gutScore ?? null,
      bodyValue: composed.bodyValue ?? null,
      gutLabel: gut?.label ?? null,
      setGut: (p: ParsedViome) => setGutState(p),
      clearGut: () => setGutState(null),
    }
  }, [frame, channelNames, buffers, mindState, upload, gut, composed])

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>
}
