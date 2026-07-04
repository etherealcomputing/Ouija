"use client"

import { useTelemetry } from "@/components/ouija/telemetry-provider"
import { ViewShell, SectionLabel } from "@/components/ui/view-shell"
import { SummaryCard } from "@/components/ui/summary-card"
import { SignalCard } from "@/components/ui/signal-card"
import { NeuroWaveforms, HrvBar, type ChannelTrace } from "@/components/viz/neuro-waveforms"
import { DemoEmptyState } from "@/components/shell/demo-empty-state"
import { deriveConfidence, type SignalChannel } from "@/lib/ouija-data"
import { Activity, BrainCircuit } from "lucide-react"

export function SignalsView() {
  const { frame, buffers, channelNames, samplingRate, confidence } = useTelemetry()

  if (!frame) {
    return (
      <ViewShell title="Signals" subtitle="No device streaming">
        <DemoEmptyState
          title="No live channels"
          hint="Per-channel EEG traces, HRV and band-power readouts stream here once a device is connected. Turn on Demo Mode to preview them."
        />
      </ViewShell>
    )
  }

  const traces: ChannelTrace[] = channelNames.map((name, i) => ({ name, data: buffers.eeg[i] ?? [] }))
  const now = new Date()

  // Build SignalChannel cards from the live frame. EEG summarised as a mean
  // band-power reading; HRV + calm/focus surfaced as their own channels.
  const meanBand = frame.eeg.reduce((a, b) => a + b, 0) / (frame.eeg.length || 1)
  const cards: SignalChannel[] = [
    {
      id: "eeg-band",
      name: "EEG Band Power",
      description: `${channelNames.length} channels · ${samplingRate} Hz · Neurosity Crown`,
      group: "eeg",
      status: frame.signalQuality < 0.5 ? "strained" : "stable",
      confidence,
      lastUpdated: now,
      value: `${(meanBand * 100).toFixed(0)}% mean · β/θ`,
      reading: meanBand,
      theta: 0.6,
      contributesToConfidence: true,
      unit: "µV²",
    },
    {
      id: "hrv",
      name: "Heart-Rate Variability",
      description: "Autonomic arousal proxy · RMSSD",
      group: "cardiac",
      status: "stable",
      confidence: deriveConfidence(0.8),
      lastUpdated: now,
      value: `${Math.round(frame.hrv)} ms RMSSD`,
      reading: Math.max(0, Math.min(1, (frame.hrv - 18) / 72)),
      contributesToConfidence: false,
      unit: "ms",
    },
    {
      id: "focus",
      name: "Focus Probability",
      description: "Neurosity derived engagement metric",
      group: "eeg",
      status: "stable",
      confidence,
      lastUpdated: now,
      value: `${(frame.focus * 100).toFixed(0)}%`,
      reading: frame.focus,
      contributesToConfidence: true,
    },
  ]

  return (
    <ViewShell title="Signals" subtitle="Live per-channel EEG traces from the simulated Neurosity Crown">
      <SummaryCard title="EEG Channels" icon={<BrainCircuit className="w-4 h-4" />} accent="perception" meta={`${channelNames.length}ch · ${samplingRate} Hz`}>
        <NeuroWaveforms channels={traces} />
        <div className="mt-4">
          <HrvBar hrv={frame.hrv} />
        </div>
      </SummaryCard>

      <SectionLabel>Channel readouts</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <SignalCard key={c.id} signal={c} />
        ))}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-text-faint font-mono px-1">
        <Activity className="w-3 h-3" />
        Recorded epochs convert to BIDS-valid EDF via converters/eeg/neurosity_to_bids.py.
      </div>
    </ViewShell>
  )
}
