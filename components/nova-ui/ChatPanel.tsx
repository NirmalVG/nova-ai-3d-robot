"use client"

import { useState, useRef, useEffect } from "react"
import { X, Send, Mic, MessageSquare } from "lucide-react"
import { useNovaStore } from "@/store/useNovaStore"
import { useNovaBrain } from "@/hooks/useNovaBrain"
import { EMOTION_ICONS } from "@/lib/types"

// ─── Relative Time ───────────────────────────────────────────────────────────

function relativeTime(timestamp: number | undefined): string {
  if (!timestamp) return ""
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 10) return "just now"
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ─── Chat Panel ──────────────────────────────────────────────────────────────

export default function ChatPanel() {
  const showChat = useNovaStore((s) => s.showChat)
  const toggleChat = useNovaStore((s) => s.toggleChat)
  const conversationHistory = useNovaStore((s) => s.conversationHistory)
  const currentState = useNovaStore((s) => s.currentState)
  const { askNova } = useNovaBrain()
  const [text, setText] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversationHistory.length])

  // Focus input when panel opens
  useEffect(() => {
    if (showChat && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [showChat])

  const handleSend = () => {
    if (!text.trim() || currentState !== "IDLE") return
    askNova(text.trim())
    setText("")
  }

  const isDisabled = currentState !== "IDLE"

  return (
    <>
      {/* Backdrop (mobile only) */}
      {showChat && (
        <div
          className="fixed inset-0 bg-black/30 z-30 sm:hidden"
          onClick={toggleChat}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={`fixed z-40 transition-transform duration-300 ease-out
          bottom-0 left-0 right-0 sm:bottom-auto sm:right-auto
          sm:top-0 sm:left-0
          ${showChat
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:-translate-x-full sm:translate-y-0"
          }`}
        role="dialog"
        aria-label="Chat panel"
      >
        <div
          className={`
            w-full sm:w-[380px] lg:w-[400px]
            h-[70vh] sm:h-screen
            backdrop-blur-xl bg-black/70 border-t sm:border-t-0 sm:border-r border-white/10
            flex flex-col
            rounded-t-2xl sm:rounded-none
          `}
        >
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center pt-2">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-cyan-500" />
              <h2 className="text-sm uppercase font-medium tracking-widest text-white/80">
                Neural Transcript
              </h2>
            </div>
            <button
              onClick={toggleChat}
              className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/40 hover:text-white cursor-pointer"
              aria-label="Close chat panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin"
          >
            {conversationHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-white/30 gap-4">
                <Mic className="w-10 h-10" />
                <p className="text-sm">Say hello to start a conversation</p>
                <p className="text-xs text-white/20">
                  Click the mic or type below
                </p>
              </div>
            ) : (
              conversationHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${msg.role === "user"
                        ? "bg-white/10 text-white/90 rounded-br-md"
                        : "bg-cyan-950/40 border border-cyan-800/30 text-cyan-100 rounded-bl-md"
                      }`}
                  >
                    {msg.role === "assistant" && msg.emotion && msg.emotion !== "neutral" && (
                      <span className="mr-1.5">{EMOTION_ICONS[msg.emotion]}</span>
                    )}
                    {msg.content}
                    <div
                      className={`text-[10px] mt-1.5 ${
                        msg.role === "user" ? "text-white/30 text-right" : "text-cyan-400/40"
                      }`}
                    >
                      {relativeTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Thinking indicator */}
            {currentState === "THINKING" && (
              <div className="flex justify-start">
                <div className="bg-cyan-950/40 border border-cyan-800/30 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/10">
            <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/10 focus-within:border-cyan-500/50 transition">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={isDisabled ? "Nova is processing..." : "Type a message..."}
                disabled={isDisabled}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30 disabled:opacity-50"
                aria-label="Type a message"
              />
              <button
                onClick={handleSend}
                disabled={isDisabled || !text.trim()}
                className="p-2 rounded-full hover:bg-cyan-500/20 transition text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
