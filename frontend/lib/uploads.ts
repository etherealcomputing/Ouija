// Client-side parser for uploaded brain-values files. No network, no server —
// a dropped file is read with FileReader and parsed here into a region→value
// map that overrides the live simulated feed in the atlas.
//
// Accepted formats (documented for the user in the dropzone):
//   • JSON: { "F5": 0.7, "CP3": 0.4, ... }            (channel-keyed)
//           { "frontal-l": 0.8, "cerebellum": 0.3 }   (region-keyed)
//           { "channels": {...} } or { "regions": {...} } wrappers
//   • CSV:  "id,value" rows (header optional), channel- or region-keyed
// Values may be 0–1, 0–100, or raw magnitudes — they are normalized to 0–1.

import { CROWN_CHANNELS } from "./adapters/simulated-neurosity"
import { BRAIN_REGIONS, regionValuesFromChannels } from "./brain-atlas"

export interface ParsedUpload {
  label: string
  /** channel→value (0–1), when the file was channel-keyed. */
  channelValues: Record<string, number>
  /** region→value (0–1) the atlas consumes. */
  regionValues: Record<string, number>
  warnings: string[]
}

const CHANNEL_SET = new Set(CROWN_CHANNELS.map((c) => c.toUpperCase()))
const REGION_SET = new Set(BRAIN_REGIONS.map((r) => r.id))

/** Scale an id→raw map into 0–1 based on its own range. */
function normalize(raw: Record<string, number>): Record<string, number> {
  const vals = Object.values(raw)
  if (!vals.length) return {}
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    let n: number
    if (max <= 1 && min >= 0) n = v
    else if (max <= 100 && min >= 0) n = v / 100
    else n = max === min ? 0.5 : (v - min) / (max - min)
    out[k] = Math.max(0, Math.min(1, n))
  }
  return out
}

function toNumberMap(obj: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(obj)) {
    const n = typeof v === "number" ? v : Number(v)
    if (Number.isFinite(n)) out[k.trim()] = n
  }
  return out
}

function parseCsv(text: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const [id, rawVal] = trimmed.split(/[,\t;]/).map((s) => s.trim())
    if (id == null || rawVal == null) continue
    const n = Number(rawVal)
    if (Number.isFinite(n)) out[id] = n // header row (non-numeric value) is skipped
  }
  return out
}

export function parseUpload(text: string, filename = "upload"): ParsedUpload {
  const warnings: string[] = []
  let raw: Record<string, number> = {}

  const looksJson = /^\s*[[{]/.test(text)
  if (looksJson) {
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error("File looks like JSON but could not be parsed.")
    }
    const obj = (json && typeof json === "object" ? json : {}) as Record<string, unknown>
    const inner = (obj.channels ?? obj.regions ?? obj) as Record<string, unknown>
    raw = toNumberMap(inner)
  } else {
    raw = parseCsv(text)
  }

  if (!Object.keys(raw).length) throw new Error("No numeric id,value entries found in the file.")

  // Decide whether keys are channels or regions by best-match.
  const keys = Object.keys(raw)
  const channelHits = keys.filter((k) => CHANNEL_SET.has(k.toUpperCase())).length
  const regionHits = keys.filter((k) => REGION_SET.has(k)).length

  let channelValues: Record<string, number> = {}
  let regionValues: Record<string, number> = {}

  if (channelHits >= regionHits && channelHits > 0) {
    const normed = normalize(raw)
    for (const [k, v] of Object.entries(normed)) {
      if (CHANNEL_SET.has(k.toUpperCase())) channelValues[k.toUpperCase()] = v
    }
    regionValues = regionValuesFromChannels(channelValues)
    const unknown = keys.filter((k) => !CHANNEL_SET.has(k.toUpperCase()))
    if (unknown.length) warnings.push(`Ignored ${unknown.length} unrecognized channel id(s): ${unknown.slice(0, 4).join(", ")}${unknown.length > 4 ? "…" : ""}`)
  } else if (regionHits > 0) {
    const normed = normalize(raw)
    for (const [k, v] of Object.entries(normed)) {
      if (REGION_SET.has(k)) regionValues[k] = v
    }
    const unknown = keys.filter((k) => !REGION_SET.has(k))
    if (unknown.length) warnings.push(`Ignored ${unknown.length} unrecognized region id(s): ${unknown.slice(0, 4).join(", ")}${unknown.length > 4 ? "…" : ""}`)
  } else {
    throw new Error("No recognized Crown channel or brain-region ids in the file.")
  }

  return { label: filename, channelValues, regionValues, warnings }
}

/** Documentation string surfaced in the dropzone UI. */
export const UPLOAD_HELP =
  "Drop a JSON or CSV of channel values (F5, C3, CP3, PO3, PO4, F6, C4, CP4) or region ids " +
  "(frontal-l, occipital-r, cerebellum, …). Values in 0–1, 0–100, or raw magnitudes."
