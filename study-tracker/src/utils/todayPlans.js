// Daily plans: what YOU chose to study each day (no auto-assignment).
// Stored in its own localStorage key, "todayPlans", shaped as
// { '2026-10-09': [entry, ...] } so it sits beside studyTracker.v1 instead of
// inside it. Old saves therefore keep loading: a missing key, broken JSON or an
// unexpected shape all sanitize down to {} rather than throwing.
// Entries: topic picks (phaseId + itemId, live title/hours/done from the store)
// and custom picks (title + optional hours, not part of any checklist).
export const PLANS_KEY = 'todayPlans'

// Accept '2026-10-09' only. Anything else is dropped on load.
function isDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

// Hours may arrive as a number or a numeric string. Blank/NaN -> 0.
function toHours(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = parseFloat(value)
    if (Number.isFinite(n)) return n
  }
  return 0
}

// Rebuild one entry with only known fields. Returns null if unusable.
function sanitizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (typeof raw.id !== 'string' || raw.id === '') return null
  const done = !!raw.done
  if (raw.kind === 'custom') {
    if (typeof raw.title !== 'string' || raw.title.trim() === '') return null
    return { id: raw.id, kind: 'custom', title: raw.title.trim(), hours: toHours(raw.hours), done }
  }
  if (typeof raw.phaseId !== 'string' || typeof raw.itemId !== 'string') return null
  if (raw.phaseId === '' || raw.itemId === '') return null
  return {
    id: raw.id,
    kind: 'topic',
    phaseId: raw.phaseId,
    itemId: raw.itemId,
    title: typeof raw.title === 'string' ? raw.title : '',
    hours: toHours(raw.hours),
    done,
  }
}

// Keep only valid dates and entries. Never throws, never returns null.
export function sanitizePlans(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [date, list] of Object.entries(raw)) {
    if (!isDateKey(date) || !Array.isArray(list)) continue
    const entries = list.map(sanitizeEntry).filter(Boolean)
    if (entries.length > 0) out[date] = entries
  }
  return out
}

// Read plans from localStorage. Missing or broken data -> {}.
export function loadPlans() {
  try {
    const raw = localStorage.getItem(PLANS_KEY)
    if (!raw) return {}
    return sanitizePlans(JSON.parse(raw))
  } catch {
    return {}
  }
}

// Write plans back. Sanitizes first so junk never accumulates; storage errors
// are ignored so the session keeps working.
export function savePlans(plans) {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(sanitizePlans(plans)))
  } catch {
    // Storage full or blocked. Nothing to do.
  }
}

export function topicEntryId(phaseId, itemId) {
  return `topic:${phaseId}:${itemId}`
}

export function makeTopicEntry(phase, item) {
  return {
    id: topicEntryId(phase.id, item.id),
    kind: 'topic',
    phaseId: phase.id,
    itemId: item.id,
    title: item.title,
    hours: toHours(item.hours),
    done: false,
  }
}

export function makeCustomEntry(title, hours) {
  return {
    id: `custom:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'custom',
    title: String(title).trim(),
    hours: toHours(hours),
    done: false,
  }
}

// Tasks the picker may offer: not completed and not locked. `done` is read
// ONLY to decide what to show here — it is never used to represent a selection
// and is never written back. Requiring an explicit `done === false` means a
// finished task (or one with an unknown/legacy flag) can never be re-added.
export function pickableItems(phase) {
  return (phase?.items || []).filter((i) => i.done === false && !i.locked)
}

// Live view of an entry: topic picks read current title/hours/done from the
// store (so topic-page edits show up here) and return null if the task was
// deleted. Custom picks are returned as stored.
export function resolveEntry(entry, phasesById) {
  const clean = sanitizeEntry(entry)
  if (!clean) return null
  if (clean.kind === 'custom') return clean
  const phase = phasesById.get(clean.phaseId)
  const item = phase?.items.find((i) => i.id === clean.itemId)
  if (!item) return null
  return {
    ...clean,
    title: item.title,
    hours: toHours(item.hours),
    done: !!item.done,
    locked: !!item.locked,
    phase,
  }
}

// Total planned hours of a resolved plan (done or not).
export function planHours(entries) {
  const total = (entries || []).reduce((sum, e) => sum + toHours(e.hours), 0)
  return Math.round(total * 10) / 10
}
