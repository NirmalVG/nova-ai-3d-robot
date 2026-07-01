"use client"

import { useNovaStore } from "@/store/useNovaStore"
import { useEffect, useState } from "react"
import { EMOTION_ICONS } from "@/lib/types"

export default function ChatSubtitles() {
  const { userTranscript, novaResponse, currentState, emotionalState } = useNovaStore()
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (userTranscript || novaResponse) {
      setVisible(true)
      setFadeOut(false)
    }
  }, [userTranscript, novaResponse])

  // Auto-hide after 8 seconds of IDLE
  useEffect(() => {
    if (currentState !== "IDLE" || !visible) return

    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => setVisible(false), 500)
    }, 8000)

    return () => clearTimeout(timer)
  }, [currentState, visible, novaResponse])

  if (!visible || (!userTranscript && !novaResponse)) return null

  // Truncate long messages for subtitle display
  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + "..." : text

  return (
    <div
      className={`text-center space-y-2 max-w-2xl mx-auto transition-all duration-500
        ${fadeOut ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
    >
      {userTranscript && (
        <p className="text-base sm:text-lg font-normal text-white/60 italic tracking-wide">
          &ldquo;{truncate(userTranscript, 120)}&rdquo;
        </p>
      )}

      {currentState === "THINKING" ? (
        <p className="text-xl sm:text-2xl font-light text-cyan-400/50 tracking-wide animate-pulse">
          Processing neural link...
        </p>
      ) : (
        novaResponse && (
          <p className="text-xl sm:text-2xl font-light text-white tracking-wide">
            {emotionalState !== "neutral" && (
              <span className="mr-2">{EMOTION_ICONS[emotionalState]}</span>
            )}
            <span className="text-cyan-400 font-medium">
              {truncate(novaResponse, 120)}
            </span>
          </p>
        )
      )}
    </div>
  )
}
