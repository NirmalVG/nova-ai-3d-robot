"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import {
  OrbitControls,
  Environment,
  ContactShadows,
  useGLTF,
  useAnimations,
} from "@react-three/drei"
import { useEffect, useRef, Suspense } from "react"
import * as THREE from "three"
import { useNovaStore } from "@/store/useNovaStore"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATE_COLORS: Record<string, THREE.Color> = {
  IDLE: new THREE.Color(0x06b6d4),
  LISTENING: new THREE.Color(0x22d3ee),
  THINKING: new THREE.Color(0xa855f7),
  SPEAKING: new THREE.Color(0x67e8f9),
}

const STATE_EMISSIVE_INTENSITY: Record<string, number> = {
  IDLE: 0.3,
  LISTENING: 1.2,
  THINKING: 0.8,
  SPEAKING: 1.0,
}

// Base position — Nova is shifted left so she sits behind the mic button
// in the visible area left of the config panel (~360px on the right).
const BASE_X = -2.0 // model offset — camera stays at 0
const BASE_Y = -0.5 // raise her up — she's too low

// ─── Cursor Tracker ───────────────────────────────────────────────────────────

function useCursorTarget() {
  const cursorRef = useRef(new THREE.Vector2(0, 0))

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cursorRef.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      )
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return cursorRef
}

// ─── Nova Model ───────────────────────────────────────────────────────────────

function NovaModel() {
  const { scene, animations } = useGLTF("/nova.glb")
  const { actions, names } = useAnimations(animations, scene)
  const cursorRef = useCursorTarget()

  // Using Object3D instead of Bone — Bone extends Object3D and we only
  // need name/rotation/position. Avoids TypeScript narrowing issues
  // when Three.js types conflict across R3F module boundaries.
  const headBoneRef = useRef<THREE.Object3D | null>(null)
  const spineBoneRef = useRef<THREE.Object3D | null>(null)
  const neckBoneRef = useRef<THREE.Object3D | null>(null)

  // Smoothed animation values — lerped each frame
  const smoothHeadRot = useRef(new THREE.Euler(0, 0, 0))
  const smoothEmissive = useRef(new THREE.Color(0x06b6d4))
  const smoothIntensity = useRef(0.3)
  const smoothLean = useRef(0)
  const floatOffset = useRef(0)

  // All emissive materials collected from the model
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([])

  useEffect(() => {
    // ── Reset refs on each mount ───────────────────────────────────────────
    // Prevents double-population in React StrictMode (dev only)
    materialsRef.current = []
    headBoneRef.current = null
    neckBoneRef.current = null
    spineBoneRef.current = null

    // ── Override any rotation/scale baked into the GLB on export ──────────
    // Some Mixamo/Blender exporters bake transforms onto the root scene
    // object. We reset everything so Nova is upright and forward-facing.
    scene.rotation.set(0, 0, 0)
    scene.scale.set(1, 1, 1)
    scene.position.set(BASE_X, BASE_Y, 0)

    // If Nova appears sideways or lying flat, uncomment the correct line:
    // scene.rotation.set(-Math.PI / 2, 0, 0)  // lying flat on back
    // scene.rotation.set(0, Math.PI, 0)        // facing away from camera
    // scene.rotation.set(0, Math.PI / 2, 0)   // facing left
    // scene.rotation.set(0, -Math.PI / 2, 0)  // facing right

    // ── Play idle animation ────────────────────────────────────────────────
    if (names.length > 0) {
      const action = actions[names[0]]
      action?.reset().fadeIn(0.5).play()
    }

    // ── Find bones + collect materials ────────────────────────────────────
    scene.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        // Cast to Object3D — has name + rotation, avoids Bone type issues
        const bone = obj as THREE.Object3D
        const name = bone.name

        // Use startsWith — this model appends numeric suffixes like _06.
        // e.g. mixamorigHead_06, mixamorigNeck_05, mixamorigSpine2_04.
        // Exclude HeadTop explicitly so the end-effector doesn't win.
        if (
          name.startsWith("mixamorigHead") &&
          !name.startsWith("mixamorigHeadTop")
        ) {
          headBoneRef.current = bone
        }

        if (name.startsWith("mixamorigNeck")) {
          neckBoneRef.current = bone
        }

        // Prefer Spine1 or Spine2 over root Spine for more natural lean
        if (
          name.startsWith("mixamorigSpine1") ||
          name.startsWith("mixamorigSpine2")
        ) {
          spineBoneRef.current = bone
        }

        // Fallback to root Spine if Spine1/2 not found yet
        if (!spineBoneRef.current && name.startsWith("mixamorigSpine")) {
          spineBoneRef.current = bone
        }
      }

      // Collect all PBR materials for emissive glow control
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        const mat = mesh.material
        if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const stdMat = mat as THREE.MeshStandardMaterial
          stdMat.emissive = new THREE.Color(0x06b6d4)
          stdMat.emissiveIntensity = 0.3
          materialsRef.current.push(stdMat)
        }
      }
    })

    console.log(
      "🦴 Head bone:",
      (headBoneRef.current as THREE.Object3D | null)?.name ?? "NOT FOUND",
    )
    console.log(
      "🦴 Neck bone:",
      (neckBoneRef.current as THREE.Object3D | null)?.name ?? "NOT FOUND",
    )
    console.log(
      "🦴 Spine bone:",
      (spineBoneRef.current as THREE.Object3D | null)?.name ?? "NOT FOUND",
    )
    console.log("✨ Emissive materials:", materialsRef.current.length)
  }, [actions, names, scene])

  // ── Per-frame animation loop ───────────────────────────────────────────────
  useFrame((_, delta) => {
    const state = useNovaStore.getState().currentState
    const cursor = cursorRef.current

    // ── 1. Idle float ──────────────────────────────────────────────────────
    // Use position.set so X and Z never drift from their base values
    floatOffset.current += delta * 0.8
    scene.position.set(BASE_X, BASE_Y + Math.sin(floatOffset.current) * 0.04, 0)

    // ── 2. Head tracking toward cursor ────────────────────────────────────
    const maxYaw = 0.4 // left/right limit in radians (~23°)
    const maxPitch = 0.25 // up/down limit in radians (~14°)

    const targetYaw = cursor.x * maxYaw
    const targetPitch = cursor.y * maxPitch

    // Snappier when listening — Nova is paying close attention
    const lerpSpeed = state === "LISTENING" ? 8 : 4

    smoothHeadRot.current.y = THREE.MathUtils.lerp(
      smoothHeadRot.current.y,
      targetYaw,
      delta * lerpSpeed,
    )
    smoothHeadRot.current.x = THREE.MathUtils.lerp(
      smoothHeadRot.current.x,
      -targetPitch,
      delta * lerpSpeed,
    )

    // Split tracking between neck and head for a more natural look
    if (headBoneRef.current) {
      headBoneRef.current.rotation.y = smoothHeadRot.current.y * 0.6
      headBoneRef.current.rotation.x = smoothHeadRot.current.x * 0.6
    }
    if (neckBoneRef.current) {
      neckBoneRef.current.rotation.y = smoothHeadRot.current.y * 0.4
      neckBoneRef.current.rotation.x = smoothHeadRot.current.x * 0.4
    }

    // ── 3. State-driven body lean ──────────────────────────────────────────
    // LISTENING → lean forward (attentive)
    // THINKING  → lean back slightly (processing)
    // SPEAKING  → upright
    const targetLean =
      state === "LISTENING" ? 0.06 : state === "THINKING" ? -0.04 : 0

    smoothLean.current = THREE.MathUtils.lerp(
      smoothLean.current,
      targetLean,
      delta * 3,
    )

    if (spineBoneRef.current) {
      spineBoneRef.current.rotation.x = smoothLean.current
    }

    // ── 4. Speaking sway ──────────────────────────────────────────────────
    // Subtle left/right sway while Nova talks — feels alive, not robotic
    if (spineBoneRef.current) {
      const targetSway =
        state === "SPEAKING" ? Math.sin(floatOffset.current * 2.5) * 0.02 : 0

      spineBoneRef.current.rotation.z = THREE.MathUtils.lerp(
        spineBoneRef.current.rotation.z,
        targetSway,
        delta * 3,
      )
    }

    // ── 5. Emissive glow ──────────────────────────────────────────────────
    const targetColor = STATE_COLORS[state] ?? STATE_COLORS.IDLE
    const targetIntensity = STATE_EMISSIVE_INTENSITY[state] ?? 0.3

    // Pulse multiplier — LISTENING pulses fast, THINKING slow, rest steady
    const pulse =
      state === "LISTENING"
        ? Math.sin(floatOffset.current * 6) * 0.3 + 0.9
        : state === "THINKING"
          ? Math.sin(floatOffset.current * 4) * 0.2 + 0.8
          : 1.0

    smoothEmissive.current.lerp(targetColor, delta * 3)
    smoothIntensity.current = THREE.MathUtils.lerp(
      smoothIntensity.current,
      targetIntensity * pulse,
      delta * 3,
    )

    for (const mat of materialsRef.current) {
      mat.emissive.copy(smoothEmissive.current)
      mat.emissiveIntensity = smoothIntensity.current
    }
  })

  return (
    <primitive
      object={scene}
      scale={1.5}
      position={[BASE_X, BASE_Y, 0]}
      rotation={[0, 0, 0]}
    />
  )
}

// ─── Dynamic Lighting ─────────────────────────────────────────────────────────
// Key spotlight color drifts toward Nova's current state color,
// tinting the whole scene subtly.

function DynamicLighting() {
  const spotRef = useRef<THREE.SpotLight>(null)

  useFrame((_, delta) => {
    if (!spotRef.current) return
    const state = useNovaStore.getState().currentState
    const targetColor = STATE_COLORS[state] ?? STATE_COLORS.IDLE
    spotRef.current.color.lerp(targetColor, delta * 2)
  })

  return (
    <>
      <ambientLight intensity={0.4} />

      {/* Key light — color reacts to Nova's state */}
      <spotLight
        ref={spotRef}
        position={[5, 5, 5]}
        angle={0.15}
        penumbra={1}
        intensity={2}
        color="#06b6d4"
      />

      {/* Fill light — always white, softer */}
      <spotLight
        position={[-5, 5, -5]}
        angle={0.15}
        penumbra={1}
        intensity={0.8}
        color="#ffffff"
      />

      {/* Rim light from below — dramatic edge glow */}
      <pointLight position={[0, -1, 2]} intensity={0.5} color="#06b6d4" />
    </>
  )
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

export default function NovaScene() {
  return (
    <div className="w-full h-screen bg-transparent pointer-events-auto">
      <Canvas
        camera={{ position: [0, 1.0, 4.5], fov: 50 }}
        onCreated={({ gl }) => {
          // Suppress ANGLE shader precision warnings on Windows/Chrome
          const ctx = gl.getContext()
          const originalGetShaderInfoLog = ctx.getShaderInfoLog.bind(ctx)
          ctx.getShaderInfoLog = (shader: WebGLShader) => {
            const log = originalGetShaderInfoLog(shader)
            if (log && log.includes("X4122")) return null
            return log
          }
        }}
      >
        <DynamicLighting />

        <Suspense fallback={null}>
          <NovaModel />

          {/* Shadow follows Nova's base position */}
          <ContactShadows
            position={[BASE_X, BASE_Y, 0]}
            opacity={0.5}
            scale={10}
            blur={2}
            far={4}
          />

          <Environment preset="city" />
        </Suspense>

        {/* Rotation disabled — head tracking gives interactivity instead.
            Zoom with scroll still works. Nova always faces forward. */}
        <OrbitControls
          makeDefault
          target={[0, 0.8, 0]}
          enablePan={false}
          enableRotate={false}
          minDistance={3}
          maxDistance={6}
        />
      </Canvas>
    </div>
  )
}

useGLTF.preload("/nova.glb")
