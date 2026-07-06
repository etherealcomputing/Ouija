"use client"

// TelemetryProvider — single source of truth for live console state.
// ─────────────────────────────────────────────────────────────────────────
// Owns the one device adapter instance, the latest frame, the derived
// mind-state estimate, rolling signal buffers for the waveforms/sparklines,
// and a small session event feed. Every view reads from here, so the
// dashboard and the signals view can never show divergent telemetry.
//
// This is the backend seam: replace SimulatedNeurosityAdapter with a real
// NeuroSource (lib/telemetry.ts) and the entire console goes live without
// touching a view.

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { SimulatedNeurosityAdapter } from "@/lib/adapters/simulated-neurosity"
import { TelemetryMonitor, type TelemetryDiagnostic } from "@/lib/diagnostics"
import type { DeviceHealth, NeuroFrame, NeuroSource } from "@/lib/telemetry"
import {
  deriveConfidence,
  deriveMindState,
  MIND_STATES,
  type ConfidenceLevel,
  type EventLog,
  type MindState,
  type StateDimensions,
} from "@/lib/ouija-data"

const BUFFER = 64

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export interface TelemetryBuffers {
  calm: number[]
  focus: number[]
  hrv: number[]
  /** Channel-major: eeg[channelIndex] is a rolling window of that channel. */
  eeg: number[][]
}

interface TelemetryContextValue {
  connected: boolean
  deviceId: string
  channelNames: string[]
  samplingRate: number
  frame: NeuroFrame | null
  health: DeviceHealth
  /** Live telemetry-integrity diagnostic: dropped frames, staleness, link. */
  diagnostic: TelemetryDiagnostic
  mindState: MindState
  dimensions: StateDimensions
  confidence: ConfidenceLevel
  buffers: TelemetryBuffers
  events: EventLog[]
  clockLocal: string
  clockZulu: string
  /** Demo Mode: off by default → empty/idle console; on → the simulated feed runs. */
  demoMode: boolean
  setDemoMode: (on: boolean) => void
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null)

export function useTelemetry(): TelemetryContextValue {
  const ctx = useContext(TelemetryContext)
  if (!ctx) throw new Error("useTelemetry must be used within <TelemetryProvider>")
  return ctx
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

let eventSeq = 0

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [frame, setFrame] = useState<NeuroFrame | null>(null)
  const [health, setHealth] = useState<DeviceHealth>({ link: "disconnected" })
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState<EventLog[]>([])
  const [clockLocal, setClockLocal] = useState("")
  const [clockZulu, setClockZulu] = useState("")
  // Demo Mode is OFF by default: the app boots empty and usable. Flipping it on
  // instantiates the simulated feed (the "demo content"); flipping it off tears
  // the feed down and clears every buffer back to the idle state.
  const [demoMode, setDemoMode] = useState(false)

  const sourceRef = useRef<NeuroSource | null>(null)
  const buffersRef = useRef<TelemetryBuffers>({ calm: [], focus: [], hrv: [], eeg: [] })
  const monitorRef = useRef<TelemetryMonitor | null>(null)
  const lastStateRef = useRef<MindState | null>(null)

  if (!monitorRef.current) monitorRef.current = new TelemetryMonitor()
  const monitor = monitorRef.current
  // Force a re-render on each frame without threading the whole buffer through state.
  const [, setDrift] = useState(0)

  if (!sourceRef.current) sourceRef.current = new SimulatedNeurosityAdapter()
  const source = sourceRef.current

  const pushEvent = (type: EventLog["type"], message: string, state: MindState, confidence?: ConfidenceLevel) => {
    setEvents((prev) =>
      [{ id: `ev-${eventSeq++}`, timestamp: new Date(), state, type, message, confidence }, ...prev].slice(0, 40),
    )
  }

  useEffect(() => {
    // No demo → the console stays idle: no adapter, empty buffers, null frame.
    if (!demoMode) {
      source.disconnect()
      buffersRef.current = { calm: [], focus: [], hrv: [], eeg: [] }
      monitor.reset()
      lastStateRef.current = null
      setFrame(null)
      setConnected(false)
      setHealth({ link: "disconnected" })
      setEvents([])
      return
    }

    const buffers = buffersRef.current
    buffers.eeg = source.channelNames.map(() => [])

    const offFrame = source.onFrame((f) => {
      monitor.observeFrame(f, Date.now())
      const push = (arr: number[], v: number) => {
        arr.push(v)
        if (arr.length > BUFFER) arr.shift()
      }
      push(buffers.calm, f.calm)
      push(buffers.focus, f.focus)
      push(buffers.hrv, f.hrv)
      f.eeg.forEach((v, i) => push(buffers.eeg[i], v))

      const nextState = deriveMindState(f.calm, f.focus)
      if (nextState !== lastStateRef.current) {
        if (lastStateRef.current) {
          pushEvent("signal", `Mind-state → ${MIND_STATES[nextState].label}`, nextState, deriveConfidence(f.signalQuality))
        }
        lastStateRef.current = nextState
      }
      setFrame(f)
      setDrift((d) => (d + 1) % 1_000_000)
    })

    const offHealth = source.onHealth((h) => {
      monitor.observeHealth(h)
      setHealth(h)
      setConnected(h.link !== "disconnected")
    })

    pushEvent("device", "Demo Mode on · starting simulated feed", "calm")
    source.connect().then(() => {
      pushEvent("device", `Connected to ${source.deviceId} · ${source.channelNames.length}ch @ ${source.samplingRate} Hz`, "calm")
    })

    return () => {
      offFrame()
      offHealth()
      source.disconnect()
    }
  }, [source, monitor, demoMode])

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

  const mindState = frame ? deriveMindState(frame.calm, frame.focus) : "calm"
  const dimensions = frame ? dimensionsFor(frame) : { focus: 0.5, calm: 0.5, load: 0.4, arousal: 0.4, fatigue: 0.4 }
  const confidence = deriveConfidence(frame?.signalQuality ?? 0)
  // Recomputed each frame (frame identity is the render trigger) so dropped-frame
  // counts and the stale/live link stay current with what the console shows.
  const diagnostic = monitor.snapshot(Date.now())

  const value = useMemo<TelemetryContextValue>(
    () => ({
      connected,
      deviceId: source.deviceId,
      channelNames: source.channelNames,
      samplingRate: source.samplingRate,
      frame,
      health,
      diagnostic,
      mindState,
      dimensions,
      confidence,
      buffers: buffersRef.current,
      events,
      clockLocal,
      clockZulu,
      demoMode,
      setDemoMode,
    }),
    // frame identity changes every tick, which is the intended re-render trigger.
    [connected, source, frame, health, diagnostic, mindState, dimensions, confidence, events, clockLocal, clockZulu, demoMode],
  )

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>
}
