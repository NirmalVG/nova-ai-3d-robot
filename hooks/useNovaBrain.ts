"use client"

import { useRef, useCallback } from "react"
import { useNovaStore } from "@/store/useNovaStore"

// Tell TypeScript that the Web Speech APIs exist on the window object
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export function useNovaBrain() {
  const { setCurrentState, setTranscripts } = useNovaStore()
  const recognitionRef = useRef<any>(null)

  // 1. Initialize the Robot's Voice (Text-to-Speech)
  const speakResponse = useCallback(
    (text: string, userText: string) => {
      setCurrentState("SPEAKING")
      setTranscripts(userText, text)

      // Cancel any ongoing speech to avoid overlapping audio
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)

      // Attempt to find a high-quality, robotic, or female voice
      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find(
        (v) =>
          v.name.includes("Google US English") ||
          v.name.includes("Samantha") ||
          v.name.includes("Microsoft Zira"),
      )

      if (preferredVoice) {
        utterance.voice = preferredVoice
      }

      // Tweak pitch and rate to sound slightly synthetic but natural
      utterance.pitch = 1.1
      utterance.rate = 1.05

      utterance.onend = () => {
        setCurrentState("IDLE")
      }

      utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e)
        setCurrentState("IDLE")
      }

      window.speechSynthesis.speak(utterance)
    },
    [setCurrentState, setTranscripts],
  )

  // 2. Initialize the Microphone Listener (Speech-to-Text)
  const startListening = useCallback(() => {
    // Check for browser support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert(
        "Speech recognition is not supported in this browser. Please try using Google Chrome or Edge.",
      )
      return
    }

    // Stop any existing recognition instance
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.lang = "en-US"
    recognition.interimResults = false // We only want the final, confident sentence
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setCurrentState("LISTENING")
    }

    recognition.onresult = (event: any) => {
      const userText = event.results[0][0].transcript

      // Transition to Thinking state
      setCurrentState("THINKING")
      setTranscripts(userText, "...") // Show user text, clear previous Nova response

      // TODO: In V2, we will replace this setTimeout with a real fetch() call to an LLM API (OpenAI/Claude).
      // For now, we mock a network delay to test the UI pipeline.
      setTimeout(() => {
        // A simple programmatic response logic for the MVP
        let mockReply = `I heard you say: "${userText}". I am fully operational.`

        const lowerText = userText.toLowerCase()
        if (lowerText.includes("hello") || lowerText.includes("hi")) {
          mockReply =
            "Hello there. Neural link established. How can I assist you today?"
        } else if (lowerText.includes("who are you")) {
          mockReply =
            "I am Nova, a browser-native AI companion. I exist right here in your interface."
        } else if (lowerText.includes("goodbye") || lowerText.includes("bye")) {
          mockReply = "Shutting down neural link. Goodbye."
        }

        speakResponse(mockReply, userText)
      }, 1500)
    }

    recognition.onerror = (event: any) => {
      // Ignore the 'no-speech' error if the user just didn't say anything
      if (event.error !== "no-speech") {
        console.error("Speech recognition error:", event.error)
      }
      setCurrentState("IDLE")
    }

    recognition.onspeechend = () => {
      recognition.stop()
    }

    recognition.start()
  }, [setCurrentState, setTranscripts, speakResponse])

  return { startListening }
}
