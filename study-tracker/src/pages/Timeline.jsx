// Timeline: all 5 phases across earliest start to Dec 7 deadline.
// Fill = progress. Today line, rest-day shading, Dec 7 flag, hollow late markers.
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import TimelineBar from '../components/TimelineBar.jsx'
import { useStudy } from '../store/StudyContext.jsx'
import { isRestDay, todayKey } from '../utils/schedule.js'

export default function Timeline() {
  const { state } = useStudy()
  const { phases, settings } = state

  const rangeStart = phases.reduce(
    (min, p) => (p.start < min ? p.start : min),
    phases[0]?.start || settings.deadline,
  )
  const rangeEnd = settings.deadline
  const span = Math.max(
    1,
    differenceInCalendarDays(parseISO(rangeEnd), parseISO(rangeStart)) + 1,
  )

  // Rest positions: every rest date inside the visible range.
  const restPositions = []
  for (let d = 0; d < span; d++) {
    const key = format(addDays(parseISO(rangeStart), d), 'yyyy-MM-dd')
    if (isRestDay(key, settings)) restPositions.push((d / span) * 100)
  }

  const today = todayKey()
  const showToday = today >= rangeStart && today <= rangeEnd
  const todayPos =
    (differenceInCalendarDays(parseISO(today), parseISO(rangeStart)) / span) * 100

  const ordered = [...phases].sort((a, b) => a.start.localeCompare(b.start))

  return (
    <div>
      <h2 className="text-[28px] font-semibold mb-1">Timeline</h2>
      <p className="font-mono text-[13px] text-muted mb-4">
        {format(parseISO(rangeStart), 'MMM d')} → {format(parseISO(rangeEnd), 'MMM d')} · Dec 7 deadline
      </p>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-[12px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-raised border border-border" />
            rest day
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-0.5 h-3.5" style={{ background: '#e3e1dc' }} />
            today
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full border-2"
              style={{ borderColor: '#cf9a7e' }}
            />
            projected finish (late)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-mono">⚑ Dec 7</span>
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {ordered.map((p) => (
            <TimelineBar
              key={p.id}
              phase={p}
              settings={settings}
              rangeStart={rangeStart}
              span={span}
              restPositions={restPositions}
              todayPos={todayPos}
              showToday={showToday}
            />
          ))}
        </div>

        <div
          className="grid gap-3 mt-2 text-[12px] text-muted"
          style={{ gridTemplateColumns: '110px 1fr' }}
        >
          <span />
          <div className="relative h-5">
            <span className="absolute left-0 font-mono">
              {format(parseISO(rangeStart), 'MMM d')}
            </span>
            <span className="absolute right-0 font-mono">⚑ Dec 7</span>
          </div>
        </div>
      </div>
    </div>
  )
}
