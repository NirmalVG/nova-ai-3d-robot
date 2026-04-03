import { create } from "zustand"

// Define the core states our robot can be in
export type NovaState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING"

interface NovaStore {
  currentState: NovaState
  userTranscript: string
  novaResponse: string
  setCurrentState: (state: NovaState) => void
  setTranscripts: (user: string, nova: string) => void
}

export const useNovaStore = create<NovaStore>((set) => ({
  currentState: "IDLE",
  userTranscript: "",
  novaResponse: "",

  setCurrentState: (state) => set({ currentState: state }),

  setTranscripts: (user, nova) =>
    set({ userTranscript: user, novaResponse: nova }),
}))
