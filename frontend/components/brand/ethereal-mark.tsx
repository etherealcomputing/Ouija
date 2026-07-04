"use client"

import { useState } from "react"

// The Ethereal Computing crescent. Renders the real asset at
// `/ethereal-mark.png` (drop the exact file into frontend/public/); until that
// file exists it falls back to an inline SVG crescent so the header is never
// broken.

export function EtherealMark({ size = 38, className = "" }: { size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)

  if (!failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src="/ethereal-mark.png"
        alt="ethereal computing"
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ objectFit: "contain", width: size, height: size }}
        className={className}
      />
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label="ethereal computing">
      <defs>
        <linearGradient id="ec-crescent" x1="0.15" y1="0.1" x2="0.9" y2="0.95">
          <stop offset="0" stopColor="#ff9ecb" />
          <stop offset="0.45" stopColor="#f82090" />
          <stop offset="1" stopColor="#d80f74" />
        </linearGradient>
        <mask id="ec-crescent-mask">
          <rect width="100" height="100" fill="black" />
          <circle cx="52" cy="52" r="40" fill="white" />
          <circle cx="38" cy="40" r="35" fill="black" />
        </mask>
      </defs>
      <rect width="100" height="100" fill="url(#ec-crescent)" mask="url(#ec-crescent-mask)" />
    </svg>
  )
}
