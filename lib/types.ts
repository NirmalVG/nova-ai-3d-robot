// ─── Emotion System ──────────────────────────────────────────────────────────

export type Emotion =
  | "neutral"
  | "happy"
  | "curious"
  | "excited"
  | "sad"
  | "bored"
  | "surprised"
  | "thoughtful"

export const EMOTION_LABELS: Record<Emotion, string> = {
  neutral: "Neutral",
  happy: "Happy",
  curious: "Curious",
  excited: "Excited",
  sad: "Sad",
  bored: "Bored",
  surprised: "Surprised",
  thoughtful: "Thoughtful",
}

export const EMOTION_ICONS: Record<Emotion, string> = {
  neutral: "😐",
  happy: "😊",
  curious: "🤔",
  excited: "🤩",
  sad: "😔",
  bored: "😴",
  surprised: "😲",
  thoughtful: "💭",
}

// ─── Voice Settings ──────────────────────────────────────────────────────────

export interface VoiceSettings {
  voiceURI: string | null // null = auto-select
  pitch: number // 0.5 – 2.0
  rate: number // 0.5 – 2.0
  volume: number // 0 – 1
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceURI: null,
  pitch: 1.1,
  rate: 1.05,
  volume: 1.0,
}

// ─── Environment Presets ─────────────────────────────────────────────────────

export type EnvironmentPreset =
  | "city"
  | "sunset"
  | "dawn"
  | "night"
  | "warehouse"
  | "forest"
  | "apartment"
  | "studio"
  | "park"
  | "lobby"

export interface EnvironmentOption {
  id: EnvironmentPreset
  label: string
  description: string
  icon: string
}

export const ENVIRONMENT_OPTIONS: EnvironmentOption[] = [
  { id: "city", label: "Cyberpunk City", description: "Urban neon skyline", icon: "🏙️" },
  { id: "sunset", label: "Sunset", description: "Golden hour warmth", icon: "🌅" },
  { id: "dawn", label: "Dawn Lab", description: "Early morning lab", icon: "🌄" },
  { id: "night", label: "Deep Space", description: "Starfield void", icon: "🌌" },
  { id: "warehouse", label: "Tech Warehouse", description: "Industrial facility", icon: "🏭" },
  { id: "forest", label: "Bio Dome", description: "Nature reserve", icon: "🌲" },
  { id: "apartment", label: "Living Space", description: "Modern apartment", icon: "🏠" },
  { id: "studio", label: "Studio", description: "Clean studio lighting", icon: "💡" },
  { id: "park", label: "Park", description: "Open outdoor space", icon: "🌳" },
  { id: "lobby", label: "Command Center", description: "HQ lobby", icon: "🏛️" },
]

// ─── Appearance ──────────────────────────────────────────────────────────────

export type MaterialColorPreset = "chrome" | "white" | "obsidian" | "gold" | "cyan" | "crimson"

export interface MaterialColorOption {
  id: MaterialColorPreset
  label: string
  hex: string
}

export const MATERIAL_COLOR_OPTIONS: MaterialColorOption[] = [
  { id: "chrome", label: "Chrome", hex: "#C0C0C0" },
  { id: "white", label: "Arctic", hex: "#F0F0F0" },
  { id: "obsidian", label: "Obsidian", hex: "#1a1a2e" },
  { id: "gold", label: "Gold", hex: "#FFD700" },
  { id: "cyan", label: "Neon Cyan", hex: "#06b6d4" },
  { id: "crimson", label: "Crimson", hex: "#DC143C" },
]

// ─── User Facts (Memory) ─────────────────────────────────────────────────────

export interface UserFacts {
  name: string | null
  likes: string[]
  dislikes: string[]
  topics: string[] // frequently discussed topics
  firstInteraction: string | null // ISO date
  totalConversations: number
}

export const DEFAULT_USER_FACTS: UserFacts = {
  name: null,
  likes: [],
  dislikes: [],
  topics: [],
  firstInteraction: null,
  totalConversations: 0,
}

// ─── Chat Message ────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp?: number
  emotion?: Emotion
}
