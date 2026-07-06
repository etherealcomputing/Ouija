// Source manifest contract — the frontend half of converters/build_manifest.py.
// ─────────────────────────────────────────────────────────────────────────
// The manifest (`public/sources.json`, or the committed `sources.sample.json`
// template) itemizes the user's archived files: what each is, which converter
// turns it into BIDS, and the app-facing artifact it produces. The Source Panel
// reads this to itemize + visualize the archive; Demo Mode seeds from it.
//
// Keep these types in lockstep with SourceEntry / build_manifest in Python.

import { regionValuesFromChannels } from "@/lib/brain-atlas"

export type Modality = "eeg" | "cardiac" | "imaging" | "body" | "gut" | "unknown"
export type SourceKind = "raw" | "derived" | "report" | "unknown"
export type SourceStatus = "raw" | "convertible" | "app-ready" | "review"
/** The app-facing artifact a source can produce (what actually drives the UI). */
export type AppOutput = "region-values" | "gut-scores" | "phenotype" | null

/** One short representative epoch of derived band-powers — textures the replay feed. */
export interface ReplayHint {
  channelNames: string[]
  bandSeries: number[][]
  calm?: number[]
  focus?: number[]
  hrv?: number[]
}

/** The small inlined payload that actually drives the UI (matches the upload shapes). */
export type AppValues =
  | { type: "region-values"; regionValues?: Record<string, number>; channelValues?: Record<string, number>; replay?: ReplayHint; warnings?: string[] }
  | { type: "gut-scores"; scores: Record<string, number>; gutScore: number; warnings?: string[] }
  | { type: "phenotype"; metrics: Record<string, number>; bodyValue?: number; warnings?: string[] }

export interface SourceEntry {
  id: string
  label: string
  rel_path: string
  modality: Modality
  /** Human format label, e.g. "EDF", "DICOM", "Viome report". */
  fmt: string
  kind: SourceKind
  size_bytes: number
  /** `python -m <converter>` module that turns this into BIDS, or null. */
  converter: string | null
  app_output: AppOutput
  status: SourceStatus
  /** ISO capture date parsed from the filename, or null (removed when anonymized). */
  date?: string | null
  /** Days from the earliest capture — the de-identified temporal key (anonymized manifests). */
  day_offset?: number | null
  session?: string | null
  quality?: number | null
  provenance?: string[]
  /** Inlined app-facing values — present only when status === "app-ready". */
  app_values?: AppValues | null
  app_artifact?: string | null
  note: string
  tags: string[]
}

/** The merged contribution of a set of included sources to the atlas. */
export interface ComposedSources {
  regionValues: Record<string, number>
  channelValues: Record<string, number>
  gutScore: number | null
  bodyValue: number | null
  modalities: Set<Modality>
  /** The first included EEG source carrying a replay hint (seeds Demo-from-archive). */
  replay: ReplayHint | null
}

/**
 * Merge the app-facing values of a set of included sources into one atlas
 * contribution — the generalization of the single upload/gut override to N
 * sources. Region/channel payloads merge (channels → region values); gut and
 * body take the last included value; later entries win on key collisions.
 */
export function composeIncluded(entries: SourceEntry[]): ComposedSources {
  const regionValues: Record<string, number> = {}
  const channelValues: Record<string, number> = {}
  let gutScore: number | null = null
  let bodyValue: number | null = null
  let replay: ReplayHint | null = null
  const modalities = new Set<Modality>()

  for (const e of entries) {
    const v = e.app_values
    if (!v) continue
    modalities.add(e.modality)
    if (v.type === "region-values") {
      if (v.channelValues) {
        Object.assign(channelValues, v.channelValues)
        Object.assign(regionValues, regionValuesFromChannels(v.channelValues))
      }
      if (v.regionValues) Object.assign(regionValues, v.regionValues)
      if (v.replay && !replay) replay = v.replay
    } else if (v.type === "gut-scores") {
      gutScore = v.gutScore
    } else if (v.type === "phenotype") {
      if (typeof v.bodyValue === "number") bodyValue = v.bodyValue
    }
  }
  return { regionValues, channelValues, gutScore, bodyValue, modalities, replay }
}

export interface ModalityRollup {
  count: number
  app_ready: number
  convertible: number
}

export interface SourceManifest {
  manifestVersion: number
  root: string
  counts: { files: number }
  modalities: Partial<Record<Modality, ModalityRollup>>
  sources: SourceEntry[]
  /** True when de-identified for hosting (absolute dates removed, generic labels). */
  anonymized?: boolean
}

/** Display label for a source's capture time — absolute date, or relative day when anonymized. */
export function sourceDateLabel(s: SourceEntry): string {
  if (s.date) return s.date
  if (typeof s.day_offset === "number") return `day ${s.day_offset}`
  return "undated"
}

/** A sortable temporal key for the cadence timeline (works for dated or anonymized). */
export function temporalKey(s: SourceEntry): number | null {
  if (typeof s.day_offset === "number") return s.day_offset
  if (s.date) {
    const t = Date.parse(s.date)
    return Number.isNaN(t) ? null : t
  }
  return null
}

/**
 * Load the source manifest. Prefers the user's real `public/sources.json`;
 * falls back to the committed sample template so the panel is demonstrable
 * before real data lands. Returns null when neither is present (empty state).
 * `isSample` flags that the sample template is in use (the UI marks it clearly).
 */
export async function loadManifest(
  fetchImpl: typeof fetch = fetch,
): Promise<{ manifest: SourceManifest; isSample: boolean } | null> {
  for (const [url, isSample] of [
    ["/sources.json", false],
    ["/sources.sample.json", true],
  ] as const) {
    try {
      const res = await fetchImpl(url, { cache: "no-store" })
      if (!res.ok) continue
      const manifest = (await res.json()) as SourceManifest
      if (manifest && Array.isArray(manifest.sources)) return { manifest, isSample }
    } catch {
      // try the next candidate
    }
  }
  return null
}

const MODALITY_LABEL: Record<Modality, string> = {
  eeg: "EEG",
  cardiac: "Autonomic",
  imaging: "Imaging",
  body: "Body",
  gut: "Gut Intelligence",
  unknown: "Unclassified",
}

export const modalityLabel = (m: Modality): string => MODALITY_LABEL[m] ?? m

/** Group sources by modality, preserving manifest order within each group. */
export function groupByModality(sources: SourceEntry[]): { modality: Modality; items: SourceEntry[] }[] {
  const order: Modality[] = ["eeg", "cardiac", "imaging", "body", "gut", "unknown"]
  const groups = new Map<Modality, SourceEntry[]>()
  for (const s of sources) {
    if (!groups.has(s.modality)) groups.set(s.modality, [])
    groups.get(s.modality)!.push(s)
  }
  return order.filter((m) => groups.has(m)).map((m) => ({ modality: m, items: groups.get(m)! }))
}
