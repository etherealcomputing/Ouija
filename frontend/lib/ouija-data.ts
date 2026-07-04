// Ouija — God View for Your Brain
// Canonical domain model for the personal neuro-data console.
// All data here is local/simulated during development; the live values come
// from a NeuroSource adapter (lib/telemetry.ts) fed by the telemetry provider.

// ─────────────────────────────────────────────────────────────────────────
// Core types
// ─────────────────────────────────────────────────────────────────────────

/** Personal mind-state macro-states, derived from calm/focus + signal quality. */
export type MindState = "calm" | "focused" | "stressed" | "fatigued"

export type ConfidenceLevel = "low" | "medium" | "high"

export interface MindStateMeta {
  id: MindState
  label: string
  glyph: string
  /** One-line meaning shown in tooltips / state detail. */
  meaning: string
  /** Token name (maps to a CSS accent var) — components build full classes. */
  accent: "pink" | "violet" | "rose" | "mauve"
  /** Composite index 0–100 shown under the mind-state core. */
  effectiveness: number
}

export const MIND_STATES: Record<MindState, MindStateMeta> = {
  calm: {
    id: "calm",
    label: "CALM",
    glyph: "◇",
    meaning: "Low arousal, settled attention. Restful baseline.",
    accent: "mauve",
    effectiveness: 88,
  },
  focused: {
    id: "focused",
    label: "FOCUSED",
    glyph: "◆",
    meaning: "Engaged attention with steady arousal. Productive flow.",
    accent: "pink",
    effectiveness: 94,
  },
  stressed: {
    id: "stressed",
    label: "STRESSED",
    glyph: "▲",
    meaning: "Elevated arousal, compressed calm. Load is running high.",
    accent: "rose",
    effectiveness: 57,
  },
  fatigued: {
    id: "fatigued",
    label: "FATIGUED",
    glyph: "▽",
    meaning: "Low focus and low drive. Reserves are depleted.",
    accent: "violet",
    effectiveness: 41,
  },
}

/** Canonical order for the state legend / timeline. */
export const STATE_FLOW: MindState[] = ["calm", "focused", "stressed", "fatigued"]

/** Five-axis estimate vector backing the Mind-State Core radar (all 0–1). */
export interface StateDimensions {
  focus: number
  calm: number
  load: number
  arousal: number
  fatigue: number
}

/** Representative per-state dimension estimates (used as a fallback / seed). */
export const STATE_DIMENSIONS: Record<MindState, StateDimensions> = {
  calm: { focus: 0.42, calm: 0.86, load: 0.22, arousal: 0.3, fatigue: 0.24 },
  focused: { focus: 0.9, calm: 0.62, load: 0.66, arousal: 0.64, fatigue: 0.24 },
  stressed: { focus: 0.7, calm: 0.24, load: 0.88, arousal: 0.86, fatigue: 0.5 },
  fatigued: { focus: 0.3, calm: 0.44, load: 0.5, arousal: 0.32, fatigue: 0.9 },
}

/**
 * Classify a mind-state from the two derived Neurosity Crown probabilities.
 * Deterministic and pure so the same frame always maps to the same state.
 */
export function deriveMindState(calm: number, focus: number): MindState {
  if (focus >= 0.6 && calm >= 0.35) return "focused"
  if (calm < 0.35) return "stressed"
  if (focus < 0.4 && calm < 0.6) return "fatigued"
  return "calm"
}

export function deriveConfidence(signalQuality: number): ConfidenceLevel {
  if (signalQuality >= 0.75) return "high"
  if (signalQuality >= 0.45) return "medium"
  return "low"
}

// ─────────────────────────────────────────────────────────────────────────
// Signal channels (a live device/derived reading rendered as a SignalCard)
// ─────────────────────────────────────────────────────────────────────────

export type SignalGroup = "eeg" | "cardiac" | "body"
export type SignalStatus = "stable" | "strained" | "unavailable"

export interface SignalChannel {
  id: string
  name: string
  /** Short channel subtitle. */
  description: string
  group: SignalGroup
  status: SignalStatus
  confidence: ConfidenceLevel
  lastUpdated: Date
  /** Human-readable current value, e.g. "12.4 µV² · β". */
  value?: string
  /** Optional 0–1 reference band (renders a marker on the reading bar). */
  theta?: number
  /** Current normalized channel reading (0–1). */
  reading?: number
  /** Whether this channel feeds the mind-state estimate. */
  contributesToConfidence: boolean
  /** Unit label for the live readout (e.g. µV, ms, kg). */
  unit?: string
}

// ─────────────────────────────────────────────────────────────────────────
// Session event feed (device / signal / session / note)
// ─────────────────────────────────────────────────────────────────────────

export interface EventLog {
  id: string
  timestamp: Date
  state: MindState
  type: "session" | "device" | "signal" | "note"
  message: string
  confidence?: ConfidenceLevel
}

// ─────────────────────────────────────────────────────────────────────────
// Device roster (the personal cadence-protocol hardware)
// ─────────────────────────────────────────────────────────────────────────

export interface DeviceInfo {
  id: string
  name: string
  vendor: string
  modalities: string[]
  /** How it lands in the pipeline once real hardware is paired. */
  bidsTarget: string
}

export const DEVICES: DeviceInfo[] = [
  {
    id: "neurosity-crown",
    name: "Crown",
    vendor: "Neurosity",
    modalities: ["EEG (8ch · 256 Hz)", "calm / focus", "accelerometer"],
    bidsTarget: "eeg/ · EDF",
  },
  {
    id: "udl-bioamp",
    name: "BioAmp EXG",
    vendor: "Upside Down Labs",
    modalities: ["EEG / ECG / EOG / EMG", "raw ADC via Chords"],
    bidsTarget: "eeg/ · EDF",
  },
  {
    id: "pieeg",
    name: "PiEEG",
    vendor: "PiEEG (open hardware)",
    modalities: ["EEG / EMG / ECG / EOG", "8ch · ADS1299 · Raspberry Pi (SPI)"],
    bidsTarget: "eeg/ · EDF",
  },
  {
    id: "withings-scale",
    name: "Body Scan",
    vendor: "Withings",
    modalities: ["weight / composition", "vascular age", "6-lead ECG"],
    bidsTarget: "phenotype/ · TSV",
  },
  {
    id: "generic",
    name: "Any device",
    vendor: "Hardware-agnostic",
    modalities: ["live via LSL / BrainFlow", "import via EDF / CSV"],
    bidsTarget: "eeg/ · EDF",
  },
]
