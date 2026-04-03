"use client"

import { Canvas } from "@react-three/fiber"
import {
  OrbitControls,
  Environment,
  Bounds,
  useGLTF,
  useAnimations,
  ContactShadows,
} from "@react-three/drei"
import { useEffect } from "react"
import { Suspense } from "react"

// This component actually renders the model
function NovaModel() {
  // Load the model from the public folder
  const { scene, animations } = useGLTF("/nova.glb")

  // Extract animations
  const { actions, names } = useAnimations(animations, scene)

  useEffect(() => {
    // Play the first animation (which should be our Idle animation)
    if (names.length > 0) {
      const action = actions[names[0]]
      action?.reset().fadeIn(0.5).play()
    }
  }, [actions, names])

  return (
    <primitive object={scene} scale={1.5} />
  )
}

export default function NovaScene() {
  return (
    <div className="w-full h-screen bg-transparent pointer-events-auto">
      <Canvas camera={{ position: [0, 1.5, 4], fov: 40 }}>
        {/* Mood Lighting */}
        <ambientLight intensity={0.4} />
        <spotLight
          position={[5, 5, 5]}
          angle={0.15}
          penumbra={1}
          intensity={2}
          color="#06b6d4"
        />
        <spotLight
          position={[-5, 5, -5]}
          angle={0.15}
          penumbra={1}
          intensity={1}
          color="#ffffff"
        />

        {/* Suspense is required when loading asynchronous 3D assets */}
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.15}>
            <NovaModel />
          </Bounds>

          {/* Adds a realistic soft shadow under her feet */}
          <ContactShadows
            position={[0, -1.35, 0]}
            opacity={0.4}
            scale={10}
            blur={2}
            far={4}
          />

          {/* Cinematic Environment Reflections */}
          <Environment preset="city" />
        </Suspense>

        <OrbitControls
          makeDefault
          target={[0, 1, 0]}
          enablePan={false}
          minPolarAngle={Math.PI / 3} // Don't allow camera to go under the floor
          maxPolarAngle={Math.PI / 2} // Don't allow camera to go over the top
          minDistance={2}
          maxDistance={6}
        />
      </Canvas>
    </div>
  )
}

// Preload the model so it loads faster on subsequent visits
useGLTF.preload("/nova.glb")
