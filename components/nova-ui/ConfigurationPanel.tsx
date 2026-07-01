"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  X,
  ChevronDown,
  Brain,
  Scale,
  Heart,
  Palette,
  Mic,
  Trees,
  Database,
  Zap,
  Volume2,
  Play,
  Trash2,
  User,
  MessageSquare,
  Hash,
  Maximize,
} from "lucide-react"
import SliderControl from "./SliderControl"
import { useNovaStore } from "@/store/useNovaStore"
import {
  EMOTION_LABELS,
  EMOTION_ICONS,
  MATERIAL_COLOR_OPTIONS,
  ENVIRONMENT_OPTIONS,
} from "@/lib/types"
import type { MaterialColorPreset, EnvironmentPreset } from "@/lib/types"

// ─── Collapsible Section ─────────────────────────────────────────────────────

interface SectionProps {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Toggle ${title} section`}
        className="flex w-full items-center justify-between px-1 py-4 cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-sm font-semibold uppercase tracking-widest text-white/80 group-hover:text-white transition-colors">
            {title}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/40 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-5 px-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export default function ConfigurationPanel() {
  const {
    showSettings,
    toggleSettings,
    personality,
    setPersonality,
    emotionalState,
    materialColor,
    setMaterialColor,
    robotScale,
    setRobotScale,
    voiceSettings,
    setVoiceSettings,
    environment,
    setEnvironment,
    userFacts,
    conversationHistory,
    clearHistory,
  } = useNovaStore()

  // ── Voice list from Web Speech API ──────────────────────────────────────

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (typeof window === "undefined") return

    const loadVoices = () => {
      const available = speechSynthesis.getVoices()
      if (available.length > 0) setVoices(available)
    }

    loadVoices()
    speechSynthesis.addEventListener("voiceschanged", loadVoices)
    return () => speechSynthesis.removeEventListener("voiceschanged", loadVoices)
  }, [])

  // ── Test Voice ──────────────────────────────────────────────────────────

  const testVoice = useCallback(() => {
    if (typeof window === "undefined") return
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(
      "Hello! I am Nova, your AI companion. How can I help you today?"
    )
    utterance.pitch = voiceSettings.pitch
    utterance.rate = voiceSettings.rate
    utterance.volume = voiceSettings.volume

    if (voiceSettings.voiceURI) {
      const match = voices.find((v) => v.voiceURI === voiceSettings.voiceURI)
      if (match) utterance.voice = match
    }

    speechSynthesis.speak(utterance)
  }, [voiceSettings, voices])

  // ── Clear Memory with confirmation ──────────────────────────────────────

  const [confirmClear, setConfirmClear] = useState(false)
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClearMemory = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      clearTimerRef.current = setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearHistory()
    setConfirmClear(false)
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
  }

  // ── Backdrop click to close ─────────────────────────────────────────────

  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showSettings) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleSettings()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [showSettings, toggleSettings])

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop overlay — click to close */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          showSettings
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleSettings}
        aria-hidden="true"
      />

      {/* ─── Desktop Panel (slide from right) ─────────────────────────── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Nova Configuration Settings"
        aria-modal="true"
        className={`
          fixed z-50 transition-transform duration-500 ease-out
          inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl
          sm:inset-x-auto sm:bottom-auto sm:top-[10vh] sm:right-6
          sm:w-[380px] sm:max-h-[80vh] sm:rounded-2xl
          backdrop-blur-xl bg-black/60 border border-white/10
          shadow-2xl shadow-black/60 overflow-y-auto overscroll-contain
          ${
            showSettings
              ? "translate-y-0 sm:translate-x-0"
              : "translate-y-full sm:translate-y-0 sm:translate-x-[420px]"
          }
        `}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-5 pb-4 bg-black/40 backdrop-blur-md border-b border-white/5">
          <div>
            <h2 className="text-lg font-semibold text-white tracking-wide">
              Configuration
            </h2>
            <p className="text-[10px] uppercase font-medium text-white/30 tracking-widest mt-0.5">
              System Parameters
            </p>
          </div>
          <button
            onClick={toggleSettings}
            aria-label="Close settings"
            className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Sections */}
        <div className="px-6 py-2">
          {/* ═══════════════════════ 1. AI PERSONALITY ═══════════════════════ */}
          <CollapsibleSection
            title="AI Personality"
            icon={<Brain className="w-4 h-4 text-cyan-500" />}
            defaultOpen
          >
            <SliderControl
              label="Humor"
              icon={Brain}
              value={personality.humor}
              onChange={(v) => setPersonality({ humor: v })}
              valueText={`${personality.humor}%`}
              displayValueSuffix="%"
            />
            <SliderControl
              label="Formality"
              icon={Scale}
              value={personality.formality}
              onChange={(v) => setPersonality({ formality: v })}
              valueText={`${personality.formality}%`}
              displayValueSuffix="%"
            />
            <SliderControl
              label="Empathy"
              icon={Heart}
              value={personality.empathy}
              onChange={(v) => setPersonality({ empathy: v })}
              valueText={`${personality.empathy}%`}
              displayValueSuffix="%"
            />

            {/* Current emotional state */}
            <div className="flex items-center justify-between px-2 py-3 mt-1 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-xs uppercase tracking-widest text-white/40 font-medium">
                Emotional State
              </span>
              <span className="flex items-center gap-2 text-sm font-mono text-cyan-300">
                <span className="text-base">{EMOTION_ICONS[emotionalState]}</span>
                {EMOTION_LABELS[emotionalState]}
              </span>
            </div>
          </CollapsibleSection>

          {/* ═══════════════════════ 2. APPEARANCE ═══════════════════════════ */}
          <CollapsibleSection
            title="Appearance"
            icon={<Palette className="w-4 h-4 text-cyan-500" />}
          >
            {/* Material Color Grid */}
            <div>
              <span className="text-xs uppercase tracking-widest text-white/40 font-medium mb-3 block">
                Material Color
              </span>
              <div className="grid grid-cols-3 gap-2">
                {MATERIAL_COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setMaterialColor(opt.id as MaterialColorPreset)}
                    aria-label={`Select ${opt.label} color`}
                    className={`
                      flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer
                      ${
                        materialColor === opt.id
                          ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                          : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                      }
                    `}
                  >
                    <div
                      className="w-7 h-7 rounded-full border border-white/10 shadow-inner"
                      style={{ backgroundColor: opt.hex }}
                    />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/60">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Robot Size Slider */}
            <SliderControl
              label="Robot Size"
              icon={Maximize}
              min={0.8}
              max={2.0}
              step={0.1}
              value={robotScale}
              onChange={setRobotScale}
              valueText={`${robotScale.toFixed(1)}x`}
              isValueCustomText
            />
          </CollapsibleSection>

          {/* ═══════════════════════ 3. VOICE SETTINGS ═══════════════════════ */}
          <CollapsibleSection
            title="Voice Settings"
            icon={<Mic className="w-4 h-4 text-cyan-500" />}
          >
            {/* Voice Selector */}
            <div>
              <label
                htmlFor="voice-select"
                className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2 block"
              >
                Voice
              </label>
              <select
                id="voice-select"
                aria-label="Select voice"
                value={voiceSettings.voiceURI ?? ""}
                onChange={(e) =>
                  setVoiceSettings({
                    voiceURI: e.target.value || null,
                  })
                }
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 font-mono appearance-none cursor-pointer focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="" className="bg-neutral-900">
                  Auto-select
                </option>
                {voices.map((v) => (
                  <option
                    key={v.voiceURI}
                    value={v.voiceURI}
                    className="bg-neutral-900"
                  >
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Pitch */}
            <SliderControl
              label="Pitch"
              icon={Volume2}
              min={0.5}
              max={2.0}
              step={0.1}
              value={voiceSettings.pitch}
              onChange={(v) => setVoiceSettings({ pitch: v })}
              valueText={voiceSettings.pitch.toFixed(1)}
              isValueCustomText
            />

            {/* Rate / Speed */}
            <SliderControl
              label="Speed"
              icon={Zap}
              min={0.5}
              max={2.0}
              step={0.1}
              value={voiceSettings.rate}
              onChange={(v) => setVoiceSettings({ rate: v })}
              valueText={`${voiceSettings.rate.toFixed(1)}x`}
              isValueCustomText
            />

            {/* Test Voice Button */}
            <button
              onClick={testVoice}
              aria-label="Test voice with sample sentence"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-medium tracking-wide hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4" />
              Test Voice
            </button>
          </CollapsibleSection>

          {/* ═══════════════════════ 4. ENVIRONMENT ══════════════════════════ */}
          <CollapsibleSection
            title="Environment"
            icon={<Trees className="w-4 h-4 text-cyan-500" />}
          >
            <div className="grid grid-cols-2 gap-2">
              {ENVIRONMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setEnvironment(opt.id as EnvironmentPreset)}
                  aria-label={`Select ${opt.label} environment`}
                  className={`
                    flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer
                    ${
                      environment === opt.id
                        ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_16px_rgba(6,182,212,0.15)]"
                        : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                    }
                  `}
                >
                  <span className="text-lg leading-none">{opt.icon}</span>
                  <span className="text-xs font-semibold text-white/80 tracking-wide">
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-white/30 leading-tight">
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* ═══════════════════════ 5. MEMORY ═══════════════════════════════ */}
          <CollapsibleSection
            title="Memory"
            icon={<Database className="w-4 h-4 text-cyan-500" />}
          >
            {/* User Facts Summary */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <User className="w-3.5 h-3.5 text-cyan-500/70" />
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-white/30">
                      Name
                    </p>
                    <p className="text-xs font-mono text-white/70">
                      {userFacts.name ?? "Unknown"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <Heart className="w-3.5 h-3.5 text-cyan-500/70" />
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-white/30">
                      Likes
                    </p>
                    <p className="text-xs font-mono text-white/70">
                      {userFacts.likes.length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <Hash className="w-3.5 h-3.5 text-cyan-500/70" />
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-white/30">
                      Topics
                    </p>
                    <p className="text-xs font-mono text-white/70">
                      {userFacts.topics.length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-500/70" />
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-white/30">
                      Conversations
                    </p>
                    <p className="text-xs font-mono text-white/70">
                      {userFacts.totalConversations}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Neural State */}
            <div className="flex items-center justify-between px-4 py-3 bg-cyan-950/20 border border-cyan-800/30 rounded-xl">
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-cyan-500" />
                <span className="text-xs font-medium tracking-wide text-white/70">
                  Neural State
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest bg-cyan-900/60 px-2.5 py-1 rounded-full">
                STABLE
              </span>
            </div>

            {/* Messages count */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-xs text-white/40 tracking-wide">
                Stored Messages
              </span>
              <span className="text-xs font-mono text-white/60">
                {conversationHistory.length}
              </span>
            </div>

            {/* Clear Memory */}
            <button
              onClick={handleClearMemory}
              aria-label={confirmClear ? "Confirm clear memory" : "Clear memory"}
              className={`
                flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border text-sm font-medium tracking-wide transition-all cursor-pointer
                ${
                  confirmClear
                    ? "border-red-500/50 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                    : "border-white/10 bg-white/[0.03] text-white/40 hover:text-white/70 hover:border-white/20"
                }
              `}
            >
              <Trash2 className="w-4 h-4" />
              {confirmClear ? "Confirm Clear — Are you sure?" : "Clear Memory"}
            </button>
          </CollapsibleSection>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5">
          <p className="text-[9px] text-center uppercase tracking-widest text-white/20 font-mono">
            Project Nova v0.1 • System Config
          </p>
        </div>
      </div>
    </>
  )
}
