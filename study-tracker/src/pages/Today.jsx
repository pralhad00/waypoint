// Today view: you choose what to study — nothing is auto-assigned.
// Each day starts empty; picks are stored per date under the localStorage key
// "todayPlans" (see src/utils/todayPlans.js). Old saves still load: the plans
// key is separate from studyTracker.v1 and everything in it is sanitized.
// Checking a topic pick dispatches the same TOGGLE_DONE as the topic page, so
// the topic progress bar and hours update too.
// src/utils/schedule.js no longer builds this queue — it only feeds projected
// finishes and status chips elsewhere (its date/rest helpers are still used).
import { useEffect, useMemo, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import RestDayPicker from '../components/RestDayPicker.jsx'
import { COLOR_HEX } from '../utils/colors.js'
import { useStudy } from '../store/StudyContext.jsx'
import { useTodayPlans } from '../hooks/useTodayPlans.js'
import { isRestDay, todayKey, toKey } from '../utils/schedule.js'
import {
  makeCustomEntry,
  makeTopicEntry,
  pickableItems,
  planHours,
  resolveEntry,
  topicEntryId,
} from '../utils/todayPlans.js'

const round1 = (n) => Math.round(n * 10) / 10

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

function Tick() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 6.5 4.8 9 10 3.5"
        stroke="#1a1c23"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="task-tick"
      />
    </svg>
  )
}

function Checkbox({ checked, label, colorHex, onToggle }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className="mt-0.5 h-5 w-5 shrink-0 rounded-md border border-border flex items-center justify-center"
      style={checked ? { background: colorHex || '#e3e1dc', borderColor: colorHex || '#e3e1dc' } : undefined}
    >
      {checked && <Tick />}
    </button>
  )
}

// One row of today's picks: check, reorder, remove, move to tomorrow.
function PickRow({ pick, index, count, onToggle, onMove, onRemove, onTomorrow }) {
  const colorHex = pick.phase ? COLOR_HEX[pick.phase.color] : '#e3e1dc'
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex gap-3">
      <Checkbox
        checked={pick.done}
        label={pick.title}
        colorHex={colorHex}
        onToggle={onToggle}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className={`text-[14px] font-medium flex-1 ${pick.done ? 'line-through text-muted' : ''}`}>
            {pick.title}
          </p>
          <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 font-mono text-[12px] text-muted">
            {pick.hours > 0 ? `${pick.hours}h` : '—'}
          </span>
        </div>
        <p className="mt-1 font-mono text-[12px] text-muted">
          {pick.phase ? (
            <Link to={`/topic/${pick.phaseId}`} className="hover:text-text">
              {pick.phase.name}
            </Link>
          ) : (
            'Custom task'
          )}
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-muted">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="hover:text-text disabled:opacity-40">
            Up
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            className="hover:text-text disabled:opacity-40"
          >
            Down
          </button>
          <button type="button" onClick={onTomorrow} className="hover:text-text">
            Move to tomorrow
          </button>
          <button type="button" onClick={onRemove} className="hover:text-text">
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

// Picker: every topic's OPEN tasks (done === false), grouped by topic, plus
// custom tasks. Selections are local until you press "Add": browsing and
// ticking never writes to todayPlans, and `done` is never read or written to
// represent a selection. Tasks already in today's plan show "Added" (disabled);
// completed tasks are not offered at all.
function TaskPicker({ phases, addedIds, onAdd, onClose, planned, budget }) {
  const [picked, setPicked] = useState([]) // staged topic entries
  const [customs, setCustoms] = useState([]) // staged custom entries
  const [title, setTitle] = useState('')
  const [hours, setHours] = useState('')

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pickedIds = useMemo(() => new Set(picked.map((e) => e.id)), [picked])

  const groups = useMemo(
    () =>
      phases
        .filter((p) => p.id !== 'apps') // Applications keeps its own section, outside the budget.
        .map((phase) => {
          const open = pickableItems(phase)
          const suggested = open.find(
            (i) =>
              !addedIds.has(topicEntryId(phase.id, i.id)) &&
              !pickedIds.has(topicEntryId(phase.id, i.id)),
          )
          const ordered = suggested
            ? [suggested, ...open.filter((i) => i.id !== suggested.id)]
            : open
          return { phase, ordered, suggestedId: suggested?.id || null }
        }),
    [phases, addedIds, pickedIds],
  )

  // Staging only — nothing reaches todayPlans until Add is pressed.
  const togglePick = (phase, item) => {
    const id = topicEntryId(phase.id, item.id)
    setPicked((prev) =>
      prev.some((e) => e.id === id)
        ? prev.filter((e) => e.id !== id)
        : [...prev, makeTopicEntry(phase, item)],
    )
  }

  const stageCustom = () => {
    if (!title.trim()) return
    setCustoms((prev) => [...prev, makeCustomEntry(title, hours)])
    setTitle('')
    setHours('')
  }

  const removeCustom = (id) => setCustoms((prev) => prev.filter((e) => e.id !== id))

  const selectedCount = picked.length + customs.length
  const commit = () => {
    onAdd([...picked, ...customs])
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26, 28, 35, 0.78)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add tasks for today"
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[18px] font-semibold">Add tasks</h3>
            <p className="mt-1 text-[13px] text-muted">
              Tick what you want to study today. Suggestions are just a nudge.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2.5 py-1 text-[13px] text-muted hover:text-text bg-raised"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {groups.map(({ phase, ordered, suggestedId }) => (
            <section key={phase.id} className="mb-5">
              <h4 className="flex items-center gap-2 text-[13px] font-semibold text-muted">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: COLOR_HEX[phase.color] || '#7fa7c9' }}
                  aria-hidden="true"
                />
                {phase.name}
              </h4>
              {ordered.length === 0 && (
                <p className="mt-2 text-[13px] text-muted">Nothing left here — all done.</p>
              )}
              <div className="mt-2 flex flex-col gap-1.5">
                {ordered.map((item) => {
                  const id = topicEntryId(phase.id, item.id)
                  const added = addedIds.has(id)
                  const checked = pickedIds.has(id)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-disabled={added}
                      disabled={added}
                      onClick={() => togglePick(phase, item)}
                      className={`flex items-center gap-3 rounded-lg border border-border bg-raised px-3 py-2 text-left ${
                        added ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface'
                      }`}
                    >
                      <span
                        className="h-4 w-4 shrink-0 rounded-md border border-border flex items-center justify-center"
                        style={
                          checked
                            ? { background: COLOR_HEX[phase.color] || '#e3e1dc', borderColor: COLOR_HEX[phase.color] }
                            : undefined
                        }
                      >
                        {checked && <Tick />}
                      </span>
                      <span className={`flex-1 min-w-0 text-[14px] ${checked ? 'text-muted' : ''}`}>
                        {item.title}
                      </span>
                      {added ? (
                        <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">
                          Added
                        </span>
                      ) : (
                        item.id === suggestedId && (
                          <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">
                            Suggested
                          </span>
                        )
                      )}
                      <span className="shrink-0 font-mono text-[12px] text-muted">{item.hours}h</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}

          <section className="rounded-xl border border-border bg-raised p-4">
            <h4 className="text-[13px] font-semibold">Custom task</h4>
            <p className="mt-0.5 text-[12px] text-muted">
              Not part of any topic checklist.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 min-w-0 rounded-lg bg-surface border border-border px-3 py-2 text-[14px]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && stageCustom()}
                placeholder="Title"
              />
              <input
                className="w-20 rounded-lg bg-surface border border-border px-3 py-2 text-[13px] font-mono"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && stageCustom()}
                placeholder="h"
                inputMode="decimal"
              />
              <button
                type="button"
                onClick={stageCustom}
                disabled={!title.trim()}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] disabled:opacity-40"
              >
                Add
              </button>
            </div>
            {customs.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {customs.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-2 text-[13px]"
                  >
                    <span className="flex-1 min-w-0 truncate">{c.title}</span>
                    <span className="shrink-0 font-mono text-[12px] text-muted">
                      {c.hours > 0 ? `${c.hours}h` : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCustom(c.id)}
                      aria-label={`Remove ${c.title}`}
                      className="shrink-0 text-muted hover:text-text"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="font-mono text-[12px] text-muted">
            {planned}h planned / {budget}h
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-[14px] text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={selectedCount === 0}
              className="rounded-xl bg-raised border border-border px-4 py-2 text-[14px] disabled:opacity-40"
            >
              Add{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Today() {
  const { state, dispatch } = useStudy()
  const { phases, settings } = state
  const today = todayKey()
  const rest = isRestDay(today, settings)
  const [plans, updatePlans] = useTodayPlans()
  const [pickerOpen, setPickerOpen] = useState(false)

  const phasesById = useMemo(() => new Map(phases.map((p) => [p.id, p])), [phases])

  // Today's picks, resolved against live topic data (title/hours/done).
  const picks = useMemo(
    () => (plans[today] || []).map((e) => resolveEntry(e, phasesById)).filter(Boolean),
    [plans, today, phasesById],
  )

  const addedIds = useMemo(
    () => new Set((plans[today] || []).map((e) => e.id)),
    [plans, today],
  )

  // Carried over: unfinished picks from earlier dates, calm and droppable.
  const carried = useMemo(() => {
    const out = []
    const seen = new Set(addedIds)
    const dates = Object.keys(plans)
      .filter((d) => d < today)
      .sort()
      .reverse()
    for (const date of dates) {
      for (const raw of plans[date]) {
        if (seen.has(raw.id)) continue
        const resolved = resolveEntry(raw, phasesById)
        if (!resolved || resolved.done) continue
        seen.add(raw.id)
        out.push({ date, pick: resolved })
      }
    }
    return out
  }, [plans, today, phasesById, addedIds])

  const budget = settings.dailyHours
  const planned = planHours(picks)
  const doneHours = planHours(picks.filter((p) => p.done))
  const overBy = Math.max(0, round1(planned - budget))

  // --- plan actions -------------------------------------------------------

  // Commit the picker's staged selections. This only appends plan ids — it
  // never reads or writes an item's `done`, so completion can't change here.
  const addEntries = (entries) => {
    if (!entries || entries.length === 0) return
    updatePlans((p) => {
      const list = p[today] || []
      const have = new Set(list.map((e) => e.id))
      const fresh = entries.filter((e) => !have.has(e.id))
      if (fresh.length === 0) return p
      return { ...p, [today]: [...list, ...fresh] }
    })
  }

  // Topic picks toggle the shared store (progress bar + hours follow).
  // Custom picks toggle their own entry for that date.
  const togglePick = (pick, date = today) => {
    if (pick.kind === 'topic') {
      dispatch({ type: 'TOGGLE_DONE', phaseId: pick.phaseId, itemId: pick.itemId })
      return
    }
    updatePlans((p) => ({
      ...p,
      [date]: (p[date] || []).map((e) => (e.id === pick.id ? { ...e, done: !e.done } : e)),
    }))
  }

  // Move by id: the rendered list can skip entries whose task was deleted,
  // so positions in `picks` are not always positions in the stored plan.
  const movePick = (pick, direction) => {
    updatePlans((p) => {
      const list = [...(p[today] || [])]
      const index = list.findIndex((e) => e.id === pick.id)
      const next = index + direction
      if (index < 0 || next < 0 || next >= list.length) return p
      const [moved] = list.splice(index, 1)
      list.splice(next, 0, moved)
      return { ...p, [today]: list }
    })
  }

  const removePick = (pick) => {
    updatePlans((p) => ({ ...p, [today]: (p[today] || []).filter((e) => e.id !== pick.id) }))
  }

  const moveToTomorrow = (pick) => {
    const tomorrow = toKey(addDays(parseISO(today), 1))
    updatePlans((p) => {
      const dest = (p[tomorrow] || []).filter((e) => e.id !== pick.id)
      return {
        ...p,
        [today]: (p[today] || []).filter((e) => e.id !== pick.id),
        [tomorrow]: [...dest, pick],
      }
    })
  }

  // Carried over: keep = add to today's picks, drop = let it go entirely.
  const keepCarried = (pick) => {
    updatePlans((p) => ({
      ...p,
      [today]: [...(p[today] || []).filter((e) => e.id !== pick.id), pick],
    }))
  }

  const dropCarried = (date, pick) => {
    updatePlans((p) => ({ ...p, [date]: (p[date] || []).filter((e) => e.id !== pick.id) }))
  }

  const appsPhase = phases.find((p) => p.id === 'apps')
  const appsOpen = (appsPhase?.items || []).filter((i) => !i.done).slice(0, 5)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold">
            Today · {format(new Date(), 'EEE, MMM d')}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            You choose what to study — nothing is pre-assigned.
          </p>
          {!rest && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-3 rounded-xl border border-border bg-raised px-4 py-2 text-[14px] hover:bg-surface"
            >
              + Add task
            </button>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Ring done={planned} budget={budget} />
          <span className="text-[12px] text-muted">{doneHours}h done</span>
        </div>
      </div>

      {rest ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-[18px] font-semibold">Today is a rest day.</h3>
          <p className="mt-1 text-[14px] text-muted">
            Rest is part of the plan. Anything you picked today carries over on its own.
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: 'REMOVE_REST_DAY', date: today })}
            className="mt-4 rounded-xl border border-border bg-raised px-4 py-2 text-[14px]"
          >
            Study anyway
          </button>
        </div>
      ) : picks.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <p className="text-[15px]">Nothing planned yet.</p>
          <p className="mt-1 text-[13px] text-muted">
            Today starts empty — add the tasks you actually want to do.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[15px] font-medium">Your picks</h3>
            <span className="font-mono text-[12px] text-muted">
              {planned}h planned of {budget}h
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {picks.map((pick, index) => (
              <PickRow
                key={pick.id}
                pick={pick}
                index={index}
                count={picks.length}
                onToggle={() => togglePick(pick)}
                onMove={(direction) => movePick(pick, direction)}
                onRemove={() => removePick(pick)}
                onTomorrow={() => moveToTomorrow(pick)}
              />
            ))}
          </div>
          <p className="mt-2 text-[13px] text-muted">
            {overBy > 0
              ? `${planned}h planned — ${overBy}h over your ${budget}h budget. That's okay, take it at your pace.`
              : `${budget - planned}h left in your budget.`}
          </p>
        </div>
      )}

      {!rest && carried.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[15px] font-medium mb-1">Carried over</h3>
          <p className="text-[12px] text-muted mb-2">
            Left from earlier days — keep it or drop it, no rush.
          </p>
          <div className="flex flex-col gap-2">
            {carried.map(({ date, pick }) => {
              const colorHex = pick.phase ? COLOR_HEX[pick.phase.color] : '#e3e1dc'
              return (
                <div
                  key={`${date}:${pick.id}`}
                  className="rounded-xl border border-border bg-surface p-4 flex gap-3"
                >
                  <Checkbox
                    checked={pick.done}
                    label={pick.title}
                    colorHex={colorHex}
                    onToggle={() => togglePick(pick, date)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className="text-[14px] flex-1">{pick.title}</p>
                      <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 font-mono text-[12px] text-muted">
                        {pick.hours > 0 ? `${pick.hours}h` : '—'}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[12px] text-muted">
                      {pick.phase ? `${pick.phase.name} · ` : 'Custom task · '}
                      from {format(parseISO(date), 'EEE, MMM d')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-muted">
                      <button type="button" onClick={() => keepCarried(pick)} className="hover:text-text">
                        Keep for today
                      </button>
                      <button type="button" onClick={() => dropCarried(date, pick)} className="hover:text-text">
                        Drop
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
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

      {pickerOpen && (
        <TaskPicker
          phases={phases}
          addedIds={addedIds}
          onAdd={addEntries}
          onClose={() => setPickerOpen(false)}
          planned={planned}
          budget={budget}
        />
      )}
    </div>
  )
}
