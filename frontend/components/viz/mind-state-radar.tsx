"use client"

import { motion } from "framer-motion"
import type { MindState, StateDimensions } from "@/lib/ouija-data"
import { MIND_STATES } from "@/lib/ouija-data"
import { STATE_VISUALS } from "@/lib/state-visuals"

interface MindStateCoreProps {
  state: MindState
  dimensions: StateDimensions
  /** Coordinate-space size; the rendered radar is fluid up to this width. */
  size?: number
}

const AXES: { key: keyof StateDimensions; label: string }[] = [
  { key: "focus", label: "FOCUS" },
  { key: "calm", label: "CALM" },
  { key: "load", label: "LOAD" },
  { key: "arousal", label: "AROUSAL" },
  { key: "fatigue", label: "FATIGUE" },
]

export function MindStateCore({ state, dimensions, size = 280 }: MindStateCoreProps) {
  const color = STATE_VISUALS[state].cssVar
  const meta = MIND_STATES[state]
  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - 38

  const angleFor = (i: number) => (-90 + (i * 360) / AXES.length) * (Math.PI / 180)
  const pointFor = (i: number, value: number) => {
    const a = angleFor(i)
    return [cx + Math.cos(a) * maxR * value, cy + Math.sin(a) * maxR * value] as const
  }

  const dataPoints = AXES.map((axis, i) => pointFor(i, Math.max(0.04, Math.min(1, dimensions[axis.key]))))
  const polygon = dataPoints.map((p) => p.join(",")).join(" ")
  const rings = [0.25, 0.5, 0.75, 1]

  const tickOuter = size / 2 - 6
  return (
    <div
      className="relative w-full"
      style={{ maxWidth: size, aspectRatio: "1 / 1" }}
      role="img"
      aria-label={`Mind state ${meta.label}: focus ${Math.round(dimensions.focus * 100)}%, calm ${Math.round(dimensions.calm * 100)}%, load ${Math.round(dimensions.load * 100)}%, arousal ${Math.round(dimensions.arousal * 100)}%, fatigue ${Math.round(dimensions.fatigue * 100)}%`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" aria-hidden="true">
        {/* slow rotating tick ring */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 90, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          style={{ transformOrigin: "center", transformBox: "fill-box" }}
        >
          <circle cx={cx} cy={cy} r={tickOuter} fill="none" stroke="rgba(200,166,196,0.08)" strokeWidth={1} />
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i * 6) * (Math.PI / 180)
            const long = i % 5 === 0
            const r1 = tickOuter
            const r2 = tickOuter - (long ? 6 : 3)
            return (
              <line
                key={i}
                x1={cx + Math.cos(a) * r1}
                y1={cy + Math.sin(a) * r1}
                x2={cx + Math.cos(a) * r2}
                y2={cy + Math.sin(a) * r2}
                stroke="rgba(200,166,196,0.22)"
                strokeWidth={1}
              />
            )
          })}
        </motion.g>

        {/* rings */}
        {rings.map((rr, ri) => (
          <polygon
            key={ri}
            points={AXES.map((_, i) => pointFor(i, rr).join(",")).join(" ")}
            fill="none"
            stroke="rgba(200,166,196,0.10)"
            strokeWidth={1}
          />
        ))}
        {/* axes */}
        {AXES.map((axis, i) => {
          const [x, y] = pointFor(i, 1)
          const [lx, ly] = pointFor(i, 1.18)
          return (
            <g key={axis.key}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(200,166,196,0.10)" strokeWidth={1} />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: 8, fontFamily: "var(--font-plex)", letterSpacing: "0.12em", fill: "var(--color-text-dim)" }}
              >
                {axis.label}
              </text>
            </g>
          )
        })}
        {/* data polygon — keyed by state so transitions re-announce visually */}
        <motion.polygon
          key={state}
          points={polygon}
          fill={color}
          fillOpacity={0.14}
          stroke={color}
          strokeWidth={1.6}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ transformOrigin: "center", filter: `drop-shadow(0 0 8px ${color})` }}
        />
        {dataPoints.map(([x, y], i) => (
          <motion.circle
            key={`${state}-${i}`}
            cx={x}
            cy={y}
            r={2.6}
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.06 }}
          />
        ))}
      </svg>

      {/* center readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.div
          className="text-4xl breathe"
          style={{ color }}
          animate={{ filter: [`drop-shadow(0 0 8px ${color})`, `drop-shadow(0 0 18px ${color})`, `drop-shadow(0 0 8px ${color})`] }}
          transition={{ duration: 3.5, repeat: Number.POSITIVE_INFINITY }}
        >
          {meta.glyph}
        </motion.div>
        <div className="font-display text-sm tracking-[0.22em] mt-1" style={{ color }}>
          {meta.label}
        </div>
        <div className="text-[9px] text-text-dim font-mono mt-1 tabular">
          INDEX {meta.effectiveness}
        </div>
      </div>
    </div>
  )
}
