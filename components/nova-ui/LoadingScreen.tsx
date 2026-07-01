"use client"

import { useEffect, useRef, useState } from "react"
import { useNovaStore } from "@/store/useNovaStore"

const STATUS_MESSAGES = [
  "Initializing neural core...",
  "Loading skeletal mesh...",
  "Calibrating sensors...",
  "Establishing neural link...",
] as const

const STATUS_CYCLE_INTERVAL = 2400
const PROGRESS_INTERVAL = 60
const PROGRESS_INCREMENT_MIN = 0.3
const PROGRESS_INCREMENT_MAX = 1.2
const FADE_OUT_DURATION = 800

const PARTICLES = Array.from({ length: 20 }, (_, index) => {
  const width = 2 + ((index * 7) % 4) * 0.75
  const left = (index * 37) % 100
  const top = (index * 53) % 100
  const opacity = 0.15 + ((index * 11) % 18) / 100
  const duration = 6 + ((index * 5) % 8)
  const delay = ((index * 13) % 50) / 10

  return {
    delay,
    duration,
    left,
    opacity,
    top,
    width,
  }
})

type LoadingPhase = "loading" | "completing" | "done"

export default function LoadingScreen() {
  const isLoaded = useNovaStore((state) => state.isLoaded)

  const [progress, setProgress] = useState(0)
  const [statusIndex, setStatusIndex] = useState(0)
  const [phase, setPhase] = useState<LoadingPhase>("loading")

  const progressRef = useRef(0)

  useEffect(() => {
    useNovaStore.getState().setIsLoaded(false)
  }, [])

  useEffect(() => {
    if (phase !== "loading") return

    const interval = window.setInterval(() => {
      setStatusIndex((previousIndex) => (previousIndex + 1) % STATUS_MESSAGES.length)
    }, STATUS_CYCLE_INTERVAL)

    return () => window.clearInterval(interval)
  }, [phase])

  useEffect(() => {
    if (phase !== "loading") return

    const interval = window.setInterval(() => {
      const increment =
        PROGRESS_INCREMENT_MIN +
        Math.random() * (PROGRESS_INCREMENT_MAX - PROGRESS_INCREMENT_MIN)
      const nextProgress = Math.min(progressRef.current + increment, 90)

      progressRef.current = nextProgress
      setProgress(nextProgress)
    }, PROGRESS_INTERVAL)

    return () => window.clearInterval(interval)
  }, [phase])

  useEffect(() => {
    if (!isLoaded || phase !== "loading") return

    progressRef.current = 100

    const timer = window.setTimeout(() => {
      setProgress(100)
      setStatusIndex(STATUS_MESSAGES.length - 1)
      setPhase("completing")
    }, 0)

    return () => window.clearTimeout(timer)
  }, [isLoaded, phase])

  useEffect(() => {
    if (phase !== "completing") return

    const timer = window.setTimeout(() => {
      setPhase("done")
    }, FADE_OUT_DURATION)

    return () => window.clearTimeout(timer)
  }, [phase])

  if (phase === "done") return null

  const isFadingOut = phase === "completing"

  return (
    <div
      aria-label="Loading screen"
      role="progressbar"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(progress)}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-neutral-950 select-none"
      style={{
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? "scale(1.04)" : "scale(1)",
        transition: `opacity ${FADE_OUT_DURATION}ms ease-out, transform ${FADE_OUT_DURATION}ms ease-out`,
      }}
    >
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            animation: "gridScroll 20s linear infinite",
            backgroundImage: `
              linear-gradient(rgba(6,182,212,0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6,182,212,0.4) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {PARTICLES.map((particle, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-cyan-500"
            style={{
              animation: `particleFloat ${particle.duration}s ease-in-out ${particle.delay}s infinite alternate`,
              height: `${particle.width}px`,
              left: `${particle.left}%`,
              opacity: particle.opacity,
              top: `${particle.top}%`,
              width: `${particle.width}px`,
            }}
          />
        ))}

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.15) 2px, rgba(6,182,212,0.15) 4px)",
          }}
        />

        <div
          className="absolute left-0 h-[2px] w-full opacity-20"
          style={{
            animation: "scanBeam 4s ease-in-out infinite",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.8) 50%, transparent 100%)",
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 30%, rgba(10,10,10,0.8) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 px-6">
        <div className="flex flex-col items-center gap-3">
          <h1
            className="text-5xl font-bold tracking-[0.3em] text-white sm:text-6xl md:text-7xl"
            style={{
              textShadow: "0 0 40px rgba(6,182,212,0.3), 0 0 80px rgba(6,182,212,0.1)",
            }}
          >
            NOVA
            <span
              className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-cyan-400 align-super sm:h-3 sm:w-3"
              style={{
                animation: "dotPulse 2s ease-in-out infinite",
                boxShadow: "0 0 12px rgba(6,182,212,0.8), 0 0 24px rgba(6,182,212,0.4)",
              }}
            />
          </h1>
          <p
            className="text-xs font-mono uppercase tracking-[0.4em] text-cyan-500/60 sm:text-sm"
            style={{ animation: "fadeInUp 1s ease-out 0.3s both" }}
          >
            AI Companion System
          </p>
        </div>

        <div className="w-full space-y-4" style={{ animation: "fadeInUp 1s ease-out 0.6s both" }}>
          <div className="flex h-6 items-center justify-center">
            <p
              key={statusIndex}
              className="text-center text-xs font-mono tracking-widest text-cyan-400/80 sm:text-sm"
              style={{
                animation: "statusFade 2.4s ease-in-out",
              }}
            >
              {STATUS_MESSAGES[statusIndex]}
            </p>
          </div>

          <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-cyan-500/30 blur-sm transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-200 ease-out"
              style={{
                background:
                  "linear-gradient(90deg, rgba(6,182,212,0.6) 0%, #06b6d4 60%, #22d3ee 100%)",
                boxShadow: "0 0 8px rgba(6,182,212,0.6)",
                width: `${progress}%`,
              }}
            />
            <div
              className="absolute inset-y-0 left-0 overflow-hidden rounded-full transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div
                className="absolute inset-0"
                style={{
                  animation: "shimmer 1.5s ease-in-out infinite",
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/30 sm:text-xs">
              System Boot
            </span>
            <span
              className="text-xs font-mono tracking-wider tabular-nums sm:text-sm"
              style={{
                color: progress >= 100 ? "#22d3ee" : "rgba(6,182,212,0.7)",
                textShadow: progress >= 100 ? "0 0 10px rgba(6,182,212,0.5)" : "none",
              }}
            >
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        <div
          className="flex items-center gap-2 opacity-30"
          style={{ animation: "fadeInUp 1s ease-out 0.9s both" }}
        >
          <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-cyan-500/50" />
          <div
            className="h-1.5 w-1.5 rounded-full bg-cyan-500/60"
            style={{ animation: "dotPulse 3s ease-in-out infinite" }}
          />
          <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-cyan-500/50" />
        </div>
      </div>
    </div>
  )
}
