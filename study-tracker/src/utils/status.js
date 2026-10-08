// Status: Ahead / On track / Behind. Pure, no UI.
// expected % = study days elapsed / total study days.
// Ahead if actual is 5+ points above expected, Behind if 5+ below.
// Applications uses calendar days only (rest days do NOT help its status).
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { phaseHours } from './progress.js'
import { listStudyDays, needsPerDay, projectedFinish, todayKey } from './schedule.js'

function calendarExpected(phase, todayStr) {
  const total = differenceInCalendarDays(parseISO(phase.end), parseISO(phase.start)) + 1
  if (total <= 0) return 100
  const elapsed = differenceInCalendarDays(parseISO(todayStr), parseISO(phase.start)) + 1
  return (Math.max(0, Math.min(elapsed, total)) / total) * 100
}

function studyExpected(phase, settings, todayStr) {
  const days = listStudyDays(phase.start, phase.end, settings)
  if (days.length === 0) return 100
  const elapsed = days.filter((d) => d <= todayStr).length
  return (elapsed / days.length) * 100
}

export function phaseStatus(phase, settings, todayStr = todayKey()) {
  const { percent: actual, left } = phaseHours(phase)
  const isApps = phase.id === 'apps'
  const expected = isApps
    ? calendarExpected(phase, todayStr)
    : studyExpected(phase, settings, todayStr)
  const diff = actual - expected
  const status = diff >= 5 ? 'ahead' : diff <= -5 ? 'behind' : 'on-track'
  const projected = projectedFinish(phase, settings, todayStr)
  const isLate = projected ? projected > phase.end : false
  return {
    status,
    actual,
    expected,
    diff,
    needs: needsPerDay(phase, settings, todayStr),
    projected,
    isLate,
    left,
  }
}
