"use client"

import { useState, useCallback, useEffect } from "react"
import { useNovaStore } from "@/store/useNovaStore"
import { Mic, MessageCircle, Settings, ChevronRight, X } from "lucide-react"

// ─── Step Data ────────────────────────────────────────────────────────────────

interface OnboardingStep {
  icon: typeof Mic
  title: string
  description: string
  hint: string
}

const STEPS: OnboardingStep[] = [
  {
    icon: MessageCircle,
    title: "Say 'Hello Nova'",
    description:
      "Nova responds to your voice in real time. Just speak naturally and she'll listen, understand, and reply with context-aware conversations.",
    hint: "Voice interaction powered by AI",
  },
  {
    icon: Mic,
    title: "Click the mic to talk",
    description:
      "Tap the microphone button on the dock below to start a conversation. Nova will listen as you speak, then respond with thoughtful answers.",
    hint: "Located in the interaction dock",
  },
  {
    icon: Settings,
    title: "Customize your companion",
    description:
      "Adjust Nova's personality, voice, appearance, and environment to make her truly yours. Access settings from the gear icon anytime.",
    hint: "Make Nova uniquely yours",
  },
]

const TRANSITION_MS = 400

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingOverlay() {
  const showOnboarding = useNovaStore((s) => s.showOnboarding)
  const setShowOnboarding = useNovaStore((s) => s.setShowOnboarding)

  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)

  // Card entrance animation
  useEffect(() => {
    if (showOnboarding) {
      const t = setTimeout(() => setCardVisible(true), 50)
      return () => clearTimeout(t)
    }
    setCardVisible(false)
  }, [showOnboarding])

  // ── Dismiss overlay ───────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (isDismissing) return
    setIsDismissing(true)
    setTimeout(() => {
      setShowOnboarding(false)
      setIsDismissing(false)
      setCurrentStep(0)
    }, TRANSITION_MS)
  }, [setShowOnboarding, isDismissing])

  // ── Navigate steps ─────────────────────────────────────────────────────────
  const nextStep = useCallback(() => {
    if (isAnimating) return
    if (currentStep >= STEPS.length - 1) {
      dismiss()
      return
    }
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1)
      setIsAnimating(false)
    }, 200)
  }, [currentStep, isAnimating, dismiss])

  const prevStep = useCallback(() => {
    if (isAnimating || currentStep === 0) return
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentStep((prev) => prev - 1)
      setIsAnimating(false)
    }, 200)
  }, [currentStep, isAnimating])

  if (!showOnboarding) return null

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1
  const StepIcon = step.icon

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding overlay"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6"
      style={{
        transition: `opacity ${TRANSITION_MS}ms ease-out`,
        opacity: isDismissing ? 0 : 1,
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className="relative w-full max-w-md"
        style={{
          transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.16,1,0.3,1), opacity ${TRANSITION_MS}ms ease-out`,
          transform: cardVisible && !isDismissing ? "scale(1) translateY(0)" : "scale(0.92) translateY(20px)",
          opacity: cardVisible && !isDismissing ? 1 : 0,
        }}
      >
        <div className="relative backdrop-blur-xl bg-black/50 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(6,182,212,0.5) 30%, rgba(6,182,212,0.5) 70%, transparent)",
            }}
          />

          {/* Skip button */}
          <button
            onClick={dismiss}
            aria-label="Skip onboarding"
            className="absolute top-4 right-4 z-10 p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all duration-200 cursor-pointer"
            type="button"
          >
            <X size={16} />
          </button>

          {/* Card content */}
          <div className="px-6 sm:px-8 pt-10 pb-6 sm:pt-12 sm:pb-8">
            <div
              key={currentStep}
              style={{
                transition: "opacity 200ms ease-out, transform 200ms ease-out",
                opacity: isAnimating ? 0 : 1,
                transform: isAnimating ? "translateX(-10px)" : "translateX(0)",
              }}
            >
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-2xl opacity-30 blur-xl"
                    style={{ background: "linear-gradient(135deg, #06b6d4, #22d3ee)" }}
                  />
                  <div
                    className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border border-cyan-500/20"
                    style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))" }}
                  >
                    <StepIcon className="w-7 h-7 sm:w-9 sm:h-9 text-cyan-400" />
                  </div>
                </div>
              </div>

              {/* Text */}
              <div className="text-center space-y-3 mb-8">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-wide text-white">
                  {step.title}
                </h2>
                <p className="text-sm sm:text-base text-white/50 leading-relaxed max-w-sm mx-auto">
                  {step.description}
                </p>
                <p className="text-[10px] sm:text-xs font-mono text-cyan-500/50 tracking-[0.2em] uppercase">
                  {step.hint}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              {/* Back button */}
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                aria-label="Previous step"
                type="button"
                className="px-4 py-2.5 text-xs sm:text-sm font-mono tracking-wider text-white/40 hover:text-white/70 transition-colors duration-200 rounded-xl disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              >
                Back
              </button>

              {/* Step indicators */}
              <div className="flex items-center gap-2" aria-label={`Step ${currentStep + 1} of ${STEPS.length}`}>
                {STEPS.map((_, index) => (
                  <div
                    key={index}
                    className="transition-all duration-300 rounded-full"
                    style={{
                      width: index === currentStep ? "24px" : "6px",
                      height: "6px",
                      background:
                        index === currentStep
                          ? "linear-gradient(90deg, #06b6d4, #22d3ee)"
                          : index < currentStep
                            ? "rgba(6,182,212,0.4)"
                            : "rgba(255,255,255,0.15)",
                      boxShadow:
                        index === currentStep
                          ? "0 0 8px rgba(6,182,212,0.4)"
                          : "none",
                    }}
                  />
                ))}
              </div>

              {/* Next / Get Started */}
              <button
                onClick={nextStep}
                aria-label={isLastStep ? "Get started" : "Next step"}
                type="button"
                className="group flex items-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-mono tracking-wider rounded-xl border transition-all duration-300 cursor-pointer"
                style={{
                  background: isLastStep
                    ? "linear-gradient(135deg, rgba(6,182,212,0.25) 0%, rgba(6,182,212,0.1) 100%)"
                    : "rgba(255,255,255,0.03)",
                  borderColor: isLastStep
                    ? "rgba(6,182,212,0.3)"
                    : "rgba(255,255,255,0.08)",
                  color: isLastStep ? "#22d3ee" : "rgba(255,255,255,0.6)",
                }}
              >
                {isLastStep ? "Get Started" : "Next"}
                <ChevronRight
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </div>

          {/* Bottom subtle accent */}
          <div
            className="h-[1px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)",
            }}
          />
        </div>
      </div>
    </div>
  )
}
