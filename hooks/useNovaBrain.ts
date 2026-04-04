"use client"

import { useRef, useCallback, useEffect } from "react"
import { useNovaStore } from "@/store/useNovaStore"

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export function useNovaBrain() {
  const {
    setCurrentState,
    setTranscripts,
    personality,
    conversationHistory,
    addToHistory,
  } = useNovaStore()

  const recognitionRef = useRef<any>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  // ─── Pre-load Voices ──────────────────────────────────────────────────────
  // getVoices() returns [] on first call in Chrome because the voice list
  // loads asynchronously. We cache them as soon as they're available.
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        voicesRef.current = voices
        console.log(
          "🎙️ Voices loaded:",
          voices.map((v) => v.name),
        )
      }
    }

    loadVoices()
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices)

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices)
    }
  }, [])

  // ─── TTS ──────────────────────────────────────────────────────────────────
  const speakResponse = useCallback(
    (text: string, userText: string) => {
      setCurrentState("SPEAKING")
      setTranscripts(userText, text)

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)

      const voices = voicesRef.current
      const preferredVoice =
        voices.find((v) => v.name.includes("Google US English")) ||
        voices.find((v) => v.name.includes("Samantha")) ||
        voices.find((v) => v.name.includes("Microsoft Zira")) ||
        voices.find((v) => v.lang === "en-US" && !v.localService) ||
        voices.find((v) => v.lang === "en-US") ||
        voices[0] ||
        null

      if (preferredVoice) {
        utterance.voice = preferredVoice
        console.log("🔊 Speaking with voice:", preferredVoice.name)
      } else {
        console.warn("⚠️ No voices available yet — using browser default")
      }

      utterance.pitch = 1.1
      utterance.rate = 1.05
      utterance.volume = 1.0

      utterance.onstart = () => {
        console.log("🔊 TTS started")
      }

      utterance.onend = () => {
        console.log("✅ TTS finished")
        setCurrentState("IDLE")
      }

      // Chrome TTS bug — long utterances stop mid-sentence.
      // Poking speechSynthesis every 5s keeps it alive.
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
        setCurrentState("IDLE")
      }

      window.speechSynthesis.speak(utterance)
    },
    [setCurrentState, setTranscripts],
  )

  // ─── AI Call ──────────────────────────────────────────────────────────────
  const askNova = useCallback(
    async (userText: string) => {
      setCurrentState("THINKING")
      setTranscripts(userText, "...")

      const userMessage = { role: "user" as const, content: userText }
      addToHistory(userMessage)

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
          }),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const { text, provider } = await res.json()
        console.log(`🤖 Nova replied via ${provider}:`, text)

        addToHistory({ role: "assistant", content: text })
        speakResponse(text, userText)
      } catch (err) {
        console.error("💥 Nova brain error:", err)
        // Always recover to a speaking state so THINKING never gets stuck
        speakResponse(
          "My neural link encountered an error. Please try again.",
          userText,
        )
      }
    },
    [
      setCurrentState,
      setTranscripts,
      personality,
      conversationHistory,
      addToHistory,
      speakResponse,
    ],
  )

  // ─── Mic Diagnostic ───────────────────────────────────────────────────────
  // Reads raw audio levels for 3 seconds to confirm the browser is
  // actually receiving audio from the microphone.
  const testMicrophone = useCallback(async () => {
    console.log("🎚️ Starting mic test — speak now...")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let maxVolume = 0

      const check = setInterval(() => {
        analyser.getByteFrequencyData(dataArray)
        const volume = Math.max(...dataArray)
        maxVolume = Math.max(maxVolume, volume)
        console.log(`🎚️ Mic level: ${volume} (peak: ${maxVolume})`)
      }, 200)

      setTimeout(() => {
        clearInterval(check)
        stream.getTracks().forEach((t) => t.stop())
        audioContext.close()
        if (maxVolume < 10) {
          console.warn(
            "⚠️ Mic peak was very low — check your microphone in Windows Sound Settings",
          )
        } else {
          console.log(`✅ Mic is working correctly — peak volume: ${maxVolume}`)
        }
      }, 3000)
    } catch (err) {
      console.error("❌ Mic access failed:", err)
    }
  }, [])

  // ─── Speech Recognition ───────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert(
        "Voice not supported in this browser. Use the text input or switch to Chrome/Edge.",
      )
      return
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onstart = () => {
      console.log("🎤 Listening started")
      setCurrentState("LISTENING")
    }

    recognition.onresult = (event: any) => {
      const userText = event.results[0][0].transcript
      const confidence = event.results[0][0].confidence
      console.log(
        `🎤 Heard: "${userText}" (confidence: ${confidence.toFixed(2)})`,
      )
      askNova(userText)
    }

    // onspeechend fires BEFORE onresult — do not stop recognition here
    // or the result gets killed before it can come back
    recognition.onspeechend = () => {
      console.log("🎤 Speech ended, waiting for result...")
    }

    recognition.onend = () => {
      console.log("🎤 Recognition session ended")
      recognitionRef.current = null
      // Only reset to IDLE if still in LISTENING — if onresult already
      // fired we'll be in THINKING or SPEAKING and shouldn't touch state
      if (useNovaStore.getState().currentState === "LISTENING") {
        setCurrentState("IDLE")
      }
    }

    recognition.onerror = (event: any) => {
      recognitionRef.current = null

      // no-speech just means the user was silent — not a real error
      if (event.error === "no-speech") {
        console.log("🎤 No speech detected — timed out")
        setCurrentState("IDLE")
        return
      }

      if (event.error === "not-allowed") {
        alert(
          "Microphone access denied. Allow it in your browser settings and try again.",
        )
        setCurrentState("IDLE")
        return
      }

      console.error("❌ Speech recognition error:", event.error)
      setCurrentState("IDLE")
    }

    recognition.start()
  }, [setCurrentState, askNova])

  return { startListening, askNova, testMicrophone }
}
