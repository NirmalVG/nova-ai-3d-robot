"use client"

import { LucideIcon } from "lucide-react"
import { ChangeEvent } from "react"

interface SliderControlProps {
  label: string
  icon: LucideIcon
  valueText: string
  min?: number
  max?: number
  step?: number
  value: number
  onChange: (value: number) => void
  displayValueSuffix?: string
  isValueCustomText?: boolean
}

export default function SliderControl({
  label,
  icon: Icon,
  valueText,
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  displayValueSuffix,
  isValueCustomText = false,
}: SliderControlProps) {
  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value))
  }

  return (
    <div className="w-full space-y-3 p-1">
      <div className="flex items-center justify-between text-white/70">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-cyan-500" />
          <span className="text-sm font-medium tracking-wide">{label}</span>
        </div>
        <span className="text-xs font-mono text-cyan-200 uppercase tracking-wider">
          {isValueCustomText
            ? valueText
            : `${value}${displayValueSuffix ?? ""}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-cyan-500"
      />
    </div>
  )
}
