"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface RadialGaugeProps {
  /** 0–100 */
  value: number
  size?: number
  stroke?: number
  /** CSS color (e.g. var(--color-operator) or #fff). */
  color?: string
  trackColor?: string
  /** Sweep in degrees (default 270 - a 3/4 dial). */
  sweep?: number
  label?: ReactNode
  sublabel?: ReactNode
  /** Render tick marks around the arc. */
  ticks?: number
  children?: ReactNode
}

export function RadialGauge({
  value,
  size = 160,
  stroke = 10,
  color = "var(--color-operator)",
  trackColor = "rgba(120,165,215,0.10)",
  sweep = 270,
  label,
  sublabel,
  ticks = 0,
  children,
}: RadialGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2 - 4
  const cx = size / 2
  const cy = size / 2
  // Round to 2dp so SSR and client serialize the same string (hydration-safe).
  const round2 = (n: number) => Math.round(n * 100) / 100
  const circumference = round2(2 * Math.PI * r)
  const arcLength = round2((sweep / 360) * circumference)
  const dash = round2((clamped / 100) * arcLength)
  // Rotate the whole svg so the arc's start (3 o'clock) lands bottom-left,
  // leaving the (360-sweep) gap centered at the bottom.
  const rotation = 90 + (360 - sweep) / 2

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: `rotate(${rotation}deg)` }}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
        />
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${dash} ${circumference}` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        {ticks > 0 &&
          Array.from({ length: ticks }).map((_, i) => {
            const a = ((i / (ticks - 1)) * sweep) * (Math.PI / 180)
            const r1 = r - stroke / 2 - 3
            const r2 = r - stroke / 2 - 8
            return (
              <line
                key={i}
                x1={cx + Math.cos(a) * r1}
                y1={cy + Math.sin(a) * r1}
                x2={cx + Math.cos(a) * r2}
                y2={cy + Math.sin(a) * r2}
                stroke="rgba(120,165,215,0.25)"
                strokeWidth={1}
              />
            )
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        {children ?? (
          <>
            {label && <div className="font-display text-2xl text-foreground tabular leading-none">{label}</div>}
            {sublabel && (
              <div className="text-[9px] text-text-dim font-mono tracking-[0.16em] uppercase mt-1">{sublabel}</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
