"use client"

import { Mic, RotateCcw, Box } from "lucide-react"
import { useNovaStore } from "@/store/useNovaStore"
import { useNovaBrain } from "@/hooks/useNovaBrain"

export default function InteractionDock() {
  const currentState = useNovaStore((state) => state.currentState)
  const { startListening } = useNovaBrain()

  // Derived state to drive UI changes based on Nova's current action
  const isListening = currentState === "LISTENING"
  const isThinking = currentState === "THINKING"
  const isSpeaking = currentState === "SPEAKING"

  return (
    <div className="relative group">
      {/* Outer ambient glow - dynamically changes color and size based on state */}
      <div
        className={`absolute inset-0 rounded-full backdrop-blur-3xl transition-all duration-500 
        ${
          isListening
            ? "bg-cyan-400/50 scale-125 animate-pulse"
            : isThinking
              ? "bg-purple-500/40 scale-110 animate-pulse"
              : isSpeaking
                ? "bg-cyan-500/30 scale-110"
                : "bg-cyan-500/20 group-hover:bg-cyan-500/30"
        }`}
      />

      {/* Main Dock Container */}
      <div className="relative px-8 py-5 rounded-full backdrop-blur-xl bg-neutral-950/60 border border-white/10 flex items-center gap-7 shadow-2xl">
        {/* History Button */}
        <button className="flex flex-col items-center gap-1.5 text-white/40 hover:text-white transition cursor-pointer group/btn focus:outline-none">
          <RotateCcw className="w-6 h-6 group-hover/btn:-rotate-45 transition-transform duration-300" />
          <span className="text-[10px] uppercase font-medium tracking-widest">
            History
          </span>
        </button>

        {/* Center Microphone Button */}
        <button
          onClick={startListening}
          disabled={isListening || isThinking || isSpeaking}
          className={`w-20 h-20 rounded-full flex items-center justify-center border-4 border-neutral-950 transition-all duration-300 shadow-lg relative focus:outline-none
            ${
              isListening
                ? "bg-cyan-300 scale-110 shadow-[0_0_30px_rgba(34,211,238,0.6)] cursor-not-allowed"
                : isThinking
                  ? "bg-purple-500 animate-pulse cursor-not-allowed"
                  : isSpeaking
                    ? "bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] cursor-not-allowed"
                    : "bg-cyan-500 hover:scale-105 hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] cursor-pointer"
            }
          `}
        >
          <Mic
            className={`w-9 h-9 transition-colors duration-300 ${isListening || isSpeaking ? "text-cyan-950" : "text-neutral-950"}`}
          />

          {/* Subtle inner ring animation that triggers when Nova is talking */}
          {isSpeaking && (
            <div className="absolute inset-2 border-2 border-cyan-950/30 rounded-full animate-ping" />
          )}
        </button>

        {/* Memory Button */}
        <button className="flex flex-col items-center gap-1.5 text-white/40 hover:text-white transition cursor-pointer group/btn focus:outline-none">
          <Box className="w-6 h-6 group-hover/btn:scale-110 transition-transform duration-300" />
          <span className="text-[10px] uppercase font-medium tracking-widest">
            Memory
          </span>
        </button>
      </div>
    </div>
  )
}
