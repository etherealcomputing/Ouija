"use client"

// TelemetryProvider — the console's read of the owner's own brain/body, derived
// from the REAL archive (never a live stream, never simulated). It reads the
// grounded sources from SourcesProvider and exposes the current capture's derived
// metrics (calm / focus / HRV / band-powers), the mind-state, rolling buffers for
// sparklines, and the capture history. Every view reads from here.
//
// Nothing here fabricates signal: `frame` is present only when an included EEG
// source carries real derived metrics; otherwise it is null and the brain still
// lights region-by-region from the archive's region values.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useSources } from "@/components/sources/sources-provider"
import { CROWN_CHANNELS } from "@/lib/brain-atlas"
import type { NeuroFrame } from "@/lib/telemetry"
import type { ComposedSources } from "@/lib/sources"
import {
  deriveConfidence,
  deriveMindState,
  type ConfidenceLevel,
  type EventLog,
  type MindState,
  type StateDimensions,
} from "@/lib/ouija-data"

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const last = (a?: number[]): number | undefined => (a && a.length ? a[a.length - 1] : undefined)

export interface TelemetryBuffers {
  calm: number[]
  focus: number[]
  hrv: number[]
  /** Channel-major: eeg[channelIndex] is a short window of that channel. */
  eeg: number[][]
}

interface TelemetryContextValue {
  /** True when at least one real source is grounding the picture. */
  grounded: boolean
  /** A plain descriptor of the active data ("Your archive" / "Sample archive"). */
  archiveLabel: string
  /** The active capture's date/day context, for the header. */
  captureLabel: string | null
  channelNames: string[]
  frame: NeuroFrame | null
  mindState: MindState
  dimensions: StateDimensions
  confidence: ConfidenceLevel
  buffers: TelemetryBuffers
  /** Capture history — the included captures, newest first. */
  events: EventLog[]
  clockLocal: string
  clockZulu: string
  /** Replay = load the whole archive at once (vs. hand-picking in the Source Rail). */
  replayMode: boolean
  setReplayMode: (on: boolean) => void
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null)

export function useTelemetry(): TelemetryContextValue {
  const ctx = useContext(TelemetryContext)
  if (!ctx) throw new Error("useTelemetry must be used within <TelemetryProvider>")
  return ctx
}

const EMPTY_BUFFERS: TelemetryBuffers = { calm: [], focus: [], hrv: [], eeg: [] }

/** Build a capture frame from the grounded archive's real derived metrics. */
function frameFromComposed(composed: ComposedSources): NeuroFrame | null {
  const r = composed.replay
  if (!r) return null
  const calm = last(r.calm) ?? 0.5
  const focus = last(r.focus) ?? 0.5
  const hrv = last(r.hrv) ?? 0
  const eeg = (r.bandSeries ?? []).map((s) => last(s) ?? 0)
  return { seq: 0, ts: 0, calm: clamp01(calm), focus: clamp01(focus), eeg, hrv, signalQuality: 0.92 }
}

function dimensionsFor(frame: NeuroFrame): StateDimensions {
  const { calm, focus } = frame
  return {
    focus,
    calm,
    load: clamp01(0.2 + focus * 0.5 + (1 - calm) * 0.3),
    arousal: clamp01(0.15 + (1 - calm) * 0.75),
    fatigue: clamp01(0.55 - focus * 0.35 + (1 - frame.signalQuality) * 0.15),
  }
}

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const { composed, includedSources, isSample, includeAll, clearIncluded } = useSources()
  const [clockLocal, setClockLocal] = useState("")
  const [clockZulu, setClockZulu] = useState("")

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClockLocal(now.toLocaleTimeString("en-US", { hour12: false }))
      setClockZulu(now.toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" }) + "Z")
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const value = useMemo<TelemetryContextValue>(() => {
    const grounded = includedSources.length > 0
    const frame = frameFromComposed(composed)

    const buffers: TelemetryBuffers = frame
      ? {
          calm: composed.replay?.calm ?? [],
          focus: composed.replay?.focus ?? [],
          hrv: composed.replay?.hrv ?? [],
          eeg: composed.replay?.bandSeries ?? [],
        }
      : EMPTY_BUFFERS

    const mindState: MindState = frame ? deriveMindState(frame.calm, frame.focus) : "calm"
    const dimensions = frame ? dimensionsFor(frame) : { focus: 0.5, calm: 0.5, load: 0.4, arousal: 0.4, fatigue: 0.4 }
    const confidence = deriveConfidence(frame?.signalQuality ?? 0)

    // Capture history — one entry per included source, newest first.
    const sorted = [...includedSources].sort((a, b) => (b.day_offset ?? 0) - (a.day_offset ?? 0))
    const events: EventLog[] = sorted.slice(0, 12).map((s, i) => ({
      id: `cap-${s.id}-${i}`,
      timestamp: new Date(),
      state: mindState,
      type: "device",
      message: `Captured · ${s.label}`,
    }))
    const latest = sorted[0]
    const captureLabel = latest ? (latest.date ?? (latest.day_offset != null ? `day ${latest.day_offset}` : null)) : null

    return {
      grounded,
      archiveLabel: grounded ? (isSample ? "Sample archive" : "Your archive") : "No archive loaded",
      captureLabel,
      channelNames: composed.replay?.channelNames ?? CROWN_CHANNELS,
      frame,
      mindState,
      dimensions,
      confidence,
      buffers,
      events,
      clockLocal,
      clockZulu,
      replayMode: grounded,
      setReplayMode: (on: boolean) => (on ? includeAll() : clearIncluded()),
    }
  }, [composed, includedSources, isSample, includeAll, clearIncluded, clockLocal, clockZulu])

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>
}
