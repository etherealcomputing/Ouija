// Base plumbing shared by every NeuroSource adapter: subscriber bookkeeping and
// a monotonic sequence counter. A real adapter (Neurosity / Withings / UDL)
// subclasses this and calls `emitFrame` / `emitHealth` from its device stream;
// the simulated adapter does the same from a timer.

import type { DeviceHealth, NeuroFrame, NeuroSource } from "@/lib/telemetry"

export abstract class BaseNeuroSource implements NeuroSource {
  abstract readonly deviceId: string
  abstract readonly channelNames: string[]
  abstract readonly samplingRate: number

  private frameSubs = new Set<(f: NeuroFrame) => void>()
  private healthSubs = new Set<(h: DeviceHealth) => void>()
  protected seq = 0

  abstract connect(): Promise<void>
  abstract disconnect(): void

  onFrame(cb: (frame: NeuroFrame) => void): () => void {
    this.frameSubs.add(cb)
    return () => this.frameSubs.delete(cb)
  }

  onHealth(cb: (health: DeviceHealth) => void): () => void {
    this.healthSubs.add(cb)
    return () => this.healthSubs.delete(cb)
  }

  /** Emit a frame to all subscribers, stamping a monotonic seq. */
  protected emitFrame(frame: Omit<NeuroFrame, "seq">): void {
    const full: NeuroFrame = { ...frame, seq: ++this.seq }
    this.frameSubs.forEach((cb) => cb(full))
  }

  protected emitHealth(health: DeviceHealth): void {
    this.healthSubs.forEach((cb) => cb(health))
  }
}
