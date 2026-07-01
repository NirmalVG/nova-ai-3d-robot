"use client"

import { Settings, Image, Radio, Menu, X } from "lucide-react"
import { useNovaStore } from "@/store/useNovaStore"
import { EMOTION_ICONS, EMOTION_LABELS } from "@/lib/types"
import { useState } from "react"

export default function TopHUD() {
  const currentProvider = useNovaStore((s) => s.currentProvider)
  const emotionalState = useNovaStore((s) => s.emotionalState)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSettingsClick = () => {
    useNovaStore.getState().toggleSettings()
    setMobileMenuOpen(false)
  }

  const handleEnvironmentClick = () => {
    // Open settings panel (it has environment section)
    const store = useNovaStore.getState()
    if (!store.showSettings) store.toggleSettings()
    setMobileMenuOpen(false)
  }

  return (
    <div className="flex items-center justify-between w-full h-12 sm:h-16">
      {/* Logo & status */}
      <div className="flex items-center gap-3 sm:gap-6">
        <h1 className="text-xl sm:text-3xl font-extralight tracking-widest text-white/90">
          NOVA<span className="text-cyan-500 font-bold ml-1">•</span>
        </h1>

        {/* Status badge — hidden on very small screens */}
        <div className="hidden xs:flex items-center gap-2 sm:gap-3 bg-cyan-950/40 px-3 sm:px-6 py-1.5 sm:py-3 rounded-full border border-cyan-800/40">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-cyan-500 rounded-full animate-pulse" />
          <span className="text-[10px] sm:text-xs uppercase font-medium text-cyan-200 tracking-wider">
            Neural Link Active
          </span>
        </div>

        {/* Emotion badge */}
        {emotionalState !== "neutral" && (
          <div
            className="hidden sm:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10"
            role="status"
            aria-label={`Nova is feeling ${EMOTION_LABELS[emotionalState]}`}
          >
            <span className="text-sm">{EMOTION_ICONS[emotionalState]}</span>
            <span className="text-[10px] uppercase font-medium text-white/50 tracking-wider">
              {EMOTION_LABELS[emotionalState]}
            </span>
          </div>
        )}
      </div>

      {/* Right side — Desktop */}
      <div className="hidden sm:flex items-center gap-6 text-neutral-500">
        <div className="flex items-center gap-5">
          <button
            onClick={handleEnvironmentClick}
            className="w-6 h-6 hover:text-white transition cursor-pointer"
            aria-label="Change environment"
          >
            <Image className="w-6 h-6" />
          </button>
          <button
            onClick={handleSettingsClick}
            className="w-6 h-6 hover:text-white transition cursor-pointer"
            aria-label="Open settings"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col text-right">
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-cyan-500" />
            <span className="text-sm uppercase font-bold text-white/80 tracking-widest">
              Stream Link
            </span>
          </div>
          <span className="text-[11px] font-mono text-white/40 uppercase tracking-widest">
            {currentProvider ? `via ${currentProvider}` : "encryption aes-256"}
          </span>
        </div>
      </div>

      {/* Right side — Mobile hamburger */}
      <div className="sm:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-white/60 hover:text-white transition cursor-pointer"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-14 right-4 z-50 backdrop-blur-xl bg-black/80 border border-white/10 rounded-xl p-4 space-y-3 min-w-[200px]">
            {emotionalState !== "neutral" && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <span>{EMOTION_ICONS[emotionalState]}</span>
                <span>Feeling {EMOTION_LABELS[emotionalState]}</span>
              </div>
            )}
            <button
              onClick={handleEnvironmentClick}
              className="flex items-center gap-3 w-full px-3 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition text-sm cursor-pointer"
            >
              <Image className="w-5 h-5" />
              <span>Environment</span>
            </button>
            <button
              onClick={handleSettingsClick}
              className="flex items-center gap-3 w-full px-3 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition text-sm cursor-pointer"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
            <div className="border-t border-white/10 pt-2">
              <div className="flex items-center gap-2 px-3 text-white/30 text-[10px] uppercase tracking-widest">
                <Radio className="w-3 h-3 text-cyan-500" />
                {currentProvider ? `via ${currentProvider}` : "AES-256"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
