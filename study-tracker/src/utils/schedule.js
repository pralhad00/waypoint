// Scheduling: computed, never stored. Pure date + hour math.
// Study days = days from phase start to end, minus rest days.
// Fill each study day with unchecked tasks in order, up to daily budget.
// Snoozed items (Not today) are skipped until their snoozedUntil date.
// Applications are excluded by callers (Today queue + budget), not here.
import {
  addDays,
  differenceInCalendarDays,
  format,
  isWithinInterval,
  parseISO,
} from 'date-fns'
import { phaseHours } from './progress.js'

export function todayKey(date = new Date()) {
  return format(date, 'yyyy-MM-dd')
}

export function toKey(date) {
  return format(date, 'yyyy-MM-dd')
}

// True if this date is a rest day (single list or inside a range).
export function isRestDay(dateStr, settings) {
  const restDays = settings?.restDays || []
  if (restDays.includes(dateStr)) return true
  const ranges = settings?.restRanges || []
  return ranges.some((r) => {
    if (!r?.start || !r?.end) return false
    return isWithinInterval(parseISO(dateStr), {
      start: parseISO(r.start),
      end: parseISO(r.end),
    })
  })
}

// All study days in a phase, inclusive, minus rest. Sorted ascending.
export function listStudyDays(phaseStart, phaseEnd, settings) {
  const days = []
  const n = differenceInCalendarDays(parseISO(phaseEnd), parseISO(phaseStart))
  for (let d = 0; d <= n; d++) {
    const key = toKey(addDays(parseISO(phaseStart), d))
    if (!isRestDay(key, settings)) days.push(key)
  }
  return days
}

// Next study day on or after dateStr (skips rest days).
export function nextStudyDay(dateStr, settings, limit = 120) {
  let cur = parseISO(dateStr)
  for (let i = 0; i < limit; i++) {
    const key = toKey(cur)
    if (!isRestDay(key, settings)) return key
    cur = addDays(cur, 1)
  }
  return toKey(cur)
}

// Every date key in an inclusive range. Used to preview a rest range.
export function datesInRange(start, end) {
  const n = differenceInCalendarDays(parseISO(end), parseISO(start))
  if (Number.isNaN(n) || n < 0) return []
  const out = []
  for (let d = 0; d <= n; d++) out.push(toKey(addDays(parseISO(start), d)))
  return out
}

// Visible = not done. Snoozed hides the item before its snoozedUntil date.

// Fill study days from `fromDate` with remaining tasks in order.
// Tasks may split across days (a 5h task spans two 2.5h days).
// Snoozed tasks are skipped in place: later tasks still fill today,
// and the snoozed task is picked up once its date arrives.
// Returns [{ date, itemIds, hours }]. Days before fromDate are skipped.
export function schedulePhase(phase, settings, fromDate = null) {
  const budget = settings?.dailyHours || 2.5
  const days = listStudyDays(phase.start, phase.end, settings)
  const start = fromDate || days[0] || phase.start
  const queue = phase.items
    .filter((i) => !i.done)
    .map((i) => ({ id: i.id, remaining: i.hours, snoozedUntil: i.snoozedUntil || null }))
  const plan = []

  const visible = (task, day) =>
    task.remaining > 0.0001 && (!task.snoozedUntil || day >= task.snoozedUntil)

  const unfinished = () => queue.some((t) => t.remaining > 0.0001)

  // Work one study day: allocate budget to earliest visible tasks in order.
  const workDay = (day) => {
    let left = budget
    const itemIds = []
    while (left > 0.0001) {
      const task = queue.find((t) => visible(t, day))
      if (!task) break
      const alloc = Math.min(task.remaining, left)
      task.remaining -= alloc
      left -= alloc
      if (!itemIds.includes(task.id)) itemIds.push(task.id)
    }
    return { date: day, itemIds, hours: budget - left }
  };

  // If nothing is visible today, jump to the next date that unlocks work.
  const nextWorkDay = (day) => {
    const snooze = queue
      .filter((t) => t.remaining > 0.0001 && t.snoozedUntil && day < t.snoozedUntil)
      .map((t) => t.snoozedUntil)
      .sort()[0]
    const candidate = snooze && snooze > day ? snooze : toKey(addDays(parseISO(day), 1))
    return nextStudyDay(candidate, settings)
  };

  let guard = 0
  // In-phase days first.
  for (const day of days) {
    if (guard++ > 400) break
    if (day < start) continue
    if (!unfinished()) break
    if (!queue.some((t) => visible(t, day))) continue // all snoozed today
    plan.push(workDay(day))
  }

  // Overflow past the end date, one study day at a time.
  let overflowDay = days.length > 0 ? days[days.length - 1] : phase.end
  while (unfinished() && guard++ < 400) {
    overflowDay = nextWorkDay(overflowDay)
    if (overflowDay <= plan[plan.length - 1]?.date) break // safety
    plan.push(workDay(overflowDay))
    if (!unfinished()) break
  }

  return plan
}

// Compare projected finishes with and without extra rest days.
// Pure preview for "what if I rest this day?" messages.
// Returns [{ phaseId, name, end, before, after }] for phases that move.
// Applications excluded: its calendar status ignores rest days.
export function previewRestImpact(phases, settings, extraDates) {
  const extra = [...new Set(extraDates || [])].sort()
  if (extra.length === 0) return []
  const withRest = {
    ...settings,
    restDays: [...(settings?.restDays || []), ...extra],
  }
  const out = []
  for (const p of phases || []) {
    if (p.id === 'apps') continue
    const before = projectedFinish(p, settings, p.start)
    const after = projectedFinish(p, withRest, p.start)
    if (before && after && before !== after) {
      out.push({ phaseId: p.id, name: p.name, end: p.end, before, after })
    }
  }
  return out
}

// The day the last unchecked task lands. Null when nothing is left.
export function projectedFinish(phase, settings, fromDate = null) {
  const remaining = phase.items.filter((i) => !i.done)
  if (remaining.length === 0) return null
  const plan = schedulePhase(phase, settings, fromDate)
  const used = plan.filter((d) => d.itemIds.length > 0)
  if (used.length === 0) return null
  return used[used.length - 1].date
}

// Hours per day needed from today (or phase start) to finish on time.
export function needsPerDay(phase, settings, todayStr = todayKey()) {
  const { left } = phaseHours(phase)
  if (left <= 0) return 0
  const days = listStudyDays(phase.start, phase.end, settings)
  const upcoming = days.filter((d) => d >= todayStr)
  if (upcoming.length === 0) return left // no days left: all of it is late
  return left / upcoming.length
}
