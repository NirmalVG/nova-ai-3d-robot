"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import {
  OrbitControls,
  PerspectiveCamera,
  ContactShadows,
  useGLTF,
  useAnimations,
} from "@react-three/drei"
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing"
import { useEffect, useRef, useMemo, Suspense } from "react"
import * as THREE from "three"
import { useNovaStore } from "@/store/useNovaStore"
import type { Emotion, EnvironmentPreset } from "@/lib/types"

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOTION_COLORS: Record<Emotion, THREE.Color> = {
  neutral: new THREE.Color(0x06b6d4),
  happy: new THREE.Color(0x22d3ee),
  curious: new THREE.Color(0xa855f7),
  excited: new THREE.Color(0xfbbf24),
  sad: new THREE.Color(0x6366f1),
  bored: new THREE.Color(0x64748b),
  surprised: new THREE.Color(0xf97316),
  thoughtful: new THREE.Color(0x8b5cf6),
}

const STATE_COLORS: Record<string, THREE.Color> = {
  IDLE: new THREE.Color(0x06b6d4),
  LISTENING: new THREE.Color(0x22d3ee),
  THINKING: new THREE.Color(0xa855f7),
  SPEAKING: new THREE.Color(0x67e8f9),
}

const BASE_Y = -1.0
const CAMERA_TARGET_Y = BASE_Y + 0.9

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
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const t = e.touches[0]
        cursorRef.current.set(
          (t.clientX / window.innerWidth) * 2 - 1,
          -((t.clientY / window.innerHeight) * 2 - 1),
        )
      }
    }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("touchmove", handleTouchMove)
    }
  }, [])

  return cursorRef
}

// ─── Material Color Applier ──────────────────────────────────────────────────

function useApplyMaterialColor(scene: THREE.Object3D) {
  const lastColorRef = useRef<string>("")

  useFrame(() => {
    const colorPreset = useNovaStore.getState().materialColor
    if (colorPreset === lastColorRef.current) return
    lastColorRef.current = colorPreset

    const colorMap: Record<string, string> = {
      chrome: "#C0C0C0",
      white: "#F0F0F0",
      obsidian: "#1a1a2e",
      gold: "#FFD700",
      cyan: "#06b6d4",
      crimson: "#DC143C",
    }

    const hex = colorMap[colorPreset] || "#C0C0C0"
    const tintColor = new THREE.Color(hex)

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const mat = mesh.material
        if (mat && "color" in mat) {
          const m = mat as THREE.MeshStandardMaterial
          // Blend: keep original brightness, shift hue
          m.color.lerp(tintColor, 0.3)
          m.needsUpdate = true
        }
      }
    })
  })
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

  const groupRef = useRef<THREE.Group | null>(null)
  const baseYOffset = useRef(0)

  // Apply material color tinting
  useApplyMaterialColor(scene)

  useEffect(() => {
    headBoneRef.current = null
    neckBoneRef.current = null
    spineBoneRef.current = null

    // Play idle animation
    if (names.length > 0) {
      const idleName = names.find((n) => n.toLowerCase().includes("idle")) || names[0]
      actions[idleName]?.reset().fadeIn(0.5).play()
    }

    // Free head/neck/spine from animation keyframes
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

    // Find bones
    scene.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        const bone = obj as THREE.Object3D
        const name = bone.name

        if (name.startsWith("mixamorigHead") && !name.startsWith("mixamorigHeadTop")) {
          headBoneRef.current = bone
        }
        if (name.startsWith("mixamorigNeck")) {
          neckBoneRef.current = bone
        }
        if (name.startsWith("mixamorigSpine1") || name.startsWith("mixamorigSpine2")) {
          spineBoneRef.current = bone
        }
        if (!spineBoneRef.current && name.startsWith("mixamorigSpine")) {
          spineBoneRef.current = bone
        }
      }
    })

    // Position model
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const scale = useNovaStore.getState().robotScale
    const xOffset = -center.x * scale
    const zOffset = -center.z * scale
    baseYOffset.current = BASE_Y - box.min.y * scale

    if (groupRef.current) {
      groupRef.current.position.set(xOffset, baseYOffset.current, zOffset)
    }

    // Signal loading complete
    useNovaStore.getState().setIsLoaded(true)

    return () => {
      mixer?.removeEventListener("loop", freeHeadTracks)
    }
  }, [actions, names, scene, animations, mixer])

  // Per-frame loop
  useFrame((_, delta) => {
    const state = useNovaStore.getState().currentState
    const emotion = useNovaStore.getState().emotionalState
    const scale = useNovaStore.getState().robotScale
    const cursor = cursorRef.current

    // Update scale
    if (groupRef.current) {
      const children = groupRef.current.children
      if (children.length > 0) {
        children[0].scale.setScalar(scale)
      }
    }

    // 1. Float with emotion influence
    const floatSpeed = emotion === "excited" ? 1.4 : emotion === "bored" ? 0.4 : 0.8
    const floatAmplitude = emotion === "excited" ? 0.07 : emotion === "sad" ? 0.02 : 0.04
    floatOffset.current += delta * floatSpeed
    if (groupRef.current) {
      groupRef.current.position.y =
        baseYOffset.current + Math.sin(floatOffset.current) * floatAmplitude
    }

    // 2. Head tracking
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

    // 3. Body lean
    const targetLean =
      state === "LISTENING"
        ? 0.06
        : state === "THINKING"
          ? -0.04
          : emotion === "curious"
            ? 0.03
            : 0

    smoothLean.current = THREE.MathUtils.lerp(
      smoothLean.current,
      targetLean,
      delta * 3,
    )

    if (spineBoneRef.current) {
      spineBoneRef.current.rotation.x = smoothLean.current
    }

    // 4. Speaking sway / emotion body language
    if (spineBoneRef.current) {
      let targetSway = 0
      if (state === "SPEAKING") {
        targetSway = Math.sin(floatOffset.current * 2.5) * 0.02
      } else if (emotion === "happy" || emotion === "excited") {
        targetSway = Math.sin(floatOffset.current * 1.5) * 0.01
      }

      spineBoneRef.current.rotation.z = THREE.MathUtils.lerp(
        spineBoneRef.current.rotation.z,
        targetSway,
        delta * 3,
      )
    }
  })

  return (
    <group ref={groupRef} position={[0, BASE_Y, 0]}>
      <primitive object={scene} scale={useNovaStore.getState().robotScale} />
    </group>
  )
}

// ─── Dynamic Lighting ─────────────────────────────────────────────────────────

function DynamicLighting() {
  const keyRef = useRef<THREE.SpotLight>(null)
  const rimRef = useRef<THREE.PointLight>(null)

  useFrame((_, delta) => {
    const state = useNovaStore.getState().currentState
    const emotion = useNovaStore.getState().emotionalState

    // Blend state color with emotion color
    const stateColor = STATE_COLORS[state] ?? STATE_COLORS.IDLE
    const emotionColor = EMOTION_COLORS[emotion] ?? EMOTION_COLORS.neutral
    const blendedColor = stateColor.clone().lerp(emotionColor, 0.3)

    keyRef.current?.color.lerp(blendedColor, delta * 2)
    rimRef.current?.color.lerp(emotionColor, delta * 2)

    if (keyRef.current) {
      const targetIntensity =
        state === "LISTENING"
          ? 3.0
          : state === "THINKING"
            ? 2.5
            : state === "SPEAKING"
              ? 2.5
              : emotion === "excited"
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
      <spotLight
        ref={keyRef}
        position={[4, 6, 5]}
        angle={0.2}
        penumbra={1}
        intensity={2}
        color="#06b6d4"
        castShadow={false}
      />
      <spotLight
        position={[-4, 4, -4]}
        angle={0.2}
        penumbra={1}
        intensity={0.8}
        color="#ffffff"
      />
      <pointLight
        ref={rimRef}
        position={[0, -0.5, 2]}
        intensity={0.6}
        color="#06b6d4"
      />
    </>
  )
}

// ─── Sci-Fi Ground Grid ───────────────────────────────────────────────────────

function GroundGrid() {
  const gridRef = useRef<THREE.GridHelper>(null)

  useFrame((_, delta) => {
    if (gridRef.current) {
      gridRef.current.position.z = ((gridRef.current.position.z + delta * 0.1) % 0.5)
    }
  })

  return (
    <gridHelper
      ref={gridRef}
      args={[20, 40, 0x06b6d4, 0x06b6d4]}
      position={[0, BASE_Y - 0.01, 0]}
      material-opacity={0.12}
      material-transparent={true}
    />
  )
}

// ─── Environment Wrapper ─────────────────────────────────────────────────────

function SceneEnvironment() {
  const environment = useNovaStore((s) => s.environment)

  const config = useMemo(() => {
    const presets: Record<
      EnvironmentPreset,
      {
        background: string
        fog: string
        primary: string
        secondary: string
        intensity: number
      }
    > = {
      city: {
        background: "#020617",
        fog: "#031728",
        primary: "#06b6d4",
        secondary: "#a855f7",
        intensity: 1.2,
      },
      sunset: {
        background: "#120911",
        fog: "#3b1021",
        primary: "#f97316",
        secondary: "#fbbf24",
        intensity: 1.35,
      },
      dawn: {
        background: "#07111f",
        fog: "#16324a",
        primary: "#67e8f9",
        secondary: "#c4b5fd",
        intensity: 1.1,
      },
      night: {
        background: "#02030a",
        fog: "#050816",
        primary: "#6366f1",
        secondary: "#22d3ee",
        intensity: 0.9,
      },
      warehouse: {
        background: "#070a0d",
        fog: "#111827",
        primary: "#94a3b8",
        secondary: "#06b6d4",
        intensity: 1,
      },
      forest: {
        background: "#030d0a",
        fog: "#064e3b",
        primary: "#34d399",
        secondary: "#22d3ee",
        intensity: 1.05,
      },
      apartment: {
        background: "#0f1014",
        fog: "#1f2937",
        primary: "#e5e7eb",
        secondary: "#38bdf8",
        intensity: 1.15,
      },
      studio: {
        background: "#08090d",
        fog: "#18181b",
        primary: "#f8fafc",
        secondary: "#06b6d4",
        intensity: 1.4,
      },
      park: {
        background: "#07120f",
        fog: "#14532d",
        primary: "#86efac",
        secondary: "#38bdf8",
        intensity: 1.1,
      },
      lobby: {
        background: "#080814",
        fog: "#172554",
        primary: "#60a5fa",
        secondary: "#22d3ee",
        intensity: 1.25,
      },
    }

    return presets[environment]
  }, [environment])

  return (
    <>
      <color attach="background" args={[config.background]} />
      <fog attach="fog" args={[config.fog, 5, 16]} />
      <hemisphereLight
        args={[config.primary, config.background, 0.45 * config.intensity]}
      />
      <pointLight
        position={[-3, 2.5, -3]}
        intensity={0.55 * config.intensity}
        color={config.secondary}
      />
    </>
  )
}

// ─── Post Processing ─────────────────────────────────────────────────────────

function PostProcessing() {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.6}
        luminanceSmoothing={0.9}
        intensity={0.4}
      />
      <Vignette offset={0.3} darkness={0.7} />
    </EffectComposer>
  )
}

// ─── Responsive Camera ───────────────────────────────────────────────────────

function ResponsiveCamera() {
  const size = useThree((state) => state.size)

  const cameraSettings = useMemo(() => {
    if (size.width < 640) {
      return { position: [0, 0.5, 5.5] as [number, number, number], fov: 50 }
    }

    if (size.width < 1024) {
      return { position: [0, 0.5, 4.5] as [number, number, number], fov: 47 }
    }

    return { position: [0, 0.5, 4] as [number, number, number], fov: 45 }
  }, [size.width])

  return <PerspectiveCamera makeDefault {...cameraSettings} />
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

export default function NovaScene() {
  return (
    <div className="w-full h-screen bg-transparent pointer-events-auto">
      <Canvas camera={{ position: [0, 0.5, 4], fov: 45 }} shadows>
        <DynamicLighting />
        <ResponsiveCamera />

        <Suspense fallback={null}>
          <NovaModel />

          <GroundGrid />

          <ContactShadows
            position={[0, BASE_Y, 0]}
            opacity={0.5}
            scale={8}
            blur={2}
            far={4}
          />

          <SceneEnvironment />
        </Suspense>

        <PostProcessing />

        <OrbitControls
          makeDefault
          target={[0, CAMERA_TARGET_Y, 0]}
          enablePan={false}
          enableRotate={true}
          enableZoom={true}
          minDistance={2}
          maxDistance={7}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
        />
      </Canvas>
    </div>
  )
}

useGLTF.preload("/nova.glb")
