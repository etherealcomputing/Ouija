"use client"

// AtlasDataProvider — resolves the brain atlas's per-region values from either
// the live simulated feed (default) or an uploaded file (override). Sits inside
// TelemetryProvider so it can read live frames + buffers, and holds the upload
// state so it survives view switches.

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react"
import { useTelemetry } from "@/components/ouija/telemetry-provider"
import { BRAIN_REGIONS, regionValuesFromChannels, type BrainRegion } from "@/lib/brain-atlas"
import type { ParsedUpload } from "@/lib/uploads"
import type { MindState } from "@/lib/ouija-data"

interface AtlasContextValue {
  source: "live" | "upload"
  uploadLabel: string | null
  warnings: string[]
  regionValues: Record<string, number>
  regionBaseline: Record<string, number>
  channelValues: Record<string, number>
  mindState: MindState
  /** Rolling window for a region's panel sparkline (live only; [] for uploads). */
  regionSeries: (regionId: string) => number[]
  setUpload: (parsed: ParsedUpload) => void
  clearUpload: () => void
}

const AtlasContext = createContext<AtlasContextValue | null>(null)

export function useAtlas(): AtlasContextValue {
  const ctx = useContext(AtlasContext)
  if (!ctx) throw new Error("useAtlas must be used within <AtlasDataProvider>")
  return ctx
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function regionMean(region: BrainRegion, byChannel: Record<string, number[]>): number[] {
  // Average the region's channels sample-by-sample into one series.
  const series = region.channels.map((c) => byChannel[c]).filter(Boolean)
  if (!series.length) return []
  const len = Math.min(...series.map((s) => s.length))
  const out: number[] = []
  for (let i = 0; i < len; i++) out.push(mean(series.map((s) => s[i])))
  return out
}

export function AtlasDataProvider({ children }: { children: ReactNode }) {
  const { frame, channelNames, buffers, mindState } = useTelemetry()
  const [upload, setUploadState] = useState<ParsedUpload | null>(null)
  const baselineRef = useRef<Record<string, number>>({})

  const value = useMemo<AtlasContextValue>(() => {
    // Live channel values from the latest frame, keyed by channel name.
    const liveChannels: Record<string, number> = {}
    if (frame) channelNames.forEach((n, i) => (liveChannels[n.toUpperCase()] = frame.eeg[i] ?? 0))

    // Per-channel rolling windows for region sparklines.
    const byChannel: Record<string, number[]> = {}
    channelNames.forEach((n, i) => (byChannel[n.toUpperCase()] = buffers.eeg[i] ?? []))

    const source: "live" | "upload" = upload ? "upload" : "live"
    const channelValues = upload ? upload.channelValues : liveChannels
    const regionValues = upload ? upload.regionValues : regionValuesFromChannels(liveChannels)

    // Baseline: for live, the mean of the earliest window per region (captured
    // once it exists); for uploads, the uploaded value itself (→ "steady").
    if (source === "live") {
      for (const r of BRAIN_REGIONS) {
        const series = regionMean(r, byChannel)
        if (series.length >= 8 && baselineRef.current[r.id] == null) {
          baselineRef.current[r.id] = mean(series.slice(0, 8))
        }
      }
    }
    const regionBaseline = source === "upload" ? { ...regionValues } : baselineRef.current

    const regionSeries = (regionId: string): number[] => {
      if (source === "upload") return []
      const r = BRAIN_REGIONS.find((x) => x.id === regionId)
      return r ? regionMean(r, byChannel) : []
    }

    return {
      source,
      uploadLabel: upload?.label ?? null,
      warnings: upload?.warnings ?? [],
      regionValues,
      regionBaseline,
      channelValues,
      mindState,
      regionSeries,
      setUpload: (p: ParsedUpload) => setUploadState(p),
      clearUpload: () => setUploadState(null),
    }
  }, [frame, channelNames, buffers, mindState, upload])

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>
}
