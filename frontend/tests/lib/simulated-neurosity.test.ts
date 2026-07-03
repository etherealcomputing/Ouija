import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SimulatedNeurosityAdapter, CROWN_CHANNELS } from "@/lib/adapters/simulated-neurosity"
import type { NeuroFrame } from "@/lib/telemetry"

describe("SimulatedNeurosityAdapter", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("advertises the Crown montage and native rate", () => {
    const a = new SimulatedNeurosityAdapter()
    expect(a.channelNames).toEqual(CROWN_CHANNELS)
    expect(a.channelNames.length).toBe(8)
    expect(a.samplingRate).toBe(256)
  })

  it("emits well-shaped frames with a monotonic sequence", async () => {
    const a = new SimulatedNeurosityAdapter()
    const frames: NeuroFrame[] = []
    a.onFrame((f) => frames.push(f))
    await a.connect()
    vi.advanceTimersByTime(1000) // ~8 frames at 8 Hz

    expect(frames.length).toBeGreaterThan(3)
    for (const f of frames) {
      expect(f.eeg.length).toBe(8)
      expect(f.calm).toBeGreaterThanOrEqual(0)
      expect(f.calm).toBeLessThanOrEqual(1)
      expect(f.focus).toBeGreaterThanOrEqual(0)
      expect(f.focus).toBeLessThanOrEqual(1)
      f.eeg.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      })
    }
    const seqs = frames.map((f) => f.seq)
    expect(seqs).toEqual([...seqs].sort((x, y) => x - y))
    expect(new Set(seqs).size).toBe(seqs.length)
    a.disconnect()
  })

  it("stops emitting after disconnect", async () => {
    const a = new SimulatedNeurosityAdapter()
    let count = 0
    a.onFrame(() => count++)
    await a.connect()
    vi.advanceTimersByTime(500)
    const afterConnect = count
    a.disconnect()
    vi.advanceTimersByTime(1000)
    expect(count).toBe(afterConnect)
  })
})
