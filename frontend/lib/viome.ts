// Viome Gut Intelligence report parser — real-time, in-app, client-side.
// ─────────────────────────────────────────────────────────────────────────
// Viome's Gut Intelligence test is a stool-based metatranscriptomic assay; the
// result is a set of 0–100 SCORES (JSON/CSV), NOT DICOM imaging. This parser
// turns a Viome export into normalized 0–1 gut-health signals with no network.
//
// Accepted shapes:
//   • JSON  { "gut_microbiome_health": 82, "metabolic_fitness": 74, ... }
//   • JSON  { "scores": { ... } }  (wrapper unwrapped)
//   • CSV   "score,value" rows (header optional), e.g. "Gut Microbiome Health,82"

export interface ViomeScore {
  key: string
  label: string
  aliases: string[]
}

// The canonical Viome Gut Intelligence score panel.
export const VIOME_SCORES: ViomeScore[] = [
  { key: "gut_microbiome_health", label: "Gut Microbiome Health", aliases: ["microbiome health", "gut health"] },
  { key: "digestive_efficiency", label: "Digestive Efficiency", aliases: ["digestion"] },
  { key: "inflammatory_activity", label: "Inflammatory Activity", aliases: ["inflammation"] },
  { key: "metabolic_fitness", label: "Metabolic Fitness", aliases: ["metabolism"] },
  { key: "gut_lining_health", label: "Gut Lining Health", aliases: ["gut lining", "lining"] },
  { key: "microbial_richness", label: "Microbial Richness", aliases: ["richness", "diversity"] },
]

const NORM = (s: string) => s.trim().toLowerCase().replace(/[\s-]+/g, "_")

const ALIAS_TO_KEY: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const s of VIOME_SCORES) {
    map[s.key] = s.key
    map[NORM(s.label)] = s.key
    for (const a of s.aliases) map[NORM(a)] = s.key
  }
  return map
})()

export interface ParsedViome {
  label: string
  /** Recognized score key → normalized 0–1 value. */
  scores: Record<string, number>
  /** Overall gut score in 0–1 (mean of recognized scores). */
  gutScore: number
  warnings: string[]
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
// Viome scores are 0–100; accept 0–1 as already normalized.
const normalizeScore = (v: number) => clamp01(v <= 1 && v >= 0 ? v : v / 100)

/** True if the text looks like a Viome report (enough recognized score keys). */
export function looksLikeViome(rawMap: Record<string, number>): boolean {
  const hits = Object.keys(rawMap).filter((k) => ALIAS_TO_KEY[NORM(k)]).length
  return hits >= 2
}

function toRawMap(text: string): Record<string, number> {
  const t = text.trim()
  if (t.startsWith("{") || t.startsWith("[")) {
    const obj = JSON.parse(t)
    const src = (obj.scores ?? obj.gut ?? obj) as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(src)) {
      const n = typeof v === "number" ? v : Number(v)
      if (Number.isFinite(n)) out[k] = n
    }
    return out
  }
  // CSV / TSV: label,value per line (header row with a non-numeric value is skipped).
  const out: Record<string, number> = {}
  for (const line of t.split(/\r?\n/)) {
    if (!line.trim()) continue
    const parts = line.split(/[,\t;]/)
    if (parts.length < 2) continue
    const key = parts[0].trim()
    const val = Number(parts[parts.length - 1].trim())
    if (Number.isFinite(val)) out[key] = val
  }
  return out
}

/** Parse a Viome report into normalized gut-health scores. Throws on unusable input. */
export function parseViome(text: string, filename: string): ParsedViome {
  let rawMap: Record<string, number>
  try {
    rawMap = toRawMap(text)
  } catch {
    throw new Error("File looks like JSON but could not be parsed.")
  }
  if (!Object.keys(rawMap).length) throw new Error("No numeric scores found in the file.")

  const scores: Record<string, number> = {}
  let ignored = 0
  for (const [k, v] of Object.entries(rawMap)) {
    const canonical = ALIAS_TO_KEY[NORM(k)]
    if (canonical) scores[canonical] = normalizeScore(v)
    else ignored += 1
  }
  if (!Object.keys(scores).length) {
    throw new Error("No recognized Viome gut-intelligence scores in the file.")
  }

  const vals = Object.values(scores)
  const gutScore = vals.reduce((a, b) => a + b, 0) / vals.length
  const warnings: string[] = []
  if (ignored) warnings.push(`Ignored ${ignored} unrecognized field(s).`)

  return { label: filename, scores, gutScore, warnings }
}

export const VIOME_HELP =
  "Drop a Viome Gut Intelligence export (JSON or CSV of 0–100 scores). Converted in-app — no upload leaves your device."
