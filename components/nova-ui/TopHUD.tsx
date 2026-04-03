"use client"

import { Settings, Image, Radio } from "lucide-react"

export default function TopHUD() {
  return (
    <div className="flex items-center justify-between w-full h-16">
      {/* Top Left: Logo & Status */}
      <div className="flex items-center gap-6">
        <h1 className="text-3xl font-extralight tracking-widest text-white/90">
          NOVA<span className="text-cyan-500 font-bold ml-1">•</span>
        </h1>
        <div className="flex items-center gap-3 bg-cyan-950/40 px-6 py-3 rounded-full border border-cyan-800/40">
          <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full animate-pulse"></div>
          <span className="text-xs uppercase font-medium text-cyan-200 tracking-wider">
            Neural Link Active
          </span>
        </div>
      </div>

      {/* Top Right: Icons & Stream Data */}
      <div className="flex items-center gap-6 text-neutral-500">
        <div className="flex items-center gap-5">
          <Image className="w-6 h-6 hover:text-white transition cursor-pointer" />
          <Settings className="w-6 h-6 hover:text-white transition cursor-pointer" />
        </div>
        <div className="flex flex-col text-right">
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-cyan-500" />
            <span className="text-sm uppercase font-bold text-white/80 tracking-widest">
              STREAM LINK
            </span>
          </div>
          <span className="text-[11px] font-mono text-white/40">
            ENCRYPTION AES-256
          </span>
        </div>
      </div>
    </div>
  )
}
