// Data-modality model for the brain atlas.
// ─────────────────────────────────────────────────────────────────────────
// Ouija needs several data modalities to "function and output nominally." Each
// modality powers a set of brain regions; the 3D brain populates region-by-
// region as modalities come online, and the system reads NOMINAL only when
// every required modality is feeding. Missing modalities leave their regions
// dark with an "awaiting …" state.

export type ModalityId = "eeg" | "cardiac" | "imaging" | "body" | "gut"

export interface ModalityDef {
  id: ModalityId
  label: string
  short: string
  description: string
  /** Brain-region ids this modality powers (empty = systemic, no single region). */
  regions: string[]
  /** Devices that can provide this modality. */
  devices: string[]
  /** Required for the system to output nominally. */
  required: boolean
}

export const MODALITIES: ModalityDef[] = [
  {
    id: "eeg",
    label: "EEG",
    short: "EEG",
    description: "Cortical band power across the 10-20 montage — frontal, central, parietal, occipital.",
    regions: ["prefrontal", "frontal-l", "frontal-r", "central-l", "central-r", "parietal-l", "parietal-r", "occipital-l", "occipital-r"],
    devices: ["Neurosity Crown", "Upside Down Labs BioAmp", "PiEEG", "any LSL / BrainFlow device"],
    required: true,
  },
  {
    id: "cardiac",
    label: "Autonomic",
    short: "HRV",
    description: "Heart-rate variability → limbic / autonomic tone.",
    regions: ["limbic"],
    devices: ["Withings Body Scan (ECG)", "PiEEG (ECG channel)"],
    required: true,
  },
  {
    id: "imaging",
    label: "Imaging",
    short: "IMG",
    description: "Structural + metabolic maps that EEG can't reach — SPECT / fMRI / MRI / fNIRS.",
    regions: ["temporal-l", "temporal-r", "cerebellum"],
    devices: ["SPECT", "fMRI", "MRI", "fNIRS"],
    required: true,
  },
  {
    id: "body",
    label: "Body",
    short: "BODY",
    description: "Body composition, vascular age, weight — systemic vitality.",
    regions: [],
    devices: ["Withings Body Scan"],
    required: true,
  },
  {
    id: "gut",
    label: "Gut Intelligence",
    short: "GUT",
    description: "Gut microbiome & metabolic scores — the gut-brain axis (Viome).",
    regions: [],
    devices: ["Viome Gut Intelligence"],
    required: true,
  },
]

export const MODALITY_BY_ID: Record<ModalityId, ModalityDef> = Object.fromEntries(
  MODALITIES.map((m) => [m.id, m]),
) as Record<ModalityId, ModalityDef>

/** region id → the modality that powers it. */
export const REGION_MODALITY: Record<string, ModalityId> = (() => {
  const map: Record<string, ModalityId> = {}
  for (const m of MODALITIES) for (const r of m.regions) map[r] = m.id
  return map
})()

export type SystemStatus = "offline" | "partial" | "nominal"

export function systemStatus(live: Set<ModalityId>): SystemStatus {
  const required = MODALITIES.filter((m) => m.required)
  const liveCount = required.filter((m) => live.has(m.id)).length
  if (liveCount === 0) return "offline"
  if (liveCount === required.length) return "nominal"
  return "partial"
}

export const SYSTEM_STATUS_META: Record<SystemStatus, { label: string; text: string; dot: string }> = {
  offline: { label: "OFFLINE", text: "text-coral", dot: "bg-coral" },
  partial: { label: "PARTIAL", text: "text-amber", dot: "bg-amber" },
  nominal: { label: "NOMINAL", text: "text-mint", dot: "bg-mint" },
}
