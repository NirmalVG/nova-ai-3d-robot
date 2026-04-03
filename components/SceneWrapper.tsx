"use client" // This tells Next.js this file is a Client Component

import dynamic from "next/dynamic"

// Dynamically import the viewer with SSR disabled here
const ModelViewer = dynamic(() => import("../components/nova-ui/ModelViewer"), {
  ssr: false,
  loading: () => <p style={{ color: "white" }}>Loading 3D Scene...</p>,
})

export default function SceneWrapper() {
  return <ModelViewer />
}
