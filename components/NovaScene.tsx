"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import {
  OrbitControls,
  Environment,
  ContactShadows,
  useGLTF,
  useAnimations,
  Center,
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

// World x=0 = screen center = behind mic button.
// <Center> handles model geometry offset automatically.
const BASE_Y = -1.0

const BONES_TO_FREE = [
  "mixamorigHead",
  "mixamorigNeck",
  "mixamorigSpine1",
  "mixamorigSpine2",
]

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
  const { actions, names, mixer } = useAnimations(animations, scene)
  const cursorRef = useCursorTarget()

  const headBoneRef = useRef<THREE.Object3D | null>(null)
  const spineBoneRef = useRef<THREE.Object3D | null>(null)
  const neckBoneRef = useRef<THREE.Object3D | null>(null)

  const smoothHeadRot = useRef(new THREE.Euler(0, 0, 0))
  const smoothLean = useRef(0)
  const floatOffset = useRef(0)

  // We use a group ref for the float animation so Center
  // keeps control of the model's centering
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    headBoneRef.current = null
    neckBoneRef.current = null
    spineBoneRef.current = null

    // ── Play idle animation ────────────────────────────────────────────────
    if (names.length > 0) {
      const action = actions[names[0]]
      action?.reset().fadeIn(0.5).play()
    }

    // ── Free head/neck/spine from animation keyframes ─────────────────────
    function freeHeadTracks() {
      animations.forEach((clip) => {
        clip.tracks.forEach((track) => {
          const boneName = track.name.split(".")[0]
          const shouldFree = BONES_TO_FREE.some((b) => boneName.startsWith(b))
          if (shouldFree && track.name.includes("quaternion")) {
            const qt = track as THREE.QuaternionKeyframeTrack
            for (let i = 0; i < qt.values.length; i += 4) {
              qt.values[i] = 0
              qt.values[i + 1] = 0
              qt.values[i + 2] = 0
              qt.values[i + 3] = 1
            }
          }
        })
      })
    }

    freeHeadTracks()
    mixer?.addEventListener("loop", freeHeadTracks)

    // ── Find bones ─────────────────────────────────────────────────────────
    scene.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        const bone = obj as THREE.Object3D
        const name = bone.name

        if (
          name.startsWith("mixamorigHead") &&
          !name.startsWith("mixamorigHeadTop")
        ) {
          headBoneRef.current = bone
        }

        if (name.startsWith("mixamorigNeck")) {
          neckBoneRef.current = bone
        }

        if (
          name.startsWith("mixamorigSpine1") ||
          name.startsWith("mixamorigSpine2")
        ) {
          spineBoneRef.current = bone
        }

        if (!spineBoneRef.current && name.startsWith("mixamorigSpine")) {
          spineBoneRef.current = bone
        }
      }

      // Remove emissive — state colors come from lighting only
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        const mat = mesh.material
        if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const stdMat = mat as THREE.MeshStandardMaterial
          stdMat.emissive = new THREE.Color(0x000000)
          stdMat.emissiveIntensity = 0
        }
      }
    })

    console.log(
      "🦴 Head:",
      (headBoneRef.current as THREE.Object3D | null)?.name ?? "NOT FOUND",
    )
    console.log(
      "🦴 Neck:",
      (neckBoneRef.current as THREE.Object3D | null)?.name ?? "NOT FOUND",
    )
    console.log(
      "🦴 Spine:",
      (spineBoneRef.current as THREE.Object3D | null)?.name ?? "NOT FOUND",
    )

    return () => {
      mixer?.removeEventListener("loop", freeHeadTracks)
    }
  }, [actions, names, scene, animations, mixer])

  // ── Per-frame loop ─────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    const state = useNovaStore.getState().currentState
    const cursor = cursorRef.current

    // ── 1. Float — drives the group, not the scene ─────────────────────────
    floatOffset.current += delta * 0.8
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(floatOffset.current) * 0.04
    }

    // ── 2. Head tracking ──────────────────────────────────────────────────
    const targetYaw = cursor.x * 0.3
    const targetPitch = cursor.y * 0.2
    const lerpSpeed = state === "LISTENING" ? 6 : 3

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

    if (headBoneRef.current) {
      headBoneRef.current.rotation.y = smoothHeadRot.current.y * 0.6
      headBoneRef.current.rotation.x = smoothHeadRot.current.x * 0.6
    }
    if (neckBoneRef.current) {
      neckBoneRef.current.rotation.y = smoothHeadRot.current.y * 0.4
      neckBoneRef.current.rotation.x = smoothHeadRot.current.x * 0.4
    }

    // ── 3. Body lean ──────────────────────────────────────────────────────
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
    if (spineBoneRef.current) {
      const targetSway =
        state === "SPEAKING" ? Math.sin(floatOffset.current * 2.5) * 0.02 : 0

      spineBoneRef.current.rotation.z = THREE.MathUtils.lerp(
        spineBoneRef.current.rotation.z,
        targetSway,
        delta * 3,
      )
    }
  })

  // ── Center automatically centers the model's bounding box ─────────────────
  // This is the definitive fix for model offset issues — no manual position
  // tweaking needed. Center measures the geometry and places it at x=0, y=0.
  // We then raise the group to BASE_Y so feet sit at the floor plane.
  return (
    <group ref={groupRef} position={[0, BASE_Y, 0]}>
      <Center>
        <primitive object={scene} scale={1.5} />
      </Center>
    </group>
  )
}

// ─── Dynamic Lighting ─────────────────────────────────────────────────────────

function DynamicLighting() {
  const keyRef = useRef<THREE.SpotLight>(null)
  const rimRef = useRef<THREE.PointLight>(null)

  useFrame((_, delta) => {
    const state = useNovaStore.getState().currentState
    const targetColor = STATE_COLORS[state] ?? STATE_COLORS.IDLE

    keyRef.current?.color.lerp(targetColor, delta * 2)
    rimRef.current?.color.lerp(targetColor, delta * 2)

    if (keyRef.current) {
      const targetIntensity =
        state === "LISTENING"
          ? 3.0
          : state === "THINKING"
            ? 2.5
            : state === "SPEAKING"
              ? 2.5
              : 2.0

      keyRef.current.intensity = THREE.MathUtils.lerp(
        keyRef.current.intensity,
        targetIntensity,
        delta * 3,
      )
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />

      {/* Key light */}
      <spotLight
        ref={keyRef}
        position={[4, 6, 5]}
        angle={0.2}
        penumbra={1}
        intensity={2}
        color="#06b6d4"
        castShadow={false}
      />

      {/* Fill light */}
      <spotLight
        position={[-4, 4, -4]}
        angle={0.2}
        penumbra={1}
        intensity={0.8}
        color="#ffffff"
      />

      {/* Rim light */}
      <pointLight
        ref={rimRef}
        position={[0, -0.5, 2]}
        intensity={0.6}
        color="#06b6d4"
      />
    </>
  )
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

export default function NovaScene() {
  return (
    <div className="w-full h-screen bg-transparent pointer-events-auto">
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 45 }}
        onCreated={({ gl }) => {
          const ctx = gl.getContext()
          const orig = ctx.getShaderInfoLog.bind(ctx)
          ctx.getShaderInfoLog = (shader: WebGLShader) => {
            const log = orig(shader)
            if (log && log.includes("X4122")) return null
            return log
          }
        }}
      >
        <DynamicLighting />

        <Suspense fallback={null}>
          <NovaModel />

          <ContactShadows
            position={[0, BASE_Y, 0]}
            opacity={0.5}
            scale={8}
            blur={2}
            far={4}
          />

          <Environment preset="city" />
        </Suspense>

        {/* target=[0,0,0] — camera zooms toward true world center */}
        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enablePan={false}
          enableRotate={true}
          enableZoom={true}
          minDistance={2}
          maxDistance={7}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  )
}

useGLTF.preload("/nova.glb")
