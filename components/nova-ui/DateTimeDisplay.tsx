"use client"

import { useState, useEffect } from "react"

export default function DateTimeDisplay() {
  const [time, setTime] = useState("")
  const [date, setDate] = useState("")

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      )
      setDate(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }).toUpperCase(),
      )
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col space-y-1" aria-label="Current date and time" role="timer">
      <span className="text-4xl lg:text-5xl font-extralight text-white tracking-wide tabular-nums">
        {time || "00:00"}
      </span>
      <span className="text-[10px] uppercase font-medium text-white/40 tracking-wider">
        {date || "---"} • Lunar Chrono
      </span>
    </div>
  )
}
