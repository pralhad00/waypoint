// Today view: one clear next task, no guilt.
// Applications live below, outside the daily budget.
// Queue = each phase's scheduled items for today (schedulePhase),
// concatenated in phase-start order. Apps excluded everywhere here.
import { useMemo } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import UpNextCard from '../components/UpNextCard.jsx'
import RestDayPicker from '../components/RestDayPicker.jsx'
import { COLOR_HEX } from '../utils/colors.js'
import { useStudy } from '../store/StudyContext.jsx'
import {
  isRestDay,
  nextStudyDay,
  schedulePhase,
  todayKey,
  toKey,
} from '../utils/schedule.js'

function Ring({ done, budget }) {
  const r = 26
  const c = 2 * Math.PI * r
  const frac = budget <= 0 ? 0 : Math.min(1, done / budget)
  return (
    <div className="flex items-center gap-3">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-raised" stroke="#2a2e39" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#e3e1dc"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 600ms ease', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <span className="font-mono text-[14px]">
        {done} / {budget}h
      </span>
    </div>
  )
}

export default function Today() {
  const { state, dispatch } = useStudy()
  const { phases, settings } = state
  const today = todayKey()
  const rest = isRestDay(today, settings)

  const byId = useMemo(() => {
    const map = new Map()
    for (const p of phases)
      for (const i of p.items) map.set(`${p.id}:${i.id}`, { phase: p, item: i })
    return map
  }, [phases])

  // Today's queue from each non-apps phase schedule, in phase-start order.
  const todays = useMemo(() => {
    if (rest) return []
    const ordered = [...phases]
      .filter((p) => p.id !== 'apps')
      .sort((a, b) => a.start.localeCompare(b.start))
    const out = []
    for (const p of ordered) {
      const plan = schedulePhase(p, settings, today)
      const entry = plan.find((d) => d.date === today)
      if (!entry) continue
      for (const id of entry.itemIds) {
        const found = byId.get(`${p.id}:${id}`)
        if (found && !found.item.done) out.push(found)
      }
    }
    return out
  }, [phases, settings, today, rest, byId])

  // Carried over: scheduled before today, still undone. Calm wording, no red.
  const carried = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const p of phases) {
      if (p.id === 'apps') continue
      const plan = schedulePhase(p, settings, p.start)
      for (const d of plan) {
        if (d.date >= today) break
        for (const id of d.itemIds) {
          const key = `${p.id}:${id}`
          const found = byId.get(key)
          if (found && !found.item.done && !seen.has(key)) {
            seen.add(key)
            out.push(found)
          }
        }
      }
    }
    // Hide items already covered by today's queue.
    const todayKeys = new Set(todays.map((t) => `${t.phase.id}:${t.item.id}`))
    return out.filter((t) => !todayKeys.has(`${t.phase.id}:${t.item.id}`))
  }, [phases, settings, today, byId, todays])

  const doneToday = useMemo(() => {
    let h = 0
    for (const p of phases) {
      if (p.id === 'apps') continue
      for (const i of p.items) {
        if (i.done && i.doneAt && i.doneAt.slice(0, 10) === today) h += i.hours
      }
    }
    return Math.round(h * 10) / 10
  }, [phases, today])

  const appsPhase = phases.find((p) => p.id === 'apps')
  const appsOpen = (appsPhase?.items || []).filter((i) => !i.done).slice(0, 5)

  const [upNext, ...restToday] = todays

  // Preview: when today has no work (e.g. before the Oct 9 start),
  // show the next date that does instead of a blank empty state.
  const preview = useMemo(() => {
    if (rest || todays.length > 0) return null
    const ordered = [...phases]
      .filter((p) => p.id !== 'apps')
      .sort((a, b) => a.start.localeCompare(b.start))
    let nextDate = null
    for (const p of ordered) {
      const entry = schedulePhase(p, settings, p.start).find(
        (d) => d.date >= today && d.itemIds.length > 0,
      )
      if (entry && (!nextDate || entry.date < nextDate)) nextDate = entry.date
    }
    if (!nextDate) return null
    const list = []
    for (const p of ordered) {
      const entry = schedulePhase(p, settings, p.start).find((d) => d.date === nextDate)
      if (!entry) continue
      for (const id of entry.itemIds) {
        const found = byId.get(`${p.id}:${id}`)
        if (found && !found.item.done) list.push(found)
      }
    }
    return list.length > 0 ? { date: nextDate, list } : null
  }, [rest, todays, phases, settings, today, byId])

  const snooze = (phaseId, itemId) => {
    const next = nextStudyDay(toKey(addDays(parseISO(today), 1)), settings)
    dispatch({ type: 'SNOOZE', phaseId, itemId, snoozedUntil: next })
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[28px] font-semibold">
            Today · {format(new Date(), 'EEE, MMM d')}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Minimum win: finish the first task.
          </p>
        </div>
        <Ring done={doneToday} budget={settings.dailyHours} />
      </div>

      {rest ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-[18px] font-semibold">Today is a rest day.</h3>
          <p className="mt-1 text-[14px] text-muted">
            Rest is part of the plan. Tasks shift forward on their own.
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: 'REMOVE_REST_DAY', date: today })}
            className="mt-4 rounded-xl border border-border bg-raised px-4 py-2 text-[14px]"
          >
            Study anyway
          </button>
        </div>
      ) : upNext ? (
        <>
          <div className="mt-6">
            <UpNextCard
              item={upNext.item}
              phaseName={upNext.phase.name}
              phaseId={upNext.phase.id}
              colorHex={COLOR_HEX[upNext.phase.color]}
              onStart={() =>
                dispatch({
                  type: 'SET_STATUS',
                  phaseId: upNext.phase.id,
                  itemId: upNext.item.id,
                  status: 'in-progress',
                })
              }
              onDone={() =>
                dispatch({
                  type: 'TOGGLE_DONE',
                  phaseId: upNext.phase.id,
                  itemId: upNext.item.id,
                })
              }
              onSnooze={() => snooze(upNext.phase.id, upNext.item.id)}
            />
          </div>

          {restToday.length > 0 && (
            <div className="mt-6">
              <h3 className="text-[15px] font-medium mb-2">Rest of today</h3>
              <div className="flex flex-col gap-2">
                {restToday.map(({ phase, item }) => (
                  <div
                    key={`${phase.id}:${item.id}`}
                    className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium">{item.title}</p>
                      <p className="font-mono text-[12px] text-muted">
                        {item.hours}h · {phase.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({ type: 'TOGGLE_DONE', phaseId: phase.id, itemId: item.id })
                      }
                      className="rounded-lg px-3 py-1.5 text-[13px] bg-raised border border-border"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={() => snooze(phase.id, item.id)}
                      className="text-[12px] text-muted hover:text-text"
                    >
                      Not today
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : preview ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-[18px] font-semibold">
            Plan starts {format(parseISO(preview.date), 'EEE, MMM d')}
          </h3>
          <p className="mt-1 text-[14px] text-muted">
            Nothing scheduled for today. First up:
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {preview.list.map(({ phase, item }) => (
              <div
                key={`${phase.id}:${item.id}`}
                className="rounded-xl border border-border bg-raised p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium">{item.title}</p>
                  <p className="font-mono text-[12px] text-muted">
                    {item.hours}h · {phase.name}
                  </p>
                </div>
                <Link
                  to={`/topic/${phase.id}`}
                  className="text-[12px] text-muted hover:text-text"
                >
                  Open →
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <p className="text-[15px]">Nothing left today. Nice.</p>
        </div>
      )}

      {carried.length > 0 && !rest && (
        <div className="mt-6">
          <h3 className="text-[15px] font-medium mb-1">Carried over</h3>
          <p className="text-[12px] text-muted mb-2">
            Left from earlier days — pick up whenever, no rush.
          </p>
          <div className="flex flex-col gap-2">
            {carried.slice(0, 5).map(({ phase, item }) => (
              <div
                key={`${phase.id}:${item.id}`}
                className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px]">{item.title}</p>
                  <p className="font-mono text-[12px] text-muted">
                    {item.hours}h · {phase.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    dispatch({ type: 'TOGGLE_DONE', phaseId: phase.id, itemId: item.id })
                  }
                  className="rounded-lg px-3 py-1.5 text-[13px] bg-raised border border-border"
                >
                  Done
                </button>
              </div>
            ))}
            {carried.length > 5 && (
              <p className="text-[12px] text-muted">+{carried.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      <RestDayPicker settings={settings} phases={phases} dispatch={dispatch} today={today} />

      {appsPhase && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-[15px] font-medium">Applications (optional)</h3>
          <p className="text-[12px] text-muted mb-3">
            Outside the daily budget. <Link to="/topic/apps" className="underline">Open list →</Link>
          </p>
          <div className="flex flex-col gap-2">
            {appsOpen.map((i) => (
              <div key={i.id} className="flex items-center gap-3 text-[14px]">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={false}
                  aria-label={i.title}
                  onClick={() =>
                    dispatch({ type: 'TOGGLE_DONE', phaseId: 'apps', itemId: i.id })
                  }
                  className="h-5 w-5 shrink-0 rounded-md border border-border"
                />
                <span className="flex-1">{i.title}</span>
                <span className="font-mono text-[12px] text-muted">{i.hours}h</span>
              </div>
            ))}
            {appsOpen.length === 0 && (
              <p className="text-[14px]">All applications done. Strong.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
