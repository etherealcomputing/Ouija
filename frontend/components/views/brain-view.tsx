"use client"

import { useMemo, useState, type CSSProperties } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { PlayCircle } from "lucide-react"
import { ViewShell, SectionLabel, KpiTile, KpiStrip } from "@/components/ui/view-shell"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { PRESS, SPRING, T, fadeUp, scaleIn, staggerContainer } from "@/lib/motion"
import { BrainCanvas } from "@/components/brain/brain-canvas"
import { RegionPanel } from "@/components/brain/region-panel"
import { SystemicPanel } from "@/components/brain/systemic-panel"
import { PlanchetteTimeline } from "@/components/brain/planchette-timeline"
import { UploadDropzone } from "@/components/brain/upload-dropzone"
import { SystemReadiness } from "@/components/brain/system-readiness"
import { BrainInsight } from "@/components/brain/brain-insight"
import { BrainHud } from "@/components/brain/brain-hud"
import { useAtlas } from "@/components/brain/atlas-data-provider"
import { useTelemetry } from "@/components/ouija/telemetry-provider"
import { useSources } from "@/components/sources/sources-provider"
import { BRAIN_REGIONS } from "@/lib/brain-atlas"
import { MIND_STATES } from "@/lib/ouija-data"
import { REGION_MODALITY, MODALITY_BY_ID, MODALITIES } from "@/lib/modalities"

const SUBTITLE: Record<string, string> = {
  offline: "At rest · load your archive or include a source to bring it to life",
  partial: "Resolving region-by-region as your captures come online",
  nominal: "Every modality feeding · your picture is complete",
}

// The recessed "well" the brain sits in — a sunken viewport, the dashboard's focal point.
const RECESSED_WELL: CSSProperties = {
  background: "radial-gradient(120% 90% at 50% 35%, #14040e 0%, #0a0410 55%, #050109 100%)",
  boxShadow:
    "inset 0 3px 30px 6px rgba(0,0,0,0.78), inset 0 0 0 1px rgba(248,32,144,0.10), inset 0 -1px 0 rgba(255,255,255,0.03)",
}

export function BrainView() {
  const { regionValues, regionBaseline, regionSeries, mindState, status, source, liveIds, gutScore, bodyValue } = useAtlas()
  const { replayMode, setReplayMode, frame } = useTelemetry()
  const { spotlightRegions } = useSources()
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const activeId = hovered ?? selected
  const region = useMemo(() => BRAIN_REGIONS.find((r) => r.id === activeId) ?? null, [activeId])
  const systemicKind = activeId === "sys-body" ? "body" : activeId === "sys-gut" ? "gut" : null

  // Nothing is driving the brain: nothing grounded from the archive or uploads.
  const idle = !replayMode && source === "live" && Object.keys(regionValues).length === 0

  // HUD readouts.
  const activity = useMemo(() => {
    const vs = Object.values(regionValues)
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0
  }, [regionValues])

  const asPct = (n: number) => `${Math.round(n)}%`

  return (
    <ViewShell title="Brain Atlas" subtitle={SUBTITLE[status]}>
      <BrainInsight />

      {/* Headline KPI strip — the dashboard's numbers land here too. */}
      <KpiStrip className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <KpiTile label="STATE" value={frame ? MIND_STATES[mindState].label : "—"} sub="mind-state" accent="perception" />
        <KpiTile label="FOCUS" value={<AnimatedNumber value={frame ? frame.focus * 100 : null} format={asPct} />} sub="engagement" accent="perception" />
        <KpiTile label="CALM" value={<AnimatedNumber value={frame ? frame.calm * 100 : null} format={asPct} />} sub="engagement" accent="operator" />
        <KpiTile label="GUT" value={<AnimatedNumber value={gutScore != null ? gutScore * 100 : null} format={asPct} />} sub="Viome" accent="mint" />
      </KpiStrip>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4">
        <div className="flex flex-col gap-3">
        {/* 3D scene — the recessed focal point. WebGL isn't reachable by
            assistive tech, so the well is labelled and carries a screen-reader
            summary of the same readings the visualization shows. */}
        <div
          role="img"
          aria-label="3D brain atlas. Regions and the Body and Gut anchors light up from your archive."
          className="relative rounded-xl overflow-hidden min-h-[380px] h-[54vh] sm:h-[58vh] lg:h-[62vh] scan-line-container ring-1 ring-perception/10"
          style={RECESSED_WELL}
        >
          <ul className="sr-only">
            {BRAIN_REGIONS.map((r) => (
              <li key={r.id}>
                {r.name}: {regionValues[r.id] != null ? `${Math.round(regionValues[r.id] * 100)}%` : "not measured"}
              </li>
            ))}
            <li>Body: {bodyValue != null ? `${Math.round(bodyValue * 100)}%` : "not loaded"}</li>
            <li>Gut: {gutScore != null ? `${Math.round(gutScore * 100)}%` : "not loaded"}</li>
          </ul>
          <BrainCanvas
            values={regionValues}
            hovered={hovered}
            selected={selected}
            spotlight={spotlightRegions}
            systemic={{ body: bodyValue, gut: gutScore }}
            onHover={setHovered}
            onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
          />

          {/* GUI layer over the WebGL core */}
          <BrainHud
            status={status}
            liveCount={liveIds.size}
            totalModalities={MODALITIES.length}
            activity={activity}
            activeName={region?.name ?? null}
          />

          <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none z-10">
            <div className="flex items-center gap-2 text-[9px] font-mono text-text-dim">
              <span className="w-2 h-2 rounded-full bg-perception" style={{ boxShadow: "0 0 8px var(--color-perception)" }} />
              powered by a live modality
            </div>
            <div className="flex items-center gap-2 text-[9px] font-mono text-text-dim">
              <span className="w-2 h-2 rounded-full" style={{ background: "#5a2a52" }} />
              awaiting its modality
            </div>
            <div className="text-[8px] font-mono text-text-faint tracking-[0.16em] mt-0.5">DRAG · SCROLL · HOVER</div>
          </div>

          <AnimatePresence>
            {idle && (
              <motion.div
                className="absolute inset-0 z-20 grid place-items-center bg-obsidian/40 backdrop-blur-[1px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={T.base}
              >
                <motion.div className="text-center px-6" variants={scaleIn} initial="hidden" animate="show" exit="exit">
                  <p className="text-[13px] text-foreground/90 font-medium">The brain is at rest</p>
                  <p className="mx-auto mt-1 max-w-xs text-[11px] text-text-dim leading-relaxed">
                    Regions light up as your captures come online. Load your archive to bring it to life, or drop in your own data below.
                  </p>
                  <motion.button
                    type="button"
                    onClick={() => setReplayMode(true)}
                    whileTap={PRESS}
                    className="mt-4 inline-flex items-center gap-2 rounded-md border border-perception/40 bg-perception/10 px-3.5 py-1.5 text-[12px] font-medium text-perception transition-colors duration-200 hover:bg-perception/20"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    Load your archive
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

          {/* Planchette — scrub the brain across your real capture dates. */}
          <PlanchetteTimeline />
        </div>

        {/* Readiness + context + upload */}
        <div className="flex flex-col gap-4">
          <SystemReadiness />
          {systemicKind ? (
            <SystemicPanel kind={systemicKind} value={systemicKind === "body" ? bodyValue : gutScore} />
          ) : (
            <RegionPanel
              region={region}
              value={region ? regionValues[region.id] ?? null : null}
              baseline={region ? regionBaseline[region.id] ?? null : null}
              series={region ? regionSeries(region.id) : []}
              mindState={mindState}
            />
          )}
          <UploadDropzone />
        </div>
      </div>

      <SectionLabel>All regions</SectionLabel>
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
        variants={staggerContainer(0.025)}
        initial="hidden"
        animate="show"
      >
        {BRAIN_REGIONS.map((r) => {
          const v = regionValues[r.id]
          const active = activeId === r.id
          const modality = MODALITY_BY_ID[REGION_MODALITY[r.id]]
          const preview = () => setHovered(r.id)
          const clearPreview = () => setHovered(null)
          return (
            <motion.button
              key={r.id}
              variants={fadeUp}
              whileTap={PRESS}
              // Hover (mouse) and focus (keyboard) both drive the 3D preview.
              onMouseEnter={preview}
              onMouseLeave={clearPreview}
              onFocus={preview}
              onBlur={clearPreview}
              onClick={() => setSelected((cur) => (cur === r.id ? null : r.id))}
              className={`text-left rounded-md border px-3 py-2.5 min-h-[44px] transition-colors duration-200 ${
                active ? "border-perception/50 bg-perception/10" : "border-border bg-panel/50 hover:border-perception/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-foreground/85 truncate">{r.name}</span>
                <span className="text-[10px] font-mono tabular text-perception">
                  <AnimatedNumber value={v != null ? v * 100 : null} format={(n) => `${Math.round(n)}%`} />
                </span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-obsidian/70 overflow-hidden">
                <motion.div
                  className="h-full bg-perception/70"
                  animate={{ width: v != null ? `${Math.round(v * 100)}%` : "0%" }}
                  transition={SPRING.glide}
                />
              </div>
              <div className="mt-1 text-[8px] font-mono text-text-faint uppercase tracking-wider">{modality?.short ?? "—"}</div>
            </motion.button>
          )
        })}
      </motion.div>
    </ViewShell>
  )
}
