"use client" // Keep this if using Next.js App Router

// 1. Import core React and Three.js
import { Suspense, useEffect, useState } from "react"
import * as THREE from "three"

// 2. Import R3F and Drei helpers
import { Canvas } from "@react-three/fiber"
import {
  OrbitControls,
  Bounds,
  useGLTF,
  Environment,
  useAnimations,
  Html,
  useProgress,
  ContactShadows,
} from "@react-three/drei"

// 3. Import Post-Processing effects
import { EffectComposer, Bloom, ToneMapping } from "@react-three/postprocessing"

// --- THE LOADING COMPONENT ---
function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div
        style={{
          color: "#00ffcc",
          fontFamily: "sans-serif",
          fontWeight: "bold",
        }}
      >
        Loading Model... {progress.toFixed(0)}%
      </div>
    </Html>
  )
}

// --- THE INTERACTIVE ROBOT COMPONENT ---
interface RobotProps {
  currentAction: string
  setActiveAnim: (anim: string) => void
}

function InteractiveRobot({ currentAction, setActiveAnim }: RobotProps) {
  // Replace '/dancing-robot.glb' with your actual file name
  const { scene, animations } = useGLTF("/nova.glb")
  const { actions } = useAnimations(animations, scene)

  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)

  useEffect(() => {
    // Enable shadows for all meshes inside the model (with TypeScript fix)
    scene.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    console.log("Total animations inside this file:", animations.length)
    console.log("The raw animation data is:", animations)

    // Play the current animation smoothly
    const action = actions[currentAction]
    if (action) {
      action.reset().fadeIn(0.5).play()
    }

    // Change cursor on hover
    document.body.style.cursor = hovered ? "pointer" : "auto"

    // Cleanup: fade out old animation and reset cursor
    return () => {
      if (action) action.fadeOut(0.5)
      document.body.style.cursor = "auto"
    }
  }, [currentAction, actions, scene, hovered])

  return (
    <primitive
      object={scene}
      scale={clicked ? 1.1 : 1}
      onPointerOver={(e: any) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e: any) => {
        e.stopPropagation()
        setClicked(!clicked)
        // Ensure you change 'Jump' to an animation name that actually exists in your file!
        setActiveAnim("Jump")
      }}
    />
  )
}

// --- THE MAIN VIEWER COMPONENT ---
export default function ModelViewer() {
  // Change "Idle" to your file's default animation name
  const [activeAnim, setActiveAnim] = useState("Idle")

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#050505",
        position: "relative",
      }}
    >
      {/* HTML UI OVERLAY */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          color: "white",
          zIndex: 10,
          fontFamily: "sans-serif",
        }}
      >
        <h2>Interactive 3D Robot</h2>
        <p>Try clicking directly on the model!</p>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          gap: "10px",
        }}
      >
        {/* Remember to update these strings to match your real animation names */}
        <button onClick={() => setActiveAnim("Samba")} style={buttonStyle}>
          Samba Dance
        </button>
        <button onClick={() => setActiveAnim("HipHop")} style={buttonStyle}>
          Hip Hop
        </button>
        <button onClick={() => setActiveAnim("Idle")} style={buttonStyle}>
          Idle
        </button>
      </div>

      {/* THE 3D CANVAS */}
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
        {/* Lights */}
        <ambientLight intensity={0.2} />
        <directionalLight
          castShadow
          position={[10, 10, 10]}
          intensity={2}
          shadow-mapSize={[1024, 1024]}
        />
        <Environment preset="night" />

        {/* Camera Controls */}
        <OrbitControls makeDefault />

        {/* Model, Bounds, and Floor Shadow */}
        <Suspense fallback={<Loader />}>
          <Bounds fit clip observe margin={1.2}>
            <InteractiveRobot
              currentAction={activeAnim}
              setActiveAnim={setActiveAnim}
            />
          </Bounds>

          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.8}
            scale={10}
            blur={2.5}
            far={4}
            color="#000000"
          />
        </Suspense>

        {/* Post Processing (Bloom / Glow) */}
        <EffectComposer>
          <Bloom luminanceThreshold={1.5} mipmapBlur intensity={1.2} />
          <ToneMapping />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

// Button styling
const buttonStyle = {
  padding: "10px 20px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#ffffff",
  color: "#000000",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
  transition: "transform 0.1s",
}

// Preload the model
useGLTF.preload("/nova.glb")
