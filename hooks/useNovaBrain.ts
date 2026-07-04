"use client"

import { useRef, useCallback, useEffect } from "react"
import { useNovaStore } from "@/store/useNovaStore"
import type { Emotion } from "@/lib/types"

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

// ─── Emotion Parser ──────────────────────────────────────────────────────────
// Extracts [EMOTION:xxx] tag from LLM response and returns clean text + emotion

function parseEmotionTag(text: string): { cleanText: string; emotion: Emotion } {
  const match = text.match(/\[EMOTION:(\w+)\]/i)
  if (match) {
    const emotion = match[1].toLowerCase() as Emotion
    const validEmotions: Emotion[] = [
      "neutral", "happy", "curious", "excited",
      "sad", "bored", "surprised", "thoughtful",
    ]
    const cleanText = text.replace(/\[EMOTION:\w+\]/gi, "").trim()
    return {
      cleanText,
      emotion: validEmotions.includes(emotion) ? emotion : "neutral",
    }
  }
  return { cleanText: text, emotion: "neutral" }
}

// ─── User Facts Extractor ────────────────────────────────────────────────────
// Simple heuristic extraction from user messages

function extractUserFacts(
  userText: string,
  currentFacts: ReturnType<typeof useNovaStore.getState>["userFacts"],
) {
  const lower = userText.toLowerCase()
  const updates: Partial<typeof currentFacts> = {}

  // Extract name: "my name is X", "I'm X", "call me X"
  const nameMatch = lower.match(
    /(?:my name is|i'm|i am|call me|they call me)\s+([a-z]+)/i,
  )
  if (nameMatch && nameMatch[1].length > 1) {
    const name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1)
    updates.name = name
  }

  // Extract likes: "I like X", "I love X", "I enjoy X"
  const likeMatch = lower.match(
    /(?:i like|i love|i enjoy|i'm into|i am into|fan of)\s+(.+?)(?:\.|,|!|$)/i,
  )
  if (likeMatch) {
    const like = likeMatch[1].trim()
    if (like.length > 1 && like.length < 50) {
      const currentLikes = currentFacts.likes || []
      if (!currentLikes.includes(like)) {
        updates.likes = [...currentLikes, like].slice(-10)
      }
    }
  }

  // Track first interaction
  if (!currentFacts.firstInteraction) {
    updates.firstInteraction = new Date().toISOString()
  }

  // Increment conversation count
  updates.totalConversations = (currentFacts.totalConversations || 0) + 1

  return Object.keys(updates).length > 0 ? updates : null
}

export function useNovaBrain() {
  const setCurrentState = useNovaStore((s) => s.setCurrentState)
  const setCurrentProvider = useNovaStore((s) => s.setCurrentProvider)
  const setTranscripts = useNovaStore((s) => s.setTranscripts)
  const setEmotionalState = useNovaStore((s) => s.setEmotionalState)
  const setUserFacts = useNovaStore((s) => s.setUserFacts)
  const personality = useNovaStore((s) => s.personality)
  const conversationHistory = useNovaStore((s) => s.conversationHistory)
  const addToHistory = useNovaStore((s) => s.addToHistory)

  const recognitionRef = useRef<any>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // ─── Pre-load Voices ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        voicesRef.current = voices
      }
    }

    loadVoices()
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices)

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices)
    }
  }, [])

  // ─── Stop Speaking ────────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setCurrentState("IDLE")
  }, [setCurrentState])

  // ─── TTS ──────────────────────────────────────────────────────────────────
  const speakResponse = useCallback(
    (text: string, userText: string, emotion?: Emotion) => {
      setCurrentState("SPEAKING")
      setTranscripts(userText, text)
      if (emotion) setEmotionalState(emotion)

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utteranceRef.current = utterance

      // Apply voice settings from store
      const currentSettings = useNovaStore.getState().voiceSettings
      const voices = voicesRef.current

      // Find voice by URI or fallback
      let selectedVoice: SpeechSynthesisVoice | null = null
      if (currentSettings.voiceURI) {
        selectedVoice = voices.find((v) => v.voiceURI === currentSettings.voiceURI) || null
      }
      if (!selectedVoice) {
        selectedVoice =
          voices.find((v) => v.name.includes("Google US English")) ||
          voices.find((v) => v.name.includes("Samantha")) ||
          voices.find((v) => v.name.includes("Microsoft Zira")) ||
          voices.find((v) => v.lang === "en-US" && !v.localService) ||
          voices.find((v) => v.lang === "en-US") ||
          voices[0] ||
          null
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice
      }

      utterance.pitch = currentSettings.pitch
      utterance.rate = currentSettings.rate
      utterance.volume = currentSettings.volume

      utterance.onend = () => {
        utteranceRef.current = null
        setCurrentState("IDLE")
      }

      // Chrome TTS bug workaround
      const keepAlive = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        } else {
          clearInterval(keepAlive)
        }
      }, 5000)

      utterance.onerror = (e) => {
        console.error("❌ TTS error:", e.error)
        clearInterval(keepAlive)
        utteranceRef.current = null
        setCurrentState("IDLE")
      }

      window.speechSynthesis.speak(utterance)
    },
    [setCurrentState, setTranscripts, setEmotionalState],
  )

  // ─── AI Call ──────────────────────────────────────────────────────────────
  const askNova = useCallback(
    async (userText: string) => {
      setCurrentState("THINKING")
      setTranscripts(userText, "...")

      const userMessage = { role: "user" as const, content: userText, timestamp: Date.now() }
      addToHistory(userMessage)

      // Extract user facts from their message
      const currentFacts = useNovaStore.getState().userFacts
      const factUpdates = extractUserFacts(userText, currentFacts)
      if (factUpdates) {
        setUserFacts(factUpdates)
      }

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...conversationHistory, userMessage],
            personality: {
              humor: personality.humor,
              formality: personality.formality,
              empathy: personality.empathy,
            },
            userFacts: { ...currentFacts, ...factUpdates },
          }),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const { text, provider } = await res.json()
        setCurrentProvider(provider)

        // Parse emotion tag from response
        const { cleanText, emotion } = parseEmotionTag(text)

        addToHistory({ role: "assistant", content: cleanText, timestamp: Date.now(), emotion })
        speakResponse(cleanText, userText, emotion)
      } catch (err) {
        console.error("💥 Nova brain error:", err)
        speakResponse(
          "My neural link encountered an error. Please try again.",
          userText,
          "sad",
        )
      }
    },
    [
      setCurrentState,
      setCurrentProvider,
      setTranscripts,
      setUserFacts,
      personality,
      conversationHistory,
      addToHistory,
      speakResponse,
    ],
  )

  // ─── Speech Recognition ───────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Voice not supported. Use Chrome or Edge.")
      return
    }

    // If currently speaking, stop first
    if (useNovaStore.getState().currentState === "SPEAKING") {
      stopSpeaking()
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.lang = "en-US"
    recognition.continuous = false
    recognition.maxAlternatives = 1
    recognition.interimResults = true

    let lastInterimTranscript = ""
    let finalResultFired = false

    recognition.onstart = () => {
      lastInterimTranscript = ""
      finalResultFired = false
      setCurrentState("LISTENING")
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      if (interimTranscript) {
        lastInterimTranscript = interimTranscript
        // Show interim text in subtitles for feedback
        setTranscripts(interimTranscript, "")
      }

      if (finalTranscript) {
        finalResultFired = true
        askNova(finalTranscript.trim())
      }
    }

    recognition.onspeechend = () => {
      // Wait for final result, don't stop recognition here
    }

    recognition.onend = () => {
      recognitionRef.current = null

      if (!finalResultFired && lastInterimTranscript.trim()) {
        askNova(lastInterimTranscript.trim())
        return
      }

      if (!finalResultFired) {
        if (useNovaStore.getState().currentState === "LISTENING") {
          setCurrentState("IDLE")
        }
      }
    }

    recognition.onerror = (event: any) => {
      recognitionRef.current = null

      if (event.error === "no-speech") {
        setCurrentState("IDLE")
        return
      }

      if (event.error === "not-allowed") {
        alert("Microphone access denied. Allow it in browser settings.")
        setCurrentState("IDLE")
        return
      }

      if (event.error === "network") {
        if (lastInterimTranscript.trim()) {
          askNova(lastInterimTranscript.trim())
        } else {
          setCurrentState("IDLE")
        }
        return
      }

      console.error("❌ Speech recognition error:", event.error)
      setCurrentState("IDLE")
    }

    recognition.start()
  }, [setCurrentState, setTranscripts, askNova, stopSpeaking])

  // ─── Get Available Voices ─────────────────────────────────────────────────
  const getVoices = useCallback(() => {
    return voicesRef.current
  }, [])

  // ─── Test Voice ───────────────────────────────────────────────────────────
  const testVoice = useCallback(() => {
    const settings = useNovaStore.getState().voiceSettings
    const utterance = new SpeechSynthesisUtterance(
      "Hello! I am Nova, your AI companion. How do I sound?",
    )
    const voices = voicesRef.current
    if (settings.voiceURI) {
      const voice = voices.find((v) => v.voiceURI === settings.voiceURI)
      if (voice) utterance.voice = voice
    }
    utterance.pitch = settings.pitch
    utterance.rate = settings.rate
    utterance.volume = settings.volume
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }, [])

  return { startListening, askNova, stopSpeaking, getVoices, testVoice }
}
