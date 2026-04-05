"use client"

import { ReactNode, useEffect } from "react"
import TopHUD from "./TopHUD"
import ChatSubtitles from "./ChatSubtitles"
import DateTimeDisplay from "./DateTimeDisplay"
import InteractionDock from "./InteractionDock"
import ConfigurationPanel from "./ConfigurationPanel"

interface NovaLayoutProps {
  children?: ReactNode
}

const glassClasses =
  "backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-xl"

export default function NovaLayout({ children }: NovaLayoutProps) {
  // Suppress noisy ANGLE shader precision warnings from Windows/Chrome ANGLE layer
  useEffect(() => {
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].includes("X4122")) return
      originalWarn(...args)
    }
    return () => {
      console.warn = originalWarn
    }
  }, [])

  return (
    <div className="relative w-full h-screen overflow-hidden text-white font-sans bg-neutral-950">
      {/* 1. The 3D Canvas Layer (Z-Index 0) */}
      <div className="absolute inset-0 z-0">{children}</div>

      {/* 2. The 2D UI Overlay Layer (Z-Index 10) */}
      <div className="absolute inset-0 z-10 pointer-events-none p-6 md:p-12">
        {/* Top HUD */}
        <div className="pointer-events-auto">
          <TopHUD />
        </div>

        {/* Right Configuration Panel — desktop only */}
        <div className="absolute top-1/2 right-6 md:right-12 -translate-y-1/2 pointer-events-auto hidden md:block">
          <ConfigurationPanel glassClasses={glassClasses} />
        </div>

        {/* Subtitles Area — sits above the dock */}
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2 pointer-events-auto w-full px-4">
          <ChatSubtitles />
        </div>

        {/* Date Time Display — bottom left, desktop only */}
        <div className="absolute bottom-12 left-6 md:left-12 pointer-events-auto hidden md:block">
          <DateTimeDisplay />
        </div>

        {/* Interaction Dock — centered at bottom */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto">
          <InteractionDock />
        </div>
      </div>
    </div>
  )
}
