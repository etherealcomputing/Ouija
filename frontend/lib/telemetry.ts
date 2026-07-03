// Neuro telemetry transport contract.
// ─────────────────────────────────────────────────────────────────────────
// The console never talks to a device directly — every view reads from the
// TelemetryProvider (components/ouija/telemetry-provider.tsx), which is the
// single integration seam. During development the provider is driven by the
// SimulatedNeurosityAdapter; swapping in real hardware means implementing
// NeuroSource against the device SDK (Neurosity JS/Python, Withings Health
// API, Upside Down Labs Chords over Serial/BLE/LSL) and wiring it into the
// provider. Nothing else changes.
//
// Design constraints this contract encodes:
//  • Push-based frames with a monotonic sequence number — the UI can detect
//    dropped frames / staleness rather than silently rendering old state.
//  • Explicit link-health states — DEGRADED and STALE are first-class.
//  • The frame carries both the raw per-channel readings and the device's
//    derived probabilities, so the classifier stays on the client.

export type LinkHealth = "live" | "degraded" | "stale" | "disconnected"

/** One push frame from a neuro device. All readings are normalized 0–1
 *  except hrv (ms RMSSD). */
export interface NeuroFrame {
  /** Monotonic sequence number; a gap means dropped frames. */
  seq: number
  /** Device timestamp (epoch ms) — used for staleness detection. */
  ts: number
  /** Derived "calm" probability (Neurosity Crown metric), 0–1. */
  calm: number
  /** Derived "focus" probability (Neurosity Crown metric), 0–1. */
  focus: number
  /** Latest per-channel band-power reading, one entry per EEG channel (0–1). */
  eeg: number[]
  /** Heart-rate variability, ms RMSSD. */
  hrv: number
  /** Aggregate contact/signal quality, 0–1. */
  signalQuality: number
}

export interface DeviceHealth {
  link: LinkHealth
  /** Battery level 0–1, if the device reports it. */
  battery?: number
  /** Mean electrode contact quality 0–1, if available. */
  contactQuality?: number
}

/**
 * A neuro data source. The simulated adapter and any real device adapter both
 * implement this; the provider only ever depends on this interface.
 */
export interface NeuroSource {
  readonly deviceId: string
  /** Channel montage, e.g. the Neurosity Crown's 8 channels. */
  readonly channelNames: string[]
  /** Native sampling rate in Hz (e.g. 256 for the Crown). */
  readonly samplingRate: number
  connect(): Promise<void>
  disconnect(): void
  /** Subscribe to telemetry frames. Returns an unsubscribe function. */
  onFrame(cb: (frame: NeuroFrame) => void): () => void
  /** Subscribe to link-health transitions. Returns an unsubscribe function. */
  onHealth(cb: (health: DeviceHealth) => void): () => void
}
