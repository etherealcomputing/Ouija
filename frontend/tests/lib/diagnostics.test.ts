import { describe, expect, it } from "vitest"
import { TelemetryMonitor } from "@/lib/diagnostics"
import type { DeviceHealth, NeuroFrame } from "@/lib/telemetry"

function frame(seq: number, over: Partial<NeuroFrame> = {}): NeuroFrame {
  return {
    seq,
    ts: seq * 125,
    calm: 0.6,
    focus: 0.55,
    eeg: [0.4, 0.5, 0.45, 0.5, 0.4, 0.5, 0.42, 0.48],
    hrv: 52,
    signalQuality: 0.9,
    ...over,
  }
}

const live: DeviceHealth = { link: "live", battery: 0.8, contactQuality: 0.9 }

describe("TelemetryMonitor — frame integrity", () => {
  it("counts clean consecutive frames with no loss", () => {
    const m = new TelemetryMonitor()
    m.observeHealth(live)
    for (let s = 1; s <= 5; s++) m.observeFrame(frame(s), s * 125)
    const d = m.snapshot(5 * 125)
    expect(d.integrity.received).toBe(5)
    expect(d.integrity.dropped).toBe(0)
    expect(d.deliveryRatio).toBe(1)
    expect(d.warnings).toHaveLength(0)
  })

  it("infers dropped frames from a seq gap", () => {
    const m = new TelemetryMonitor()
    m.observeHealth(live)
    m.observeFrame(frame(1), 0)
    m.observeFrame(frame(5), 500) // 2,3,4 dropped
    const d = m.snapshot(500)
    expect(d.integrity.dropped).toBe(3)
    expect(d.integrity.received).toBe(2)
    expect(d.deliveryRatio).toBeCloseTo(2 / 5)
    expect(d.warnings[0]).toContain("dropped 3")
  })

  it("flags a non-advancing (replayed) seq", () => {
    const m = new TelemetryMonitor()
    m.observeHealth(live)
    m.observeFrame(frame(4), 0)
    m.observeFrame(frame(4), 125)
    const d = m.snapshot(125)
    expect(d.integrity.duplicates).toBe(1)
    expect(d.integrity.lastSeq).toBe(4)
  })

  it("detects out-of-range readings without throwing", () => {
    const m = new TelemetryMonitor()
    m.observeHealth(live)
    m.observeFrame(frame(1, { focus: 1.7 }), 0)
    m.observeFrame(frame(2, { eeg: [0.5, 2.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] }), 125)
    m.observeFrame(frame(3, { hrv: 0 }), 250)
    const d = m.snapshot(250)
    expect(d.integrity.outOfRange).toBe(3)
  })
})

describe("TelemetryMonitor — staleness", () => {
  it("upgrades a live link to stale when frames stop", () => {
    const m = new TelemetryMonitor({ staleAfterMs: 1000 })
    m.observeHealth(live)
    m.observeFrame(frame(1), 0)
    expect(m.snapshot(500).link).toBe("live") // within window
    const d = m.snapshot(2000) // 2s since last frame
    expect(d.stale).toBe(true)
    expect(d.link).toBe("stale")
    expect(d.msSinceFrame).toBe(2000)
  })

  it("does not report staleness while disconnected", () => {
    const m = new TelemetryMonitor({ staleAfterMs: 1000 })
    m.observeHealth({ link: "disconnected" })
    const d = m.snapshot(10_000)
    expect(d.stale).toBe(false)
    expect(d.link).toBe("disconnected")
    expect(d.msSinceFrame).toBeNull()
  })

  it("clears staleness once a fresh frame lands", () => {
    const m = new TelemetryMonitor({ staleAfterMs: 1000 })
    m.observeHealth(live)
    m.observeFrame(frame(1), 0)
    expect(m.snapshot(2000).stale).toBe(true)
    m.observeFrame(frame(2), 2000)
    expect(m.snapshot(2100).stale).toBe(false)
  })
})

describe("TelemetryMonitor — lifecycle", () => {
  it("reset clears all counters", () => {
    const m = new TelemetryMonitor()
    m.observeHealth(live)
    m.observeFrame(frame(1), 0)
    m.observeFrame(frame(9), 100)
    m.reset()
    const d = m.snapshot(200)
    expect(d.integrity).toEqual({ received: 0, dropped: 0, duplicates: 0, outOfRange: 0, lastSeq: null })
    expect(d.link).toBe("disconnected")
    expect(d.warnings).toHaveLength(0)
  })

  it("caps the warning log", () => {
    const m = new TelemetryMonitor()
    m.observeHealth(live)
    // 20 gaps → 20 warnings, capped at 12.
    let seq = 1
    m.observeFrame(frame(seq), 0)
    for (let i = 0; i < 20; i++) {
      seq += 2
      m.observeFrame(frame(seq), seq * 10)
    }
    expect(m.snapshot(seq * 10).warnings.length).toBeLessThanOrEqual(12)
  })
})
