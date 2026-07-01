"use client"

import { ReactNode, useEffect, useRef } from "react"
import TopHUD from "./TopHUD"
import ChatSubtitles from "./ChatSubtitles"
import DateTimeDisplay from "./DateTimeDisplay"
import InteractionDock from "./InteractionDock"
import ConfigurationPanel from "./ConfigurationPanel"
import LoadingScreen from "./LoadingScreen"
import OnboardingOverlay from "./OnboardingOverlay"
import ChatPanel from "./ChatPanel"
import { ClientOnly } from "./ClientOnly"
import { useNovaStore } from "@/store/useNovaStore"
import type { Emotion } from "@/lib/types"

interface NovaLayoutProps {
  children?: ReactNode
}

// ─── Proactive Message Hook ──────────────────────────────────────────────────
// After 3 minutes of inactivity, Nova may send a proactive message

function useProactiveMessages() {
  const lastInteractionRef = useRef(Date.now())
  const proactiveTriggeredRef = useRef(false)

  useEffect(() => {
    const updateInteraction = () => {
      lastInteractionRef.current = Date.now()
      proactiveTriggeredRef.current = false
    }

    window.addEventListener("click", updateInteraction)
    window.addEventListener("keydown", updateInteraction)

    const interval = setInterval(async () => {
      const elapsed = Date.now() - lastInteractionRef.current
      const state = useNovaStore.getState().currentState

      // Trigger after 3 minutes of inactivity, only once, only when idle
      if (elapsed > 180000 && !proactiveTriggeredRef.current && state === "IDLE") {
        proactiveTriggeredRef.current = true

        try {
          const userFacts = useNovaStore.getState().userFacts
          const res = await fetch("/api/proactive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userFacts }),
          })

          if (res.ok) {
            const { text } = await res.json()
            // Parse emotion and show as a proactive message
            const match = text.match(/\[EMOTION:(\w+)\]/i)
            const cleanText = text.replace(/\[EMOTION:\w+\]/gi, "").trim()
            const emotion: Emotion = match ? (match[1] as Emotion) : "curious"

            useNovaStore.getState().setEmotionalState(emotion)
            useNovaStore.getState().setTranscripts("", cleanText)
            useNovaStore.getState().addToHistory({
              role: "assistant",
              content: cleanText,
              timestamp: Date.now(),
              emotion,
            })

            // Speak it
            const utterance = new SpeechSynthesisUtterance(cleanText)
            const vs = useNovaStore.getState().voiceSettings
            utterance.pitch = vs.pitch
            utterance.rate = vs.rate
            utterance.volume = vs.volume
            useNovaStore.getState().setCurrentState("SPEAKING")
            utterance.onend = () => useNovaStore.getState().setCurrentState("IDLE")
            utterance.onerror = () => useNovaStore.getState().setCurrentState("IDLE")
            window.speechSynthesis.speak(utterance)
          }
        } catch (_e) {
          // Silently fail
        }
      }
    }, 30000) // Check every 30s

    return () => {
      window.removeEventListener("click", updateInteraction)
      window.removeEventListener("keydown", updateInteraction)
      clearInterval(interval)
    }
  }, [])
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function NovaLayout({ children }: NovaLayoutProps) {
  // Suppress noisy ANGLE shader precision warnings
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

  // Proactive messages
  useProactiveMessages()

  return (
    <div className="relative w-full h-screen overflow-hidden text-white font-sans bg-neutral-950">
      {/* Loading Screen — renders immediately, handles its own lifecycle */}
      <LoadingScreen />

      {/* 1. The 3D Canvas Layer (Z-Index 0) */}
      <div className="absolute inset-0 z-0">{children}</div>

      {/* 2. The 2D UI Overlay Layer (Z-Index 10) — wrapped in ClientOnly to prevent hydration mismatch */}
      <ClientOnly>
        {/* Onboarding (first-time only) */}
        <OnboardingOverlay />

        <div className="absolute inset-0 z-10 pointer-events-none p-3 sm:p-6 md:p-12 safe-top">
          {/* Top HUD */}
          <div className="pointer-events-auto">
            <TopHUD />
          </div>

          {/* Configuration Panel — self-positioned */}
          <div className="pointer-events-auto">
            <ConfigurationPanel />
          </div>

          {/* Chat Panel — self-positioned */}
          <div className="pointer-events-auto">
            <ChatPanel />
          </div>

          {/* Subtitles Area — sits above the dock */}
          <div className="absolute bottom-28 sm:bottom-44 left-1/2 -translate-x-1/2 pointer-events-auto w-full px-4">
            <ChatSubtitles />
          </div>

          {/* Date Time Display — bottom left, desktop only */}
          <div className="absolute bottom-6 sm:bottom-12 left-3 sm:left-6 md:left-12 pointer-events-auto hidden md:block">
            <DateTimeDisplay />
          </div>

          {/* Interaction Dock — centered at bottom */}
          <div className="absolute bottom-4 sm:bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto safe-bottom">
            <InteractionDock />
          </div>
        </div>
      </ClientOnly>
    </div>
  )
}
