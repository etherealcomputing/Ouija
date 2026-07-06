// Neuro frame shape.
// ─────────────────────────────────────────────────────────────────────────
// The console never fabricates signal — every view reads from the
// TelemetryProvider (components/ouija/telemetry-provider.tsx), which derives a
// frame from the owner's REAL de-identified archive (the included Source Rail
// sources, via composed.replay). There is no live device transport and nothing
// is simulated; "Replay" plays your own captured data back. This module just
// defines the frame shape the provider produces and the views consume.

/** One replayed frame derived from the archive. All readings are normalized
 *  0–1 except hrv (ms RMSSD). */
export interface NeuroFrame {
  /** Monotonic sequence number within the replay. */
  seq: number
  /** Frame timestamp (epoch ms) within the replay. */
  ts: number
  /** "Calm" probability from the capture, 0–1. */
  calm: number
  /** "Focus" probability from the capture, 0–1. */
  focus: number
  /** Per-channel band-power reading, one entry per EEG channel (0–1). */
  eeg: number[]
  /** Heart-rate variability, ms RMSSD. */
  hrv: number
  /** Aggregate contact/signal quality of the capture, 0–1. */
  signalQuality: number
}
