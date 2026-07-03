// SimulatedNeurosityAdapter — a stand-in for the Neurosity Crown SDK.
// ─────────────────────────────────────────────────────────────────────────
// It produces data shaped exactly like the real Crown stream so the console
// runs end-to-end with no hardware:
//   • 8 EEG channels at a 256 Hz native rate (the Crown's montage)
//   • derived `calm` / `focus` probabilities in [0, 1] (the Crown's metrics)
//   • an aggregate signal-quality reading
// Real pairing (email-auth or device JWT, per the Neurosity SDK) swaps this
// class for a NeurositeSource that forwards `brainwaves("raw")` epochs and the
// `calm()` / `focus()` metric streams — the provider never changes.
//
// The UI cadence (FRAME_HZ) is intentionally slower than the 256 Hz native
// rate: each emitted frame carries the latest downsampled per-channel value,
// which is all the dashboard needs. Full-rate epochs are what the EEG→BIDS
// converter consumes offline, not the live view.

import { BaseNeuroSource } from "./base"
import type { DeviceHealth } from "@/lib/telemetry"

/** The Neurosity Crown's 8-channel 10-20 montage. */
export const CROWN_CHANNELS = ["CP3", "C3", "F5", "PO3", "PO4", "F6", "C4", "CP4"]
const NATIVE_RATE = 256
const FRAME_HZ = 8

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** A bounded random walk — smooth, drifting, never runs off to the rails. */
function walk(prev: number, drift: number, floor = 0, ceil = 1): number {
  const next = prev + (Math.random() - 0.5) * drift
  // Gentle pull back toward the mid-band so long runs stay lively.
  const mid = (floor + ceil) / 2
  return Math.max(floor, Math.min(ceil, next + (mid - next) * 0.02))
}

export class SimulatedNeurosityAdapter extends BaseNeuroSource {
  readonly deviceId = "sim-crown-01"
  readonly channelNames = CROWN_CHANNELS
  readonly samplingRate = NATIVE_RATE

  private timer: ReturnType<typeof setInterval> | null = null
  private t = 0
  private calm = 0.6
  private focus = 0.55
  private hrv = 52
  private battery = 0.82
  private bands = CROWN_CHANNELS.map((_, i) => 0.4 + i * 0.03)

  async connect(): Promise<void> {
    if (this.timer) return
    this.emitHealth({ link: "live", battery: this.battery, contactQuality: 0.9 })
    this.timer = setInterval(() => this.tick(), 1000 / FRAME_HZ)
  }

  disconnect(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.emitHealth({ link: "disconnected" })
  }

  private tick(): void {
    this.t += 1
    // Derived metrics drift slowly; focus and calm trade off against each other.
    this.calm = walk(this.calm, 0.06)
    this.focus = walk(this.focus, 0.07)
    this.hrv = Math.max(18, Math.min(90, this.hrv + (Math.random() - 0.5) * 3))
    this.battery = Math.max(0, this.battery - 0.00002)

    // Per-channel band power: a slow oscillation per channel + arousal coupling
    // (higher when focus is high) + fine jitter. Kept in [0, 1] for the traces.
    const arousal = 0.3 + this.focus * 0.5
    this.bands = this.bands.map((prev, i) => {
      const osc = Math.sin(this.t / 6 + i * 0.8) * 0.14
      const target = clamp01(0.4 + arousal * 0.35 + osc + (Math.random() - 0.5) * 0.1)
      return clamp01(prev + (target - prev) * 0.4)
    })

    // Occasional contact dips model electrode noise.
    const signalQuality = clamp01(0.9 - (Math.random() < 0.04 ? Math.random() * 0.5 : 0))

    this.emitFrame({
      ts: this.t * (1000 / FRAME_HZ),
      calm: this.calm,
      focus: this.focus,
      eeg: this.bands,
      hrv: this.hrv,
      signalQuality,
    })

    if (this.t % (FRAME_HZ * 4) === 0) {
      const health: DeviceHealth = {
        link: signalQuality < 0.5 ? "degraded" : "live",
        battery: this.battery,
        contactQuality: signalQuality,
      }
      this.emitHealth(health)
    }
  }
}
