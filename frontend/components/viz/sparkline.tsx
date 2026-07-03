"use client"

import { useEffect, useId, useRef, useState } from "react"

interface SparklineProps {
  /** Provide static data, or omit and pass `generator` for a live trace. */
  data?: number[]
  generator?: (t: number) => number
  points?: number
  width?: number
  height?: number
  color?: string
  fill?: boolean
  strokeWidth?: number
  className?: string
}

export function Sparkline({
  data,
  generator,
  points = 48,
  width = 120,
  height = 32,
  color = "var(--color-perception)",
  fill = true,
  strokeWidth = 1.4,
  className = "",
}: SparklineProps) {
  const id = useId().replace(/[:]/g, "")
  // Deterministic seed (no Math.random at init) → SSR-safe; live data fills in the effect.
  const [live, setLive] = useState<number[]>(() => data ?? Array.from({ length: points }, () => 0.5))
  const tRef = useRef(points)

  useEffect(() => {
    if (!generator) {
      if (data) setLive(data)
      return
    }
    setLive(Array.from({ length: points }, (_, i) => generator(i)))
    const interval = setInterval(() => {
      tRef.current += 1
      setLive((prev) => {
        const next = prev.slice(1)
        next.push(generator(tRef.current))
        return next
      })
    }, 120)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generator, data, points])

  const series = data && !generator ? data : live
  const max = Math.max(...series, 0.0001)
  const min = Math.min(...series, 0)
  const range = max - min || 1
  // Guard the degenerate window (0–1 points): a single point makes step Infinity
  // and i*step → NaN, which the SVG rejects. Render nothing until the trace fills.
  const step = series.length > 1 ? width / (series.length - 1) : 0
  const norm = (v: number) => height - ((v - min) / range) * (height - 2) - 1
  const line =
    series.length < 2
      ? ""
      : series.map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)},${norm(v).toFixed(2)}`).join(" ")
  const area = line ? `${line} L ${width},${height} L 0,${height} Z` : ""

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ width: "100%", height }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#spark-${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
