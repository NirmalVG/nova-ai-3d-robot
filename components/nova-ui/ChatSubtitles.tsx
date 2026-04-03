"use client"

import { useNovaStore } from "@/store/useNovaStore"

export default function ChatSubtitles() {
  const { userTranscript, novaResponse, currentState } = useNovaStore()

  if (!userTranscript && !novaResponse) return null // Hide if empty

  return (
    <div className="text-center w-max p-2 space-y-2 max-w-2xl mx-auto">
      {userTranscript && (
        <p className="text-lg font-normal text-white/60 italic tracking-wide">
          User: ‘{userTranscript}’
        </p>
      )}

      {/* If thinking, show a cool loading state. Otherwise, show the response. */}
      {currentState === "THINKING" ? (
        <p className="text-2xl font-light text-cyan-400/50 tracking-wide animate-pulse">
          Processing neural link...
        </p>
      ) : (
        novaResponse && (
          <p className="text-2xl font-light text-white tracking-wide">
            Nova: ‘
            <span className="text-cyan-400 font-medium">{novaResponse}</span>’
          </p>
        )
      )}
    </div>
  )
}
