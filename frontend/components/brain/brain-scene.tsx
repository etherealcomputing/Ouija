"use client"

// The r3f brain scene. Rendered client-only (see brain-canvas.tsx).
// React context does NOT cross the Canvas boundary, so all data arrives as
// plain props (computed in brain-view via useAtlas) — never useContext here.

import { useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Line, OrbitControls } from "@react-three/drei"
import { Bloom, EffectComposer } from "@react-three/postprocessing"
import * as THREE from "three"
import { ATLAS_EDGES, BRAIN_REGIONS, type BrainRegion } from "@/lib/brain-atlas"

const SCALE = 1.5
const PINK = new THREE.Color("#f82090")
const VIOLET = new THREE.Color("#b96ce6")
const DIM = new THREE.Color("#5a2a52")

/** Map atlas coords [x(L/R), y(post/ant), z(down/up)] → three [x, up, ant]. */
function place(pos: [number, number, number]): [number, number, number] {
  return [pos[0] * SCALE, pos[2] * SCALE * 0.95, pos[1] * SCALE * 1.15]
}

const REGION_POS: Record<string, [number, number, number]> = Object.fromEntries(
  BRAIN_REGIONS.map((r) => [r.id, place(r.pos)]),
)

/** Subtly displaced ellipsoid hull — a stylized brain, not an anatomy model. */
function BrainHull() {
  const geom = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 5)
    const p = g.attributes.position as THREE.BufferAttribute
    const v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      const n = v.clone().normalize()
      // Ellipsoid + gentle gyri-like ripples (deterministic).
      const ripple =
        0.05 * Math.sin(n.x * 9 + n.y * 7) +
        0.04 * Math.sin(n.y * 11 + n.z * 6) +
        0.03 * Math.sin(n.z * 13 + n.x * 5)
      v.set(n.x * (1 + ripple), n.y * (0.9 + ripple), n.z * (1.15 + ripple))
      p.setXYZ(i, v.x, v.y, v.z)
    }
    g.computeVertexNormals()
    return g
  }, [])

  const wire = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (wire.current) wire.current.rotation.y += dt * 0.02
  })

  return (
    <group scale={SCALE}>
      <mesh geometry={geom}>
        <meshStandardMaterial color="#2a0a1e" emissive="#3a0a24" emissiveIntensity={0.4} transparent opacity={0.16} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh geometry={geom} ref={wire} scale={1.002}>
        <meshBasicMaterial color={PINK} wireframe transparent opacity={0.14} />
      </mesh>
    </group>
  )
}

function RegionNode({
  region,
  value,
  hovered,
  selected,
  onHover,
  onSelect,
  phase,
}: {
  region: BrainRegion
  value: number | undefined
  hovered: boolean
  selected: boolean
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
  phase: number
}) {
  const ref = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const covered = region.channels.length > 0
  const v = value ?? (covered ? 0.4 : 0.15)
  const base = 0.055 + v * 0.06

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const pulse = 1 + Math.sin(t * 1.8 + phase) * 0.06
    const target = (hovered || selected ? 1.6 : 1) * pulse
    if (ref.current) {
      ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, target, 0.2))
      const mat = ref.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.6 + v * 2.2 + (hovered || selected ? 1.2 : 0)
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.02
      const m = ringRef.current.material as THREE.MeshBasicMaterial
      m.opacity = THREE.MathUtils.lerp(m.opacity, hovered || selected ? 0.9 : 0, 0.2)
    }
  })

  const color = covered ? PINK : DIM
  return (
    <group position={REGION_POS[region.id]}>
      <mesh
        ref={ref}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(region.id)
          document.body.style.cursor = "pointer"
        }}
        onPointerOut={() => {
          onHover(null)
          document.body.style.cursor = "auto"
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(region.id)
        }}
      >
        <sphereGeometry args={[base, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} toneMapped={false} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[base * 2.1, 0.006, 8, 40]} />
        <meshBasicMaterial color={VIOLET} transparent opacity={0} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Arcs() {
  return (
    <group>
      {ATLAS_EDGES.map(([a, b], i) => (
        <Line key={i} points={[REGION_POS[a], REGION_POS[b]]} color="#8e3a86" lineWidth={1} transparent opacity={0.35} />
      ))}
    </group>
  )
}

export interface BrainSceneProps {
  values: Record<string, number>
  hovered: string | null
  selected: string | null
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}

export default function BrainScene({ values, hovered, selected, onHover, onSelect }: BrainSceneProps) {
  const [ready, setReady] = useState(true)
  return (
    <Canvas
      camera={{ position: [0, 0.3, 4.4], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0)
        setReady(true)
      }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 3, 4]} intensity={40} color="#ff7ab8" />
      <pointLight position={[-4, -2, -3]} intensity={30} color="#b96ce6" />

      <BrainHull />
      <Arcs />
      {BRAIN_REGIONS.map((r, i) => (
        <RegionNode
          key={r.id}
          region={r}
          value={values[r.id]}
          hovered={hovered === r.id}
          selected={selected === r.id}
          onHover={onHover}
          onSelect={onSelect}
          phase={i * 0.7}
        />
      ))}

      <OrbitControls enablePan={false} enableZoom autoRotate autoRotateSpeed={0.7} minDistance={3} maxDistance={7} target={[0, 0, 0]} />
      {ready && (
        <EffectComposer>
          <Bloom intensity={1.1} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur radius={0.7} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
