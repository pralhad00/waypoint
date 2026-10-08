// One dashboard card: dot, %, bar, tasks/hours, dates, status.
// Progress is hours-weighted: done hours / total hours.
// Status + projected finish come from src/utils/ (Job 6), computed here.
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { COLOR_HEX } from '../utils/colors.js'
import { phaseHours } from '../utils/progress.js'
import { phaseStatus } from '../utils/status.js'
import ProgressBar from './ProgressBar.jsx'
import StatusChip from './StatusChip.jsx'

export default function TopicCard({ phase, settings }) {
  const { total, done } = phaseHours(phase)
  const count = phase.items.filter((i) => i.done).length
  const percent = total === 0 ? 0 : (done / total) * 100
  const left = Math.max(0, total - done)
  const colorHex = COLOR_HEX[phase.color] || '#7fa7c9'
  const s = phaseStatus(phase, settings)
  const lateDays = s.projected
    ? differenceInCalendarDays(parseISO(s.projected), parseISO(phase.end))
    : 0

  return (
    <Link
      to={`/topic/${phase.id}`}
      className="block rounded-2xl border border-border bg-surface p-5 hover:bg-raised"
      style={{ transition: 'background 200ms ease' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-[15px] font-medium">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: colorHex }}
            aria-hidden="true"
          />
          {phase.name}
        </span>
        <StatusChip status={s.status} />
      </div>
      <p className="font-mono text-[20px] mb-2">{Math.round(percent)}%</p>
      <ProgressBar percent={percent} colorHex={colorHex} />
      <p className="mt-2 font-mono text-[12px] text-muted">
        {count}/{phase.items.length} tasks · {left}h left
      </p>
      <p className="mt-1 font-mono text-[12px] text-muted">
        {phase.start} → {phase.end}
      </p>
      {left > 0 && (
        <p className="mt-1 text-[12px] text-muted">
          Needs {s.needs.toFixed(1)} h/day to finish on time
        </p>
      )}
      {s.projected && !s.isLate && (
        <p className="mt-1 font-mono text-[12px] text-muted">
          Finishes {format(parseISO(s.projected), 'MMM d')}
        </p>
      )}
      {s.isLate && (
        <p className="mt-1 text-[12px]" style={{ color: '#cf9a7e' }}>
          Finishes {format(parseISO(s.projected), 'MMM d')} ({lateDays} days
          late) — raise daily hours or cut scope
        </p>
      )}
    </Link>
  )
}
