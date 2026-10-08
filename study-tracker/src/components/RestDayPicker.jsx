// Rest planning: single days and date ranges.
// Tasks shift forward on their own (schedule skips rest days).
// Impact shown in plain words, e.g. "JS now finishes Oct 18 (3 days late)".
import { useMemo, useState } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import {
  datesInRange,
  isRestDay,
  listStudyDays,
  previewRestImpact,
  projectedFinish,
} from '../utils/schedule.js'

function fmt(dateStr) {
  return format(parseISO(dateStr), 'MMM d')
}

// One impact row: "JS now finishes Oct 18 (3 days late)".
function ImpactRow({ name, before, after, end }) {
  const late = differenceInCalendarDays(parseISO(after), parseISO(end))
  return (
    <p className="text-[13px]">
      {name} now finishes {fmt(after)}{' '}
      {late > 0 ? (
        <span style={{ color: '#cf9a7e' }}>
          ({late} day{late === 1 ? '' : 's'} late) — raise daily hours or cut
          scope
        </span>
      ) : (
        <span className="text-muted">(on time, was {fmt(before)})</span>
      )}
    </p>
  )
}

export default function RestDayPicker({ settings, phases, dispatch, today }) {
  const [single, setSingle] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [lastAdded, setLastAdded] = useState(null)

  const upcomingDays = useMemo(
    () => [...(settings.restDays || [])].filter((d) => d >= today).sort(),
    [settings.restDays, today],
  )
  const ranges = settings.restRanges || []

  // True if any (non-apps) phase actually studies on this date.
  // Resting a non-study day (e.g. Oct 8, before the Oct 9 start) moves nothing.
  const isStudyDay = (dateStr) =>
    phases.some(
      (p) =>
        p.id !== 'apps' &&
        listStudyDays(p.start, p.end, settings).includes(dateStr),
    )
  const anythingLeft = phases.some(
    (p) => p.id !== 'apps' && p.items.some((i) => !i.done),
  )

  // Live "what if" preview for the date currently typed (before adding).
  const previewDates = useMemo(() => {
    const out = []
    if (single) out.push(single)
    if (rangeStart && rangeEnd) out.push(...datesInRange(rangeStart, rangeEnd))
    return [...new Set(out)].filter((d) => !isRestDay(d, settings)).sort()
  }, [single, rangeStart, rangeEnd, settings])
  const preview = useMemo(
    () => previewRestImpact(phases, settings, previewDates),
    [phases, settings, previewDates],
  )

  // Confirmation after adding: current finish lines for moved phases.
  const summary = useMemo(() => {
    if (!lastAdded) return []
    return phases
      .filter((p) => p.id !== 'apps')
      .map((p) => ({
        name: p.name,
        end: p.end,
        after: projectedFinish(p, settings, p.start),
        before: lastAdded.before[p.id] || null,
      }))
      .filter((r) => r.after && r.before && r.after !== r.before)
  }, [lastAdded, phases, settings])

  const snapshot = () => {
    const before = {}
    for (const p of phases) {
      if (p.id === 'apps') continue
      before[p.id] = projectedFinish(p, settings, p.start)
    }
    return before
  }

  const addSingle = () => {
    if (!single || isRestDay(single, settings)) return
    const before = snapshot()
    dispatch({ type: 'ADD_REST_DAY', date: single })
    setLastAdded({ date: single, before })
    setSingle('')
  }

  const addRange = () => {
    const days = datesInRange(rangeStart, rangeEnd).filter((d) => !isRestDay(d, settings))
    if (days.length === 0) return
    const before = snapshot()
    dispatch({ type: 'ADD_REST_RANGE', start: rangeStart, end: rangeEnd })
    setLastAdded({ date: rangeStart, endDate: rangeEnd, before })
    setRangeStart('')
    setRangeEnd('')
  }

  const addedLabel = lastAdded
    ? lastAdded.endDate
      ? `${fmt(lastAdded.date)} → ${fmt(lastAdded.endDate)}`
      : fmt(lastAdded.date)
    : ''
  // Did the last-added rest land on a real study day?
  const addedHitStudyDay = lastAdded
    ? lastAdded.endDate
      ? datesInRange(lastAdded.date, lastAdded.endDate).some(isStudyDay)
      : isStudyDay(lastAdded.date)
    : false

  const inputCls =
    'rounded-lg bg-raised border border-border px-3 py-2 text-[13px]'
  const dateStyle = { colorScheme: 'dark' }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
      <h3 className="text-[15px] font-medium">Rest days</h3>

      {!isRestDay(today, settings) ? (
        <button
          type="button"
          onClick={() => {
            const before = snapshot()
            dispatch({ type: 'ADD_REST_DAY', date: today })
            setLastAdded({ date: today, before })
          }}
          className="mt-3 rounded-xl border border-border bg-raised px-4 py-2.5 text-[14px] text-muted hover:text-text"
        >
          Take today off
        </button>
      ) : (
        <p className="mt-3 text-[13px] text-muted">
          Today is marked as rest.{' '}
          <button
            type="button"
            onClick={() => dispatch({ type: 'REMOVE_REST_DAY', date: today })}
            className="underline hover:text-text"
          >
            Study anyway
          </button>
        </p>
      )}

      {(upcomingDays.length > 0 || ranges.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {upcomingDays.map((d) => (
            <span
              key={d}
              className="rounded-full bg-raised px-3 py-1 font-mono text-[12px] text-muted"
            >
              {fmt(d)}{' '}
              <button
                type="button"
                aria-label={`Remove rest day ${d}`}
                onClick={() => dispatch({ type: 'REMOVE_REST_DAY', date: d })}
                className="ml-1 hover:text-text"
              >
                ×
              </button>
            </span>
          ))}
          {ranges.map((r, idx) => (
            <span
              key={`${r.start}-${r.end}-${idx}`}
              className="rounded-full bg-raised px-3 py-1 font-mono text-[12px] text-muted"
            >
              {fmt(r.start)} → {fmt(r.end)}{' '}
              <button
                type="button"
                aria-label={`Remove rest range ${r.start} to ${r.end}`}
                onClick={() => dispatch({ type: 'REMOVE_REST_RANGE', index: idx })}
                className="ml-1 hover:text-text"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-[12px] text-muted">
          Day
          <input
            type="date"
            value={single}
            onChange={(e) => setSingle(e.target.value)}
            className={`ml-2 ${inputCls}`}
            style={dateStyle}
          />
        </label>
        <button
          type="button"
          onClick={addSingle}
          className="rounded-lg px-3 py-2 text-[13px] bg-raised border border-border"
        >
          Add rest day
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-[12px] text-muted">
          From
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className={`ml-2 ${inputCls}`}
            style={dateStyle}
          />
        </label>
        <label className="text-[12px] text-muted">
          To
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className={`ml-2 ${inputCls}`}
            style={dateStyle}
          />
        </label>
        <button
          type="button"
          onClick={addRange}
          className="rounded-lg px-3 py-2 text-[13px] bg-raised border border-border"
        >
          Add range
        </button>
      </div>

      {preview.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[12px] text-muted mb-1">If you rest:</p>
          {preview.map((r) => (
            <ImpactRow key={r.phaseId} {...r} />
          ))}
        </div>
      )}
      {previewDates.length > 0 && preview.length === 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[13px] text-muted">
            {previewDates.map(fmt).join(', ')} — not{' '}
            {previewDates.length === 1 ? 'a' : ''} study day
            {previewDates.length === 1 ? '' : 's'}, so resting{' '}
            {previewDates.length === 1 ? 'it' : 'them'} changes nothing.
          </p>
        </div>
      )}

      {lastAdded && (
        <div className="mt-3 border-t border-border pt-3">
          {summary.length > 0 ? (
            <>
              <p className="text-[12px] text-muted mb-1">
                Rested {addedLabel}:
              </p>
              {summary.map((r) => (
                <ImpactRow key={r.name} {...r} />
              ))}
            </>
          ) : (
            <p className="text-[13px] text-muted">
              Rested {addedLabel} —{' '}
              {!anythingLeft
                ? 'everything is done, so nothing moves.'
                : !addedHitStudyDay
                  ? 'not a study day, so nothing moves. Your plan is unchanged.'
                  : 'finishes unchanged.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
