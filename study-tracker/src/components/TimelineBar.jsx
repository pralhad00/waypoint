// One timeline row: phase bar positioned by dates, filled by progress.
// Hollow marker when projected finish runs past the planned end.
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { COLOR_HEX } from '../utils/colors.js'
import { phaseHours } from '../utils/progress.js'
import { phaseStatus } from '../utils/status.js'

export default function TimelineBar({
  phase,
  settings,
  rangeStart,
  span,
  restPositions,
  todayPos,
  showToday,
}) {
  const colorHex = COLOR_HEX[phase.color] || '#7fa7c9'
  const { percent } = phaseHours(phase)
  const st = phaseStatus(phase, settings)

  const left = (differenceInCalendarDays(parseISO(phase.start), parseISO(rangeStart)) / span) * 100
  const width =
    ((differenceInCalendarDays(parseISO(phase.end), parseISO(phase.start)) + 1) / span) * 100

  // Projected marker position, clamped to the visible range.
  const rawMarker = st.projected
    ? (differenceInCalendarDays(parseISO(st.projected), parseISO(rangeStart)) / span) * 100
    : null
  const marker = rawMarker == null ? null : Math.min(100, Math.max(0, rawMarker))

  return (
    <Link
      to={`/topic/${phase.id}`}
      className="grid items-center gap-3 hover:opacity-90"
      style={{ gridTemplateColumns: '110px 1fr' }}
    >
      <span className="text-[13px] truncate">{phase.name}</span>
      <div className="relative h-8 rounded-lg bg-raised overflow-hidden">
        {/* rest-day shading */}
        {restPositions.map((pos, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0"
            style={{ left: `${pos}%`, width: `${100 / span}%`, minWidth: 2, background: '#1a1c2388' }}
            title="Rest day"
          />
        ))}
        {/* phase window */}
        <div
          className="absolute top-1 bottom-1 rounded-md"
          style={{ left: `${left}%`, width: `${width}%`, background: `${colorHex}44` }}
        >
          <div
            className="h-full rounded-md"
            style={{ width: `${Math.min(100, percent)}%`, background: colorHex }}
          />
        </div>
        {/* today line */}
        {showToday && (
          <div
            className="absolute top-0 bottom-0"
            style={{ left: `${todayPos}%`, width: 2, background: '#e3e1dc' }}
            title="Today"
          />
        )}
        {/* hollow late marker */}
        {st.isLate && marker != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-transparent border-2"
            style={{ left: `${marker}%`, borderColor: '#cf9a7e', background: '#1a1c23' }}
            title={`Projected finish ${format(parseISO(st.projected), 'MMM d')} (late)`}
          />
        )}
        {/* dates + percent */}
        <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-text">
          {Math.round(percent)}%
        </span>
      </div>
    </Link>
  )
}
