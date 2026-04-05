import { create } from "zustand"
import { persist } from "zustand/middleware"

export type NovaState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING"
export type Provider = "gemini" | "groq" | null

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface PersonalityConfig {
  outfit: number
  color: number
  humor: number
  formality: number
  empathy: number
}

interface NovaStore {
  currentState: NovaState
  currentProvider: Provider
  userTranscript: string
  novaResponse: string
  personality: PersonalityConfig
  conversationHistory: ChatMessage[]

  setCurrentState: (state: NovaState) => void
  setCurrentProvider: (provider: Provider) => void
  setTranscripts: (user: string, nova: string) => void
  setPersonality: (config: Partial<PersonalityConfig>) => void
  addToHistory: (message: ChatMessage) => void
  clearHistory: () => void
}

export const useNovaStore = create<NovaStore>()(
  persist(
    (set) => ({
      // ─── Initial State ──────────────────────────────────────────────────
      currentState: "IDLE",
      currentProvider: null,
      userTranscript: "",
      novaResponse: "",
      conversationHistory: [],
      personality: {
        outfit: 4,
        color: 50,
        humor: 85,
        formality: 10,
        empathy: 95,
      },

      // ─── Actions ────────────────────────────────────────────────────────
      setCurrentState: (state) => set({ currentState: state }),

      setCurrentProvider: (provider) => set({ currentProvider: provider }),

      setTranscripts: (user, nova) =>
        set({ userTranscript: user, novaResponse: nova }),

      setPersonality: (config) =>
        set((state) => ({
          personality: { ...state.personality, ...config },
        })),

      // Keep last 40 messages (20 exchanges) to avoid token bloat.
      // slice(-38) + the incoming message = max 39, safely under 40.
      addToHistory: (message) =>
        set((state) => ({
          conversationHistory: [
            ...state.conversationHistory.slice(-38),
            message,
          ],
        })),

      clearHistory: () => set({ conversationHistory: [] }),
    }),
    {
      name: "nova-memory", // localStorage key
      // Only persist what makes sense across sessions.
      // currentState, currentProvider, transcripts are session-only.
      partialize: (state) => ({
        personality: state.personality,
        conversationHistory: state.conversationHistory,
      }),
    },
  ),
)
