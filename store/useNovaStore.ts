import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  Emotion,
  VoiceSettings,
  EnvironmentPreset,
  MaterialColorPreset,
  UserFacts,
  ChatMessage,
} from "@/lib/types"
import {
  DEFAULT_VOICE_SETTINGS,
  DEFAULT_USER_FACTS,
} from "@/lib/types"

// ─── State Type ──────────────────────────────────────────────────────────────

export type NovaState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING"
export type Provider = "gemini" | "groq" | null

export interface PersonalityConfig {
  outfit: number
  color: number
  humor: number
  formality: number
  empathy: number
}

interface NovaStore {
  // ── Robot State ─────────────────────────────────────────────────────────
  currentState: NovaState
  currentProvider: Provider
  emotionalState: Emotion
  isLoaded: boolean

  // ── Transcripts ─────────────────────────────────────────────────────────
  userTranscript: string
  novaResponse: string

  // ── Personality & Appearance ────────────────────────────────────────────
  personality: PersonalityConfig
  materialColor: MaterialColorPreset
  robotScale: number // 0.5 – 2.0, default 1.5

  // ── Environment ─────────────────────────────────────────────────────────
  environment: EnvironmentPreset

  // ── Voice ───────────────────────────────────────────────────────────────
  voiceSettings: VoiceSettings

  // ── Conversation ────────────────────────────────────────────────────────
  conversationHistory: ChatMessage[]
  userFacts: UserFacts

  // ── UI Panels ───────────────────────────────────────────────────────────
  showSettings: boolean
  showChat: boolean
  showOnboarding: boolean

  // ── Actions ─────────────────────────────────────────────────────────────
  setCurrentState: (state: NovaState) => void
  setCurrentProvider: (provider: Provider) => void
  setEmotionalState: (emotion: Emotion) => void
  setIsLoaded: (loaded: boolean) => void

  setTranscripts: (user: string, nova: string) => void
  setPersonality: (config: Partial<PersonalityConfig>) => void
  setMaterialColor: (color: MaterialColorPreset) => void
  setRobotScale: (scale: number) => void
  setEnvironment: (env: EnvironmentPreset) => void
  setVoiceSettings: (settings: Partial<VoiceSettings>) => void

  addToHistory: (message: ChatMessage) => void
  clearHistory: () => void
  setUserFacts: (facts: Partial<UserFacts>) => void

  toggleSettings: () => void
  toggleChat: () => void
  setShowOnboarding: (show: boolean) => void
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useNovaStore = create<NovaStore>()(
  persist(
    (set) => ({
      // ── Initial State ──────────────────────────────────────────────────
      currentState: "IDLE",
      currentProvider: null,
      emotionalState: "neutral",
      isLoaded: false,

      userTranscript: "",
      novaResponse: "",

      personality: {
        outfit: 4,
        color: 50,
        humor: 85,
        formality: 10,
        empathy: 95,
      },
      materialColor: "chrome",
      robotScale: 1.5,

      environment: "city",
      voiceSettings: { ...DEFAULT_VOICE_SETTINGS },

      conversationHistory: [],
      userFacts: { ...DEFAULT_USER_FACTS },

      showSettings: false,
      showChat: false,
      showOnboarding: true,

      // ── Actions ────────────────────────────────────────────────────────
      setCurrentState: (state) => set({ currentState: state }),
      setCurrentProvider: (provider) => set({ currentProvider: provider }),
      setEmotionalState: (emotion) => set({ emotionalState: emotion }),
      setIsLoaded: (loaded) => set({ isLoaded: loaded }),

      setTranscripts: (user, nova) =>
        set({ userTranscript: user, novaResponse: nova }),

      setPersonality: (config) =>
        set((state) => ({
          personality: { ...state.personality, ...config },
        })),

      setMaterialColor: (color) => set({ materialColor: color }),
      setRobotScale: (scale) => set({ robotScale: Math.max(0.5, Math.min(2.0, scale)) }),
      setEnvironment: (env) => set({ environment: env }),

      setVoiceSettings: (settings) =>
        set((state) => ({
          voiceSettings: { ...state.voiceSettings, ...settings },
        })),

      // Keep last 40 messages (20 exchanges) to avoid token bloat.
      addToHistory: (message) =>
        set((state) => ({
          conversationHistory: [
            ...state.conversationHistory.slice(-38),
            { ...message, timestamp: message.timestamp ?? Date.now() },
          ],
        })),

      clearHistory: () => set({ conversationHistory: [], userFacts: { ...DEFAULT_USER_FACTS } }),

      setUserFacts: (facts) =>
        set((state) => ({
          userFacts: { ...state.userFacts, ...facts },
        })),

      toggleSettings: () =>
        set((state) => ({ showSettings: !state.showSettings, showChat: false })),

      toggleChat: () =>
        set((state) => ({ showChat: !state.showChat, showSettings: false })),

      setShowOnboarding: (show) => set({ showOnboarding: show }),
    }),
    {
      name: "nova-memory",
      partialize: (state) => ({
        personality: state.personality,
        conversationHistory: state.conversationHistory,
        userFacts: state.userFacts,
        environment: state.environment,
        voiceSettings: state.voiceSettings,
        materialColor: state.materialColor,
        robotScale: state.robotScale,
        showOnboarding: state.showOnboarding,
      }),
    },
  ),
)
