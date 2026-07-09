"use client"

// A number that rolls to its value instead of snapping. When a metric grounds
// (— → 73%) the readout should feel alive and match the animated gauges beneath
// it. Reduced-motion → instant. Renders "—" (or a custom placeholder) for null.

import { useEffect, useRef, useState } from "react"
import { animate } from "framer-motion"
import { DUR, EASE, useMotionPrefs } from "@/lib/motion"

export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  placeholder = "—",
  duration = DUR.slower,
  className,
}: {
  value: number | null | undefined
  format?: (n: number) => string
  placeholder?: string
  duration?: number
  className?: string
}) {
  const { reduced } = useMotionPrefs()
  const [display, setDisplay] = useState(value ?? 0)
  const prev = useRef(value ?? 0)

  useEffect(() => {
    if (value == null) return
    if (reduced) {
      setDisplay(value)
      prev.current = value
      return
    }
    const controls = animate(prev.current, value, {
      duration,
      ease: EASE.standard,
      onUpdate: (v) => setDisplay(v),
    })
    prev.current = value
    return () => controls.stop()
  }, [value, reduced, duration])

  if (value == null) return <span className={className}>{placeholder}</span>
  return (
    <span className={className} suppressHydrationWarning>
      {format(display)}
    </span>
  )
}
