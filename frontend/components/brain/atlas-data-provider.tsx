"use client"

// AtlasDataProvider — resolves the brain atlas's per-region values from the
// live modalities, and tracks which modalities are online so the brain can
// populate region-by-region toward a NOMINAL system state.
//
//   EEG      → cortical regions (live from the device adapter, or an upload)
//   Cardiac  → limbic (from the frame's HRV)
//   Imaging  → temporal + cerebellum (connect toggle → simulated, or upload)
//   Body     → systemic (connect toggle)
//
// Sits inside TelemetryProvider so it can read live frames + buffers.

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react"
import { useTelemetry } from "@/components/ouija/telemetry-provider"
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
  imagingConnected: boolean
  bodyConnected: boolean
  gutConnected: boolean
  connectImaging: () => void
  connectBody: () => void
  connectGut: () => void
  disconnectImaging: () => void
  disconnectBody: () => void
  disconnectGut: () => void
  setUpload: (parsed: ParsedUpload) => void
  clearUpload: () => void
  /** Gut Intelligence (Viome) overall score in 0–1, or null when not fed. */
  gutScore: number | null
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

const hrvToValue = (hrv: number) => clamp01((hrv - 18) / 72)

export function AtlasDataProvider({ children }: { children: ReactNode }) {
  const { frame, channelNames, buffers, mindState } = useTelemetry()
  const [upload, setUploadState] = useState<ParsedUpload | null>(null)
  const [gut, setGutState] = useState<ParsedViome | null>(null)
  const [imagingConnected, setImagingConnected] = useState(false)
  const [bodyConnected, setBodyConnected] = useState(false)
  const [gutConnected, setGutConnected] = useState(false)
  const baselineRef = useRef<Record<string, number>>({})

  const value = useMemo<AtlasContextValue>(() => {
    const seq = frame?.seq ?? 0

    // Live EEG channel values + rolling windows.
    const liveChannels: Record<string, number> = {}
    if (frame) channelNames.forEach((n, i) => (liveChannels[n.toUpperCase()] = frame.eeg[i] ?? 0))
    const byChannel: Record<string, number[]> = {}
    channelNames.forEach((n, i) => (byChannel[n.toUpperCase()] = buffers.eeg[i] ?? []))

    const uploadRegions = upload?.regionValues ?? {}
    const uploadChannels = upload?.channelValues ?? {}
    const uploadHasImaging = MODALITY_BY_ID.imaging.regions.some((r) => r in uploadRegions)

    // Modality live states.
    const eegLive = frame != null || Object.keys(uploadChannels).length > 0
    const cardiacLive = frame != null
    const imagingLive = imagingConnected || uploadHasImaging
    const bodyLive = bodyConnected
    const gutLive = gutConnected || gut != null

    // Assemble region values from every live modality.
    const rv: Record<string, number> = {}
    if (eegLive) Object.assign(rv, regionValuesFromChannels(upload ? uploadChannels : liveChannels))
    if (cardiacLive && frame) rv["limbic"] = hrvToValue(frame.hrv)
    if (imagingConnected) {
      MODALITY_BY_ID.imaging.regions.forEach((r, i) => {
        rv[r] = clamp01(0.48 + Math.sin(seq / 18 + i * 1.7) * 0.16)
      })
    }
    // Upload region values overlay everything (win).
    Object.assign(rv, uploadRegions)

    const source: "live" | "upload" = upload ? "upload" : "live"

    // Baseline for trend (live EEG regions only): mean of the earliest window.
    if (source === "live") {
      for (const r of BRAIN_REGIONS) {
        const series = regionMean(r, byChannel)
        if (series.length >= 8 && baselineRef.current[r.id] == null) {
          baselineRef.current[r.id] = mean(series.slice(0, 8))
        }
      }
    }
    const regionBaseline = source === "upload" ? { ...rv } : baselineRef.current

    const regionSeries = (regionId: string): number[] => {
      if (source === "upload") return []
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
      eeg: eegLive ? (upload ? "upload" : "device") : null,
      cardiac: cardiacLive ? "device" : null,
      imaging: imagingLive ? (imagingConnected ? "connected" : "upload") : null,
      body: bodyLive ? "connected" : null,
      gut: gutLive ? (gut ? "upload" : "connected") : null,
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
      imagingConnected,
      bodyConnected,
      gutConnected,
      connectImaging: () => setImagingConnected(true),
      connectBody: () => setBodyConnected(true),
      connectGut: () => setGutConnected(true),
      disconnectImaging: () => setImagingConnected(false),
      disconnectBody: () => setBodyConnected(false),
      disconnectGut: () => {
        setGutConnected(false)
        setGutState(null)
      },
      setUpload: (p: ParsedUpload) => setUploadState(p),
      clearUpload: () => setUploadState(null),
      gutScore: gut ? gut.gutScore : gutConnected ? 0.72 : null,
      gutLabel: gut?.label ?? null,
      setGut: (p: ParsedViome) => setGutState(p),
      clearGut: () => setGutState(null),
    }
  }, [frame, channelNames, buffers, mindState, upload, gut, imagingConnected, bodyConnected, gutConnected])

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>
}
