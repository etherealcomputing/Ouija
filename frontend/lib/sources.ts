// Source manifest contract — the frontend half of converters/build_manifest.py.
// ─────────────────────────────────────────────────────────────────────────
// The manifest (`public/sources.json`, or the committed `sources.sample.json`
// template) itemizes the user's archived files: what each is, which converter
// turns it into BIDS, and the app-facing artifact it produces. The Source Panel
// reads this to itemize + visualize the archive; Demo Mode seeds from it.
//
// Keep these types in lockstep with SourceEntry / build_manifest in Python.

export type Modality = "eeg" | "cardiac" | "imaging" | "body" | "gut" | "unknown"
export type SourceKind = "raw" | "derived" | "report" | "unknown"
export type SourceStatus = "raw" | "convertible" | "app-ready" | "review"
/** The app-facing artifact a source can produce (what actually drives the UI). */
export type AppOutput = "region-values" | "gut-scores" | "phenotype" | null

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
  note: string
  tags: string[]
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
