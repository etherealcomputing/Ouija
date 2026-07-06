// Telemetry integrity monitor — the live-tracking "hardware diagnostic".
// ─────────────────────────────────────────────────────────────────────────
// The NeuroFrame contract (lib/telemetry.ts) promises that "the UI can detect
// dropped frames / staleness rather than silently rendering old state," and it
// declares `stale` as a first-class LinkHealth. Nothing actually computed it —
// this module does. Feed it every frame + health transition and it derives:
//
//   • dropped-frame count from gaps in the monotonic `seq`
//   • duplicate/replayed frames (seq that does not advance)
//   • out-of-range readings (a value outside its declared band = a bad sensor
//     or a units bug upstream, exactly what the Python biopotential-range
//     check catches offline)
//   • staleness — no frame within `staleAfterMs`, which upgrades the reported
//     link to `stale` even while the device still claims `live`
//
// It is pure and time-injected (callers pass `nowMs`) so it is deterministic
// and unit-testable, and carries no React/DOM dependency.

import type { DeviceHealth, LinkHealth, NeuroFrame } from "@/lib/telemetry"

export interface FrameIntegrity {
  /** Frames observed. */
  received: number
  /** Total frames inferred dropped from `seq` gaps. */
  dropped: number
  /** Frames whose `seq` did not advance (replay / stuck producer). */
  duplicates: number
  /** Frames carrying at least one out-of-range reading. */
  outOfRange: number
  /** Highest `seq` seen, or null before the first frame. */
  lastSeq: number | null
}

export interface TelemetryDiagnostic {
  /** Effective link health — `stale` when frames have stopped, even if the
   *  device's last reported health was `live`. */
  link: LinkHealth
  /** True when no frame has arrived within the staleness window. */
  stale: boolean
  /** Wall-clock ms since the last frame, or null before the first frame. */
  msSinceFrame: number | null
  integrity: FrameIntegrity
  /** Fraction of expected frames actually received, 0–1 (1.0 = no loss). */
  deliveryRatio: number
  /** Human-readable issues, most-recent-first, capped. */
  warnings: string[]
}

/** Declared reading bands. A value outside its band is a fault, not noise. */
function frameOutOfRange(f: NeuroFrame): string | null {
  const unit = (v: number) => Number.isFinite(v) && v >= 0 && v <= 1
  if (!unit(f.calm)) return `calm=${f.calm}`
  if (!unit(f.focus)) return `focus=${f.focus}`
  if (!unit(f.signalQuality)) return `signalQuality=${f.signalQuality}`
  if (!Array.isArray(f.eeg) || f.eeg.some((v) => !unit(v))) return `eeg out of [0,1]`
  // hrv is ms RMSSD — physiologically bounded; 0 or absurd values signal a bad sensor.
  if (!Number.isFinite(f.hrv) || f.hrv <= 0 || f.hrv > 400) return `hrv=${f.hrv}`
  return null
}

const DEFAULT_STALE_MS = 2000
const MAX_WARNINGS = 12

export class TelemetryMonitor {
  private readonly staleAfterMs: number
  private lastHealth: DeviceHealth = { link: "disconnected" }
  private lastFrameAtMs: number | null = null
  private integrity: FrameIntegrity = {
    received: 0,
    dropped: 0,
    duplicates: 0,
    outOfRange: 0,
    lastSeq: null,
  }
  private warnings: string[] = []

  constructor(opts: { staleAfterMs?: number } = {}) {
    this.staleAfterMs = opts.staleAfterMs ?? DEFAULT_STALE_MS
  }

  /** Record a frame. `nowMs` is the wall clock at receipt (injected for testability). */
  observeFrame(frame: NeuroFrame, nowMs: number): void {
    const prev = this.integrity.lastSeq
    if (prev !== null) {
      if (frame.seq <= prev) {
        this.integrity.duplicates += 1
        this.warn(`non-advancing seq ${frame.seq} (last ${prev})`)
      } else if (frame.seq > prev + 1) {
        const gap = frame.seq - prev - 1
        this.integrity.dropped += gap
        this.warn(`dropped ${gap} frame(s) before seq ${frame.seq}`)
      }
    }
    this.integrity.lastSeq = Math.max(prev ?? frame.seq, frame.seq)
    this.integrity.received += 1

    const bad = frameOutOfRange(frame)
    if (bad) {
      this.integrity.outOfRange += 1
      this.warn(`out-of-range reading (${bad})`)
    }
    this.lastFrameAtMs = nowMs
  }

  /** Record a device health transition. */
  observeHealth(health: DeviceHealth): void {
    this.lastHealth = health
  }

  /** Compute the diagnostic snapshot at wall clock `nowMs`. */
  snapshot(nowMs: number): TelemetryDiagnostic {
    const msSinceFrame = this.lastFrameAtMs === null ? null : nowMs - this.lastFrameAtMs
    const connected = this.lastHealth.link !== "disconnected"
    // Staleness only applies once connected and at least one frame has landed.
    const stale = connected && msSinceFrame !== null && msSinceFrame > this.staleAfterMs

    let link: LinkHealth = this.lastHealth.link
    if (stale && (link === "live" || link === "degraded")) link = "stale"

    const { received, dropped } = this.integrity
    const expected = received + dropped
    const deliveryRatio = expected === 0 ? 1 : received / expected

    return {
      link,
      stale,
      msSinceFrame,
      integrity: { ...this.integrity },
      deliveryRatio,
      warnings: [...this.warnings],
    }
  }

  /** Reset all counters — e.g. on reconnect / Demo Mode toggle. */
  reset(): void {
    this.lastFrameAtMs = null
    this.integrity = { received: 0, dropped: 0, duplicates: 0, outOfRange: 0, lastSeq: null }
    this.warnings = []
    this.lastHealth = { link: "disconnected" }
  }

  private warn(msg: string): void {
    this.warnings.unshift(msg)
    if (this.warnings.length > MAX_WARNINGS) this.warnings.length = MAX_WARNINGS
  }
}
