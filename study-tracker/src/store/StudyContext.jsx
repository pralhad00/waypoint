// Global store: Context + useReducer, saved to localStorage.
// Key: studyTracker.v1. Scheduling math lives in src/utils/ (Job 6), not here.
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { DEFAULT_DATA } from '../data/defaultData.js'

export const STORAGE_KEY = 'studyTracker.v1'

const StudyContext = createContext(null)

// Deep copy so reset never mutates the default file.
function freshDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_DATA))
}

// Check the shape before using stored data. Returns true if safe.
function isValidShape(data) {
  if (!data || typeof data !== 'object') return false
  if (data.version !== 1) return false
  if (!data.settings || !Array.isArray(data.phases)) return false
  if (typeof data.settings.dailyHours !== 'number') return false
  if (typeof data.settings.deadline !== 'string') return false
  return data.phases.every(
    (p) =>
      p &&
      typeof p.id === 'string' &&
      Array.isArray(p.items) &&
      p.items.every((i) => i && typeof i.id === 'string' && typeof i.hours === 'number'),
  )
}

// Fill missing new fields so old saves still work after we add status/snooze.
function migrate(data) {
  const base = freshDefaults()
  if (!isValidShape(data)) return base
  return {
    ...base,
    ...data,
    settings: { ...base.settings, ...data.settings },
    phases: data.phases.map((p) => ({
      ...p,
      items: p.items.map((i) => ({
        status: i.done ? 'done' : 'todo',
        snoozedUntil: null,
        locked: false,
        doneAt: null,
        note: '',
        mustKnow: '',
        module: 'General',
        ...i,
      })),
    })),
  }
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshDefaults()
    return migrate(JSON.parse(raw))
  } catch {
    return freshDefaults()
  }
}

function nowISO() {
  return new Date().toISOString()
}

// Helper: update one item inside one phase.
function updateItem(state, phaseId, itemId, fn) {
  return {
    ...state,
    phases: state.phases.map((p) => {
      if (p.id !== phaseId) return p
      return {
        ...p,
        items: p.items.map((i) => (i.id === itemId ? fn(i) : i)),
      }
    }),
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_DONE': {
      const { phaseId, itemId } = action
      const phase = state.phases.find((p) => p.id === phaseId)
      const item = phase?.items.find((i) => i.id === itemId)
      if (!item || item.locked) return state // locked 50h row has no checkbox
      const done = !item.done
      return updateItem(state, phaseId, itemId, (i) => ({
        ...i,
        done,
        doneAt: done ? nowISO() : null,
        status: done ? 'done' : 'todo',
      }))
    }
    case 'SET_STATUS': {
      // "Start" sets in-progress. No timer in V1.
      const { phaseId, itemId, status } = action
      return updateItem(state, phaseId, itemId, (i) => ({
        ...i,
        status,
        done: status === 'done' ? true : status === 'todo' ? false : i.done,
        doneAt: status === 'done' ? nowISO() : status === 'todo' ? null : i.doneAt,
      }))
    }
    case 'SNOOZE': {
      // "Not today" pushes to next study day.
      const { phaseId, itemId, snoozedUntil } = action
      return updateItem(state, phaseId, itemId, (i) => ({ ...i, snoozedUntil }))
    }
    case 'ADD_ITEM': {
      const { phaseId, item } = action
      return {
        ...state,
        phases: state.phases.map((p) =>
          p.id === phaseId ? { ...p, items: [...p.items, item] } : p,
        ),
      }
    }
    case 'UPDATE_ITEM': {
      const { phaseId, itemId, patch } = action
      return updateItem(state, phaseId, itemId, (i) => ({ ...i, ...patch }))
    }
    case 'DELETE_ITEM': {
      const { phaseId, itemId } = action
      const phase = state.phases.find((p) => p.id === phaseId)
      if (phase?.items.find((i) => i.id === itemId)?.locked) return state
      return {
        ...state,
        phases: state.phases.map((p) =>
          p.id === phaseId ? { ...p, items: p.items.filter((i) => i.id !== itemId) } : p,
        ),
      }
    }
    case 'MOVE_ITEM': {
      // direction: -1 up, +1 down. Used for reorder buttons.
      const { phaseId, itemId, direction } = action
      return {
        ...state,
        phases: state.phases.map((p) => {
          if (p.id !== phaseId) return p
          const idx = p.items.findIndex((i) => i.id === itemId)
          const next = idx + direction
          if (idx < 0 || next < 0 || next >= p.items.length) return p
          const items = [...p.items]
          const [moved] = items.splice(idx, 1)
          items.splice(next, 0, moved)
          return { ...p, items }
        }),
      }
    }
    case 'UPDATE_SETTINGS': {
      return { ...state, settings: { ...state.settings, ...action.patch } }
    }
    case 'ADD_REST_DAY': {
      if (state.settings.restDays.includes(action.date)) return state
      return {
        ...state,
        settings: { ...state.settings, restDays: [...state.settings.restDays, action.date] },
      }
    }
    case 'REMOVE_REST_DAY': {
      return {
        ...state,
        settings: {
          ...state.settings,
          restDays: state.settings.restDays.filter((d) => d !== action.date),
        },
      }
    }
    case 'ADD_REST_RANGE': {
      return {
        ...state,
        settings: {
          ...state.settings,
          restRanges: [...state.settings.restRanges, { start: action.start, end: action.end }],
        },
      }
    }
    case 'REMOVE_REST_RANGE': {
      return {
        ...state,
        settings: {
          ...state.settings,
          restRanges: state.settings.restRanges.filter((_, idx) => idx !== action.index),
        },
      }
    }
    case 'RESET_DEFAULTS':
      return freshDefaults()
    case 'IMPORT_DATA': {
      if (!isValidShape(action.data)) return state
      return migrate(action.data)
    }
    default:
      return state
  }
}

export function StudyProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial)

  // Save on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore storage errors, app keeps running.
    }
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>
}

// Use inside pages/components to read state and dispatch actions.
export function useStudy() {
  const ctx = useContext(StudyContext)
  if (!ctx) throw new Error('useStudy must be used inside <StudyProvider>')
  return ctx
}
