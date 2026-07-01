"use client"

import {
  Mic,
  RotateCcw,
  Box,
  MessageSquare,
  Camera,
  Square,
  Keyboard,
} from "lucide-react"
import { useNovaStore } from "@/store/useNovaStore"
import { useNovaBrain } from "@/hooks/useNovaBrain"
import { useEffect, useRef, useCallback } from "react"

// ─── Waveform Visualizer ──────────────────────────────────────────────────────

function WaveformVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let audioContext: AudioContext

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        audioContext = new AudioContext()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 64
        source.connect(analyser)

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
            const dataIndex = Math.floor((i / barCount) * dataArray.length)
            const value = dataArray[dataIndex] / 255
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

// ─── Screenshot ───────────────────────────────────────────────────────────────

function captureScreenshot() {
  const canvas = document.querySelector("canvas")
  if (!canvas) return

  try {
    const link = document.createElement("a")
    link.download = `nova-screenshot-${Date.now()}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  } catch (err) {
    console.error("Screenshot failed:", err)
  }
}

// ─── Dock Button ──────────────────────────────────────────────────────────────

interface DockButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  badge?: number | null
  className?: string
}

function DockButton({ icon, label, onClick, active, badge, className = "" }: DockButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 sm:gap-1.5 transition cursor-pointer group/btn focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg p-1
        ${active ? "text-cyan-400" : "text-white/40 hover:text-white"}
        ${className}`}
      aria-label={label}
    >
      <div className="relative">
        {icon}
        {badge !== null && badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1.5 text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center bg-cyan-500 text-neutral-950">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[8px] sm:text-[10px] uppercase font-medium tracking-widest">
        {label}
      </span>
    </button>
  )
}

// ─── Interaction Dock ─────────────────────────────────────────────────────────

export default function InteractionDock() {
  const currentState = useNovaStore((s) => s.currentState)
  const clearHistory = useNovaStore((s) => s.clearHistory)
  const toggleChat = useNovaStore((s) => s.toggleChat)
  const showChat = useNovaStore((s) => s.showChat)
  const conversationHistory = useNovaStore((s) => s.conversationHistory)
  const { startListening, stopSpeaking } = useNovaBrain()

  const isListening = currentState === "LISTENING"
  const isThinking = currentState === "THINKING"
  const isSpeaking = currentState === "SPEAKING"
  const isActive = isListening || isThinking || isSpeaking

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space to talk (only when not in an input)
      if (
        e.code === "Space" &&
        !isActive &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        startListening()
      }

      // Escape to stop speaking
      if (e.code === "Escape" && isSpeaking) {
        e.preventDefault()
        stopSpeaking()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isActive, isSpeaking, startListening, stopSpeaking])

  const messageCount = Math.floor(conversationHistory.length / 2)

  return (
    <div className="relative group">
      {/* Ambient glow */}
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
      <div className="relative px-3 sm:px-8 py-3 sm:py-5 rounded-full backdrop-blur-xl bg-neutral-950/60 border border-white/10 flex items-center gap-3 sm:gap-7 shadow-2xl">
        {/* History clear */}
        <DockButton
          icon={<RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 group-hover/btn:-rotate-45 transition-transform duration-300" />}
          label="History"
          onClick={clearHistory}
        />

        {/* Chat toggle */}
        <DockButton
          icon={<MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />}
          label="Chat"
          onClick={toggleChat}
          active={showChat}
          badge={messageCount || null}
        />

        {/* Center mic / stop button */}
        {isSpeaking ? (
          <button
            onClick={stopSpeaking}
            className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-4 border-neutral-950 relative overflow-hidden transition-all duration-300 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 bg-red-500 hover:bg-red-400 cursor-pointer animate-pulse"
            aria-label="Stop Nova from speaking"
          >
            <Square className="w-6 h-6 sm:w-8 sm:h-8 text-white fill-white" />
          </button>
        ) : (
          <button
            onClick={startListening}
            disabled={isActive}
            className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-4 border-neutral-950
              relative overflow-hidden transition-all duration-300 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
              ${
                isListening
                  ? "bg-cyan-300 scale-110 shadow-[0_0_30px_rgba(34,211,238,0.6)] cursor-not-allowed"
                  : isThinking
                    ? "bg-purple-500 animate-pulse cursor-not-allowed"
                    : "bg-cyan-500 hover:scale-105 hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] cursor-pointer"
              }`}
            aria-label={isListening ? "Listening..." : isThinking ? "Processing..." : "Press to speak (or Space key)"}
          >
            {isListening && <WaveformVisualizer />}

            {!isListening && (
              <Mic
                className={`w-7 h-7 sm:w-9 sm:h-9 relative z-10 transition-colors duration-300 text-neutral-950`}
              />
            )}

            {isThinking && (
              <div className="absolute inset-2 border-2 border-t-purple-200 border-purple-700/40 rounded-full animate-spin" />
            )}
          </button>
        )}

        {/* Screenshot */}
        <DockButton
          icon={<Camera className="w-5 h-5 sm:w-6 sm:h-6" />}
          label="Capture"
          onClick={captureScreenshot}
        />

        {/* Memory indicator */}
        <DockButton
          icon={<Box className="w-5 h-5 sm:w-6 sm:h-6" />}
          label="Memory"
          onClick={() => {}}
          badge={messageCount || null}
        />
      </div>
    </div>
  )
}
