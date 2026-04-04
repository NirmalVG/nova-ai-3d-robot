import { create } from "zustand"
import { persist } from "zustand/middleware"

export type NovaState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING"

// Standard Anthropic message shape
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
  userTranscript: string
  novaResponse: string
  personality: PersonalityConfig
  conversationHistory: ChatMessage[]

  setCurrentState: (state: NovaState) => void
  setTranscripts: (user: string, nova: string) => void
  setPersonality: (config: Partial<PersonalityConfig>) => void
  addToHistory: (message: ChatMessage) => void
  clearHistory: () => void
}

export const useNovaStore = create<NovaStore>()(
  // `persist` saves to localStorage automatically — this is Nova's memory across page reloads
  persist(
    (set) => ({
      currentState: "IDLE",
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

      setCurrentState: (state) => set({ currentState: state }),

      setTranscripts: (user, nova) =>
        set({ userTranscript: user, novaResponse: nova }),

      setPersonality: (config) =>
        set((state) => ({
          personality: { ...state.personality, ...config },
        })),

      // Keep last 20 exchanges (40 messages) to avoid token bloat
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
      // Only persist what makes sense across sessions
      partialize: (state) => ({
        personality: state.personality,
        conversationHistory: state.conversationHistory,
      }),
    },
  ),
)
