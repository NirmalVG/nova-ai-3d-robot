"use client"

import { useState, useEffect, type ReactNode } from "react"

/**
 * Prevents rendering children until after client-side hydration.
 * This avoids hydration mismatches when components depend on
 * Zustand persisted state, browser APIs, or client-only logic.
 */
export function ClientOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return fallback ?? null
  }

  return <>{children}</>
}
