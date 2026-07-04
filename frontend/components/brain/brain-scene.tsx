"use client"

// The r3f brain scene — the high-fidelity WebGL core. Rendered client-only
// (see brain-canvas.tsx). React context does NOT cross the Canvas boundary, so
// all data arrives as plain props (computed in brain-view via useAtlas).
//
// Fidelity stack:
//   • a gyrified cerebrum (CPU-displaced icosphere, longitudinal fissure) shaded
//     by a custom GLSL material: fresnel rim, depth gradient, sulcal darkening
//     driven by a per-vertex fold attribute, and flowing subsurface energy
//   • an activity-reactive inner core that glows through the translucent cortex
//   • cerebellum + brainstem, a faint neural-dust particle field for depth
//   • glowing per-region nodes (colour ramps violet→pink with value), connectome
//     arcs + signal pulses that travel faster/brighter as regions carry data
//   • a 3D-anchored HUD label on hover (the generated-info teaser)
//   • Bloom + Vignette + subtle chromatic aberration for a cinematic lens

import { useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Html, Line, OrbitControls } from "@react-three/drei"
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from "@react-three/postprocessing"
import { BlendFunction } from "postprocessing"
import * as THREE from "three"
import { ATLAS_EDGES, BRAIN_REGIONS, type BrainRegion } from "@/lib/brain-atlas"

const SCALE = 1.5
const PINK = new THREE.Color("#f82090")
const VIOLET = new THREE.Color("#b96ce6")
const DIM = new THREE.Color("#5a2a52")
const DEEP = new THREE.Color("#2a0818")
const CA_OFFSET = new THREE.Vector2(0.0006, 0.0006)

/** Map atlas coords [x(L/R), y(post/ant), z(down/up)] → three [x, up, ant]. */
function place(pos: [number, number, number]): [number, number, number] {
  return [pos[0] * SCALE, pos[2] * SCALE * 0.95, pos[1] * SCALE * 1.15]
}
const REGION_POS: Record<string, THREE.Vector3> = Object.fromEntries(
  BRAIN_REGIONS.map((r) => [r.id, new THREE.Vector3(...place(r.pos))]),
)

// ── Deterministic fractal value-noise (self-contained, no dep) ─────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function makeFbm(seed: number) {
  const rand = mulberry32(seed)
  const perm = new Float32Array(512)
  for (let i = 0; i < 512; i++) perm[i] = rand()
  const hash = (x: number, y: number, z: number) => {
    const xi = (x & 255), yi = (y & 255), zi = (z & 255)
    return perm[(xi + perm[(yi + perm[zi & 255]) & 255]) & 255]
  }
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const noise = (x: number, y: number, z: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z)
    const fx = smooth(x - x0), fy = smooth(y - y0), fz = smooth(z - z0)
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const c = (dx: number, dy: number, dz: number) => hash(x0 + dx, y0 + dy, z0 + dz)
    const x00 = lerp(c(0, 0, 0), c(1, 0, 0), fx)
    const x10 = lerp(c(0, 1, 0), c(1, 1, 0), fx)
    const x01 = lerp(c(0, 0, 1), c(1, 0, 1), fx)
    const x11 = lerp(c(0, 1, 1), c(1, 1, 1), fx)
    return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz) * 2 - 1
  }
  return (x: number, y: number, z: number) => {
    let sum = 0, amp = 0.5, freq = 1
    for (let o = 0; o < 4; o++) {
      // Ridged (abs) noise → sulci-like grooves between gyri.
      sum += (1 - Math.abs(noise(x * freq, y * freq, z * freq))) * amp
      amp *= 0.5
      freq *= 2.05
    }
    return sum - 0.75
  }
}

// ── Custom cortex shader: fresnel rim + depth gradient + fold-shaded sulci ──
const CORTEX_VERT = /* glsl */ `
  attribute float aFold;
  varying vec3 vN;
  varying vec3 vView;
  varying vec3 vPos;
  varying float vFold;
  void main() {
    vPos = position;
    vFold = aFold;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
const CORTEX_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uActivity;
  uniform vec3 uDeep;
  uniform vec3 uPink;
  uniform vec3 uViolet;
  varying vec3 vN;
  varying vec3 vView;
  varying vec3 vPos;
  varying float vFold;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(vView);
    float ndv = max(dot(N, V), 0.0);
    float fres = pow(1.0 - ndv, 3.0);

    // Depth gradient bottom→top.
    float grad = smoothstep(-1.15, 1.15, vPos.y);
    vec3 body = mix(uDeep, uPink * 0.5, grad);

    // Sulcal shading: gyral crowns (high fold) bright, grooves dark.
    float crown = 0.5 + smoothstep(-0.18, 0.12, vFold) * 0.75;
    body *= crown;

    // Flowing subsurface energy — livelier with activity.
    float flow = sin(vPos.y * 7.0 + vPos.x * 4.0 + uTime * 1.2) * 0.5 + 0.5;
    float flow2 = sin(vPos.z * 6.0 - uTime * 0.8) * 0.5 + 0.5;
    body += uViolet * (flow * flow2) * 0.10 * (0.5 + uActivity);

    // View-dependent rim glow.
    vec3 rim = mix(uPink, uViolet, fres) * fres * (1.0 + uActivity * 1.3);

    vec3 col = body + rim;
    float alpha = 0.34 + fres * 0.52 + grad * 0.05;
    gl_FragColor = vec4(col, alpha);
  }
`

function makeCortexMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: CORTEX_VERT,
    fragmentShader: CORTEX_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uActivity: { value: 0.3 },
      uDeep: { value: DEEP.clone() },
      uPink: { value: PINK.clone() },
      uViolet: { value: VIOLET.clone() },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  })
}

/** A gyrified cerebrum: ellipsoid + median longitudinal fissure + cortical folds. */
function useCerebrum() {
  return useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 6)
    const fbm = makeFbm(1337)
    const p = g.attributes.position as THREE.BufferAttribute
    const folds = new Float32Array(p.count)
    const v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      const n = v.clone().normalize()
      const fold =
        0.07 * fbm(n.x * 2.6 + 5, n.y * 2.6, n.z * 2.6) + // primary gyri
        0.036 * fbm(n.x * 5.2 + 11, n.y * 5.2, n.z * 5.2) + // secondary folds
        0.018 * fbm(n.x * 9.4 + 23, n.y * 9.4, n.z * 9.4) // fine tertiary detail
      // Median longitudinal fissure: a deeper groove that splits the hemispheres.
      const fissure = Math.exp(-(n.x * n.x) / 0.02) * Math.max(0, n.y * 0.7 + 0.3) * 0.3
      const disp = fold - fissure
      const r = 1 + disp
      v.set(n.x * r * 1.0, n.y * r * 0.82, n.z * r * 1.16)
      p.setXYZ(i, v.x, v.y, v.z)
      folds[i] = disp
    }
    g.setAttribute("aFold", new THREE.BufferAttribute(folds, 1))
    g.computeVertexNormals()
    return g
  }, [])
}

/** The cerebellum: a smaller body with tighter horizontal foliation. */
function useCerebellum() {
  return useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.44, 4)
    const fbm = makeFbm(90210)
    const p = g.attributes.position as THREE.BufferAttribute
    const v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      const n = v.clone().normalize()
      const foliation = 0.05 * Math.sin(n.y * 34) + 0.03 * fbm(n.x * 5, n.y * 5, n.z * 5)
      const r = 1 + foliation
      v.set(n.x * r * 1.25, n.y * r * 0.72, n.z * r)
      p.setXYZ(i, v.x, v.y, v.z)
    }
    g.computeVertexNormals()
    return g
  }, [])
}

function Cortex({ activity }: { activity: number }) {
  const cerebrum = useCerebrum()
  const cerebellum = useCerebellum()
  const group = useRef<THREE.Group>(null)
  const wire = useRef<THREE.Mesh>(null)
  const core = useRef<THREE.Mesh>(null)
  const material = useMemo(makeCortexMaterial, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    material.uniforms.uTime.value = t
    material.uniforms.uActivity.value = THREE.MathUtils.lerp(material.uniforms.uActivity.value, activity, 0.05)
    if (group.current) group.current.scale.setScalar(SCALE * (1 + Math.sin(t * 0.6) * 0.012)) // breathing
    if (wire.current) wire.current.rotation.y += 0.0005
    if (core.current) {
      const pulse = 1 + Math.sin(t * 1.6) * 0.06
      core.current.scale.setScalar(pulse)
      const m = core.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.12 + activity * 0.3 + Math.sin(t * 1.6) * 0.03
    }
  })

  return (
    <group ref={group} scale={SCALE}>
      {/* Cerebrum: shaded translucent cortex + additive rim halo + faint wire folds */}
      <mesh geometry={cerebrum} material={material} />
      <mesh geometry={cerebrum} ref={wire} scale={1.002}>
        <meshBasicMaterial color={PINK} wireframe transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <mesh geometry={cerebrum} scale={1.05}>
        <meshBasicMaterial color={PINK} side={THREE.BackSide} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Deep-brain activity core, glowing through the translucent cortex */}
      <mesh ref={core}>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshBasicMaterial color={VIOLET} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Cerebellum (posterior-inferior) */}
      <group position={[0, -0.42, -0.82]}>
        <mesh geometry={cerebellum}>
          <meshStandardMaterial color="#330f26" emissive="#4a0e30" emissiveIntensity={0.45} transparent opacity={0.68} roughness={0.7} />
        </mesh>
        <mesh geometry={cerebellum} scale={1.05}>
          <meshBasicMaterial color={VIOLET} side={THREE.BackSide} transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      {/* Brainstem */}
      <mesh position={[0, -0.62, -0.5]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.09, 0.5, 16]} />
        <meshStandardMaterial color="#3a0f28" emissive="#5a1038" emissiveIntensity={0.4} transparent opacity={0.7} roughness={0.7} />
      </mesh>
    </group>
  )
}

/** A faint field of drifting "neural dust" behind the brain for depth. */
function NeuralDust() {
  const points = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const rand = mulberry32(4242)
    const N = 420
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      // Shell between r=2.4 and r=4.2 so dust sits around, not inside, the brain.
      const r = 2.4 + rand() * 1.8
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(rand() * 2 - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.8
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return g
  }, [])
  useFrame((state) => {
    if (points.current) points.current.rotation.y = state.clock.elapsedTime * 0.02
  })
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color={PINK} size={0.03} transparent opacity={0.5} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  )
}

function RegionNode({
  region, value, hovered, selected, onHover, onSelect, phase,
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
  const base = 0.05 + v * 0.06
  // Colour ramps violet (low) → hot pink (high) for covered regions.
  const color = useMemo(() => (covered ? VIOLET.clone().lerp(PINK, v) : DIM.clone()), [covered, v])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const pulse = 1 + Math.sin(t * (1.2 + v * 2.4) + phase) * 0.08 // faster pulse when active
    const target = (hovered || selected ? 1.7 : 1) * pulse
    if (ref.current) {
      ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, target, 0.25))
      const mat = ref.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.6 + v * 2.6 + (hovered || selected ? 1.4 : 0)
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.03
      const m = ringRef.current.material as THREE.MeshBasicMaterial
      m.opacity = THREE.MathUtils.lerp(m.opacity, hovered || selected ? 0.9 : 0, 0.2)
    }
  })

  return (
    <group position={REGION_POS[region.id]}>
      <mesh
        ref={ref}
        onPointerOver={(e) => { e.stopPropagation(); onHover(region.id); document.body.style.cursor = "pointer" }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = "auto" }}
        onClick={(e) => { e.stopPropagation(); onSelect(region.id) }}
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

/** Signal pulses that travel each connectome edge; faster + brighter with data. */
function PulseEdges({ values }: { values: Record<string, number> }) {
  const edges = useMemo(
    () =>
      ATLAS_EDGES.map(([a, b], i) => ({ a: REGION_POS[a], b: REGION_POS[b], ida: a, idb: b, phase: (i * 0.37) % 1 })).filter(
        (e) => e.a && e.b,
      ),
    [],
  )
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    edges.forEach((e, i) => {
      const m = refs.current[i]
      if (!m) return
      const act = ((values[e.ida] ?? 0.25) + (values[e.idb] ?? 0.25)) / 2
      const speed = 0.12 + act * 0.5
      const tt = (t * speed + e.phase) % 1
      m.position.lerpVectors(e.a, e.b, tt)
      m.scale.setScalar(0.4 + act * 1.2)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = 0.25 + act * 0.7
    })
  })
  return (
    <group>
      {edges.map((e, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshBasicMaterial color={PINK} transparent opacity={0.4} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Soft cortical activation glow per region — larger + brighter with more data. */
function RegionAuras({ values }: { values: Record<string, number> }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    BRAIN_REGIONS.forEach((r, i) => {
      const m = refs.current[i]
      if (!m) return
      const v = values[r.id]
      const on = v != null
      const breathe = 1 + Math.sin(t * 1.4 + i) * 0.06
      const target = on ? (0.16 + v * 0.2) * breathe : 0.0001
      m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, target, 0.12))
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, on ? 0.05 + (v as number) * 0.16 : 0, 0.12)
    })
  })
  return (
    <group>
      {BRAIN_REGIONS.map((r, i) => (
        <mesh key={r.id} ref={(el) => (refs.current[i] = el)} position={REGION_POS[r.id]} scale={0.0001}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={PINK} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function Arcs() {
  return (
    <group>
      {ATLAS_EDGES.map(([a, b], i) =>
        REGION_POS[a] && REGION_POS[b] ? (
          <Line key={i} points={[REGION_POS[a].toArray(), REGION_POS[b].toArray()]} color="#8e3a86" lineWidth={1} transparent opacity={0.3} />
        ) : null,
      )}
    </group>
  )
}

/** A compact 3D-anchored label for the active region — the generated-info teaser. */
function RegionLabel({ region, value }: { region: BrainRegion; value: number | undefined }) {
  const pos = REGION_POS[region.id]
  if (!pos) return null
  const pct = value != null ? `${Math.round(value * 100)}%` : "—"
  return (
    <Html position={pos} center distanceFactor={7} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div className="translate-y-[-150%] whitespace-nowrap rounded-md border border-perception/50 bg-obsidian/85 px-2.5 py-1 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-foreground">{region.name}</span>
          <span className="text-[11px] font-mono tabular text-perception">{pct}</span>
        </div>
        <div className="text-[8px] font-mono uppercase tracking-[0.14em] text-text-faint">{region.lobe}</div>
      </div>
    </Html>
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
  // Overall activation drives the shader glow + the deep-brain core.
  const activity = useMemo(() => {
    const vs = Object.values(values)
    if (!vs.length) return 0.25
    return vs.reduce((a, b) => a + b, 0) / vs.length
  }, [values])

  const activeId = hovered ?? selected
  const activeRegion = activeId ? BRAIN_REGIONS.find((r) => r.id === activeId) ?? null : null

  return (
    <Canvas
      camera={{ position: [0, 0.3, 4.6], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ambientLight intensity={0.55} />
      <pointLight position={[3, 3, 4]} intensity={45} color="#ff7ab8" />
      <pointLight position={[-4, -2, -3]} intensity={32} color="#b96ce6" />
      <pointLight position={[0, 2, -4]} intensity={18} color="#f82090" />

      <NeuralDust />
      <Cortex activity={activity} />
      <RegionAuras values={values} />
      <Arcs />
      <PulseEdges values={values} />
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
      {activeRegion && <RegionLabel region={activeRegion} value={values[activeRegion.id]} />}

      <OrbitControls enablePan={false} enableZoom autoRotate autoRotateSpeed={0.7} minDistance={3} maxDistance={7} target={[0, 0, 0]} />
      <EffectComposer>
        <Bloom intensity={1.15} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur radius={0.72} />
        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={CA_OFFSET} radialModulation={false} modulationOffset={0} />
        <Vignette eskil={false} offset={0.28} darkness={0.72} />
      </EffectComposer>
    </Canvas>
  )
}
