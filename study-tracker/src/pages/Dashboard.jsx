// Dashboard (home): first usable version.
// Header: days left until deadline + overall hours-weighted progress.
// 5 cards, Today card (your picks for today), mini timeline strip.
// No scheduling math here — plans come from the todayPlans storage.
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar.jsx'
import TopicCard from '../components/TopicCard.jsx'
import { COLOR_HEX } from '../utils/colors.js'
import { useStudy } from '../store/StudyContext.jsx'
import { useTodayPlans } from '../hooks/useTodayPlans.js'
import { todayKey } from '../utils/schedule.js'
import { planHours, resolveEntry } from '../utils/todayPlans.js'

export default function Dashboard() {
  const { state } = useStudy()
  const { phases, settings } = state
  const [plans] = useTodayPlans()

  const phasesById = useMemo(() => new Map(phases.map((p) => [p.id, p])), [phases])
  const picks = useMemo(
    () => (plans[todayKey()] || []).map((e) => resolveEntry(e, phasesById)).filter(Boolean),
    [plans, phasesById],
  )

  const total = phases.reduce(
    (s, p) => s + p.items.reduce((a, i) => a + i.hours, 0),
    0,
  )
  const done = phases.reduce(
    (s, p) => s + p.items.filter((i) => i.done).reduce((a, i) => a + i.hours, 0),
    0,
  )
  const percent = total === 0 ? 0 : (done / total) * 100

  const daysLeft = differenceInCalendarDays(parseISO(settings.deadline), new Date())
  const plannedHours = planHours(picks)

  // Mini strip: position each phase between the earliest start and deadline.
  const rangeStart = phases.reduce(
    (min, p) => (p.start < min ? p.start : min),
    phases[0]?.start || settings.deadline,
  )
  const rangeEnd = settings.deadline
  const totalDays = Math.max(
    1,
    differenceInCalendarDays(parseISO(rangeEnd), parseISO(rangeStart)) + 1,
  )
  const strip = phases.map((p) => {
    const leftDays = differenceInCalendarDays(parseISO(p.start), parseISO(rangeStart))
    const widthDays =
      differenceInCalendarDays(parseISO(p.end), parseISO(p.start)) + 1
    const pTotal = p.items.reduce((s, i) => s + i.hours, 0)
    const pDone = p.items.filter((i) => i.done).reduce((s, i) => s + i.hours, 0)
    return {
      id: p.id,
      name: p.name,
      colorHex: COLOR_HEX[p.color] || '#7fa7c9',
      left: Math.max(0, (leftDays / totalDays) * 100),
      width: Math.max(4, (widthDays / totalDays) * 100),
      fill: pTotal === 0 ? 0 : (pDone / pTotal) * 100,
    }
  })

  return (
    <div>
      <h2 className="text-[28px] font-semibold">
        {daysLeft} days left until Dec 7
      </h2>
      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[15px]">Overall progress</span>
          <span className="font-mono text-[18px]">{Math.round(percent)}%</span>
        </div>
        <ProgressBar percent={percent} colorHex="#e3e1dc" />
        <p className="mt-2 font-mono text-[12px] text-muted">
          {done}h done · {Math.max(0, total - done)}h left of {total}h
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 nav:grid-cols-2 lg:grid-cols-3 gap-4">
        {phases.map((p) => (
          <TopicCard key={p.id} phase={p} settings={settings} />
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[18px] font-semibold">Today</h3>
          <Link to="/today" className="text-[13px] text-muted hover:text-text">
            Open Today →
          </Link>
        </div>
        {picks.length > 0 ? (
          <p className="text-[14px]">
            <span className="font-medium">
              {picks.length} {picks.length === 1 ? 'task' : 'tasks'}
            </span>{' '}
            <span className="font-mono text-[12px] text-muted">
              {plannedHours}h planned
            </span>
          </p>
        ) : (
          <p className="text-[14px]">Nothing planned yet — choose your tasks.</p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-[15px] font-medium mb-3">Timeline strip</h3>
        <div className="flex flex-col gap-2">
          {strip.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-[12px] text-muted">{s.name}</span>
              <div className="relative flex-1 h-2 rounded-full bg-raised">
                <div
                  className="absolute h-full rounded-full"
                  style={{
                    left: `${s.left}%`,
                    width: `${s.width}%`,
                    background: `${s.colorHex}55`,
                  }}
                />
                <div
                  className="absolute h-full rounded-full"
                  style={{
                    left: `${s.left}%`,
                    width: `${(s.width * s.fill) / 100}%`,
                    background: s.colorHex,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
