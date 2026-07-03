"use client"

// Client-only wrapper for the WebGL scene. Next SSR must never import three,
// so the scene is dynamically imported with ssr:false behind a lightweight
// loading shim.

import dynamic from "next/dynamic"
import type { BrainSceneProps } from "./brain-scene"

const BrainScene = dynamic(() => import("./brain-scene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-3 text-text-dim">
        <div className="w-10 h-10 rounded-full border-2 border-perception/30 border-t-perception animate-spin" />
        <span className="text-[10px] font-mono tracking-[0.18em]">RENDERING ATLAS…</span>
      </div>
    </div>
  ),
})

export function BrainCanvas(props: BrainSceneProps) {
  return (
    <div className="absolute inset-0">
      <BrainScene {...props} />
    </div>
  )
}
