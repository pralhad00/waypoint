// Per-date study plans in localStorage (key "todayPlans").
// Loads sanitized data — old, missing or broken saves become {} — and saves
// on every change. update(fn) receives the current plans and returns the next.
import { useCallback, useEffect, useState } from 'react'
import { loadPlans, savePlans, sanitizePlans } from '../utils/todayPlans.js'

export function useTodayPlans() {
  const [plans, setPlans] = useState(() => loadPlans())

  // Save on every change. The first run also rewrites the sanitized shape.
  useEffect(() => {
    savePlans(plans)
  }, [plans])

  const update = useCallback((fn) => {
    setPlans((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      // Returning the same object means "nothing changed" — keep the old
      // reference so React bails out instead of re-rendering and re-saving.
      if (next === prev) return prev
      return sanitizePlans(next)
    })
  }, [])

  return [plans, update]
}
