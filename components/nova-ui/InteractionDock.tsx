"use client"

import { Mic, RotateCcw, Box } from "lucide-react"
import { useNovaStore } from "@/store/useNovaStore"
import { useNovaBrain } from "@/hooks/useNovaBrain"
import { useEffect, useRef } from "react"

// ─── Waveform Visualizer ──────────────────────────────────────────────────────
// Reads live mic audio and draws bars on a canvas element.
// Only active when Nova is in LISTENING state.
function WaveformVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let audioContext: AudioContext

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })
        streamRef.current = stream
        audioContext = new AudioContext()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 64 // Small = fewer bars = cleaner look
        source.connect(analyser)
        analyserRef.current = analyser

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        const barCount = 12
        const barWidth = 3
        const gap = 2

        const draw = () => {
          animFrameRef.current = requestAnimationFrame(draw)
          analyser.getByteFrequencyData(dataArray)

          ctx.clearRect(0, 0, canvas.width, canvas.height)

          const totalWidth = barCount * (barWidth + gap) - gap
          const startX = (canvas.width - totalWidth) / 2

          for (let i = 0; i < barCount; i++) {
            // Sample evenly across the frequency data
            const dataIndex = Math.floor((i / barCount) * dataArray.length)
            const value = dataArray[dataIndex] / 255

            // Min height so bars are always visible even in silence
            const barHeight = Math.max(4, value * canvas.height * 0.85)
            const x = startX + i * (barWidth + gap)
            const y = (canvas.height - barHeight) / 2

            ctx.fillStyle = `rgba(34, 211, 238, ${0.5 + value * 0.5})`
            ctx.beginPath()
            ctx.roundRect(x, y, barWidth, barHeight, 2)
            ctx.fill()
          }
        }

        draw()
      } catch (err) {
        console.warn("Waveform: mic access failed", err)
      }
    }

    start()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={40}
      className="absolute inset-0 w-full h-full rounded-full"
    />
  )
}

// ─── Interaction Dock ─────────────────────────────────────────────────────────
export default function InteractionDock() {
  const { currentState, clearHistory } = useNovaStore()
  const { startListening } = useNovaBrain()

  const isListening = currentState === "LISTENING"
  const isThinking = currentState === "THINKING"
  const isSpeaking = currentState === "SPEAKING"
  const isActive = isListening || isThinking || isSpeaking

  return (
    <div className="relative group">
      {/* Ambient glow — color shifts per state */}
      <div
        className={`absolute inset-0 rounded-full backdrop-blur-3xl transition-all duration-700
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

      {/* Dock container */}
      <div className="relative px-8 py-5 rounded-full backdrop-blur-xl bg-neutral-950/60 border border-white/10 flex items-center gap-7 shadow-2xl">
        {/* History — clears conversation memory */}
        <button
          onClick={clearHistory}
          title="Clear conversation memory"
          className="flex flex-col items-center gap-1.5 text-white/40 hover:text-white transition cursor-pointer group/btn focus:outline-none"
        >
          <RotateCcw className="w-6 h-6 group-hover/btn:-rotate-45 transition-transform duration-300" />
          <span className="text-[10px] uppercase font-medium tracking-widest">
            History
          </span>
        </button>

        {/* Center mic button */}
        <button
          onClick={startListening}
          disabled={isActive}
          className={`w-20 h-20 rounded-full flex items-center justify-center border-4 border-neutral-950
            relative overflow-hidden transition-all duration-300 shadow-lg focus:outline-none
            ${
              isListening
                ? "bg-cyan-300 scale-110 shadow-[0_0_30px_rgba(34,211,238,0.6)] cursor-not-allowed"
                : isThinking
                  ? "bg-purple-500 animate-pulse cursor-not-allowed"
                  : isSpeaking
                    ? "bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] cursor-not-allowed"
                    : "bg-cyan-500 hover:scale-105 hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] cursor-pointer"
            }`}
        >
          {/* Live waveform — only mounted while listening */}
          {isListening && <WaveformVisualizer />}

          {/* Mic icon — hidden during listening (waveform takes over) */}
          {!isListening && (
            <Mic
              className={`w-9 h-9 relative z-10 transition-colors duration-300
              ${isSpeaking ? "text-cyan-950" : "text-neutral-950"}`}
            />
          )}

          {/* Speaking pulse ring */}
          {isSpeaking && (
            <div className="absolute inset-2 border-2 border-cyan-950/30 rounded-full animate-ping" />
          )}

          {/* Thinking spinner */}
          {isThinking && (
            <div className="absolute inset-2 border-2 border-t-purple-200 border-purple-700/40 rounded-full animate-spin" />
          )}
        </button>

        {/* Memory indicator */}
        <MemoryIndicator />
      </div>
    </div>
  )
}

// ─── Memory Indicator ─────────────────────────────────────────────────────────
// Shows how many messages are in Nova's memory.
function MemoryIndicator() {
  const { conversationHistory } = useNovaStore()
  const messageCount = conversationHistory.length
  const isFull = messageCount >= 36 // 90% of our 40 message cap

  return (
    <div className="flex flex-col items-center gap-1.5 text-white/40 group/btn">
      <div className="relative">
        <Box className="w-6 h-6" />
        {messageCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 text-[9px] font-bold rounded-full w-4 h-4
            flex items-center justify-center
            ${isFull ? "bg-red-500 text-white" : "bg-cyan-500 text-neutral-950"}`}
          >
            {Math.floor(messageCount / 2)}
          </span>
        )}
      </div>
      <span className="text-[10px] uppercase font-medium tracking-widest">
        Memory
      </span>
    </div>
  )
}
