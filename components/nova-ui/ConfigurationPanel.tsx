"use client"

import {
  Brain,
  Sparkles,
  Scale,
  Heart,
  BotMessageSquare,
  Zap,
} from "lucide-react"
import { useState } from "react"
import SliderControl from "./SliderControl"

interface ConfigurationPanelProps {
  glassClasses: string
}

export default function ConfigurationPanel({
  glassClasses,
}: ConfigurationPanelProps) {
  // Mock State for sliders
  const [config, setConfig] = useState({
    outfit: 4, // Represents V.04
    color: 50, // Neon (0-100)
    humor: 85, // 85%
    formality: 10, // LOW
    empathy: 95, // MAX
  })

  const getCustomValueText = (key: keyof typeof config, value: number) => {
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

      {/* Sliders Area */}
      <div className="flex flex-col gap-7 pt-2">
        <SliderControl
          label="Outfit"
          icon={BotMessageSquare}
          min={1}
          max={10}
          value={config.outfit}
          onChange={(v) => setConfig({ ...config, outfit: v })}
          isValueCustomText
          valueText={getCustomValueText("outfit", config.outfit)}
        />
        <SliderControl
          label="Color"
          icon={Sparkles}
          value={config.color}
          onChange={(v) => setConfig({ ...config, color: v })}
          isValueCustomText
          valueText={getCustomValueText("color", config.color)}
        />
        <SliderControl
          label="Humor"
          icon={Brain}
          value={config.humor}
          onChange={(v) => setConfig({ ...config, humor: v })}
          displayValueSuffix="%"
          valueText={`${config.humor}%`}
        />
        <SliderControl
          label="Formality"
          icon={Scale}
          value={config.formality}
          onChange={(v) => setConfig({ ...config, formality: v })}
          isValueCustomText
          valueText={getCustomValueText("formality", config.formality)}
        />
        <SliderControl
          label="Empathy"
          icon={Heart}
          value={config.empathy}
          onChange={(v) => setConfig({ ...config, empathy: v })}
          isValueCustomText
          valueText={getCustomValueText("empathy", config.empathy)}
        />
      </div>

      {/* Neural State Bar */}
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

      {/* Active Memory */}
      <div className="flex items-center justify-between text-white/40 px-5 pt-1 pb-1">
        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4 text-white/30" />
          <span className="text-xs font-medium tracking-wide">
            Active Memory
          </span>
        </div>
        <span className="text-xs font-mono uppercase tracking-widest">
          12.4TB
        </span>
      </div>
    </div>
  )
}
