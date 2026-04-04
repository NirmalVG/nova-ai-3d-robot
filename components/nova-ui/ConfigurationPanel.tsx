"use client"

import {
  Brain,
  Sparkles,
  Scale,
  Heart,
  BotMessageSquare,
  Zap,
} from "lucide-react"
import SliderControl from "./SliderControl"
import { useNovaStore } from "@/store/useNovaStore"

interface ConfigurationPanelProps {
  glassClasses: string
}

export default function ConfigurationPanel({
  glassClasses,
}: ConfigurationPanelProps) {
  // Now reads from AND writes to the store — sliders actually affect Nova
  const { personality, setPersonality, clearHistory } = useNovaStore()

  const getCustomValueText = (key: keyof typeof personality, value: number) => {
    switch (key) {
      case "outfit":
        return `V .0${value}`
      case "color":
        return value > 75 ? "NEON" : value < 25 ? "MONO" : "CHROMO"
      case "formality":
        return value < 25 ? "LOW" : value > 75 ? "HIGH" : "MID"
      case "empathy":
        return value > 90 ? "MAX" : value < 10 ? "NONE" : "BALANCED"
      default:
        return `${value}%`
    }
  }

  return (
    <div className={`${glassClasses} w-[360px] p-10 space-y-8 flex flex-col`}>
      <div className="space-y-1">
        <h2 className="text-xl font-medium text-white tracking-wide">
          Core Configuration
        </h2>
        <p className="text-xs uppercase font-medium text-white/40 tracking-wider">
          AI Personality & Aesthetics
        </p>
      </div>

      <div className="flex flex-col gap-7 pt-2">
        <SliderControl
          label="Outfit"
          icon={BotMessageSquare}
          min={1}
          max={10}
          value={personality.outfit}
          onChange={(v) => setPersonality({ outfit: v })}
          isValueCustomText
          valueText={getCustomValueText("outfit", personality.outfit)}
        />
        <SliderControl
          label="Color"
          icon={Sparkles}
          value={personality.color}
          onChange={(v) => setPersonality({ color: v })}
          isValueCustomText
          valueText={getCustomValueText("color", personality.color)}
        />
        <SliderControl
          label="Humor"
          icon={Brain}
          value={personality.humor}
          onChange={(v) => setPersonality({ humor: v })}
          valueText={`${personality.humor}%`}
          displayValueSuffix="%"
        />
        <SliderControl
          label="Formality"
          icon={Scale}
          value={personality.formality}
          onChange={(v) => setPersonality({ formality: v })}
          isValueCustomText
          valueText={getCustomValueText("formality", personality.formality)}
        />
        <SliderControl
          label="Empathy"
          icon={Heart}
          value={personality.empathy}
          onChange={(v) => setPersonality({ empathy: v })}
          isValueCustomText
          valueText={getCustomValueText("empathy", personality.empathy)}
        />
      </div>

      <div className="flex items-center justify-between mt-6 px-5 py-4 bg-cyan-950/20 border border-cyan-800/40 rounded-full">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-cyan-500" />
          <span className="text-sm font-medium tracking-wide">
            Neural State
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest bg-cyan-900 px-3 py-1 rounded-full">
          STABLE
        </span>
      </div>

      {/* Clear Memory Button — wired to store */}
      <button
        onClick={clearHistory}
        className="flex items-center justify-between text-white/40 hover:text-white/70 transition px-5 pt-1 pb-1 cursor-pointer w-full"
      >
        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4 text-white/30" />
          <span className="text-xs font-medium tracking-wide">
            Active Memory
          </span>
        </div>
        <span className="text-xs font-mono uppercase tracking-widest">
          CLEAR
        </span>
      </button>
    </div>
  )
}
