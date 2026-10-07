// Small hook: keep a value in localStorage.
// Reads once on start, writes on every change.
import { useState } from 'react'

export function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readStored(key, initialValue))

  const setAndStore = (next) => {
    const resolved = typeof next === 'function' ? next(value) : next
    setValue(resolved)
    try {
      localStorage.setItem(key, JSON.stringify(resolved))
    } catch {
      // Storage full or blocked. App still works for this session.
    }
  }

  return [value, setAndStore]
}
