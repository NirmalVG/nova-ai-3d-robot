"use client"

import { useState } from "react"
import { useNovaBrain } from "@/hooks/useNovaBrain"
import { useNovaStore } from "@/store/useNovaStore"

export default function DebugInput() {
  const [text, setText] = useState("")
  const { askNova, testVoice } = useNovaBrain()
  const { currentState } = useNovaStore()

  const handleSend = () => {
    if (!text.trim()) return
    askNova(text.trim())
    setText("")
  }

  return (
    <div className="flex items-center gap-2 bg-black/60 border border-white/20 rounded-full px-4 py-2 backdrop-blur-xl">
      <span className="text-xs text-white/40 uppercase tracking-widest font-mono min-w-16 text-center">
        {currentState}
      </span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Type to test Nova..."
        className="bg-transparent text-white text-sm outline-none w-64 placeholder:text-white/30"
      />
      <button
        onClick={handleSend}
        className="text-cyan-400 text-xs uppercase tracking-widest hover:text-cyan-300 transition cursor-pointer"
      >
        Send
      </button>
      <button
        onClick={testVoice}
        className="text-yellow-400 text-xs uppercase tracking-widest hover:text-yellow-300 transition cursor-pointer"
      >
        Test Voice
      </button>
    </div>
  )
}
