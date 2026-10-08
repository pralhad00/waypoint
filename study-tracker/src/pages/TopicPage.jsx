// Topic detail: weighted progress + grouped checklist.
// Progress = checked hours / total hours. Bar updates on every toggle.
// Unchecking shows a small undo toast. Projected finish comes in Job 7.
import { useMemo, useRef, useState } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { Link, useParams } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar.jsx'
import StatusChip from '../components/StatusChip.jsx'
import TaskRow from '../components/TaskRow.jsx'
import { COLOR_HEX } from '../utils/colors.js'
import { useStudy } from '../store/StudyContext.jsx'
import { phaseStatus } from '../utils/status.js'

export default function TopicPage() {
  const { id } = useParams()
  const { state, dispatch } = useStudy()
  const phase = state.phases.find((p) => p.id === id)

  const [undo, setUndo] = useState(null)
  const undoTimer = useRef(null)

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ title: '', module: '', hours: '', mustKnow: '', note: '' })

  const stats = useMemo(() => {
    if (!phase) return null
    const total = phase.items.reduce((s, i) => s + i.hours, 0)
    const done = phase.items.filter((i) => i.done).reduce((s, i) => s + i.hours, 0)
    const count = phase.items.filter((i) => i.done).length
    return {
      total,
      done,
      left: Math.max(0, total - done),
      percent: total === 0 ? 0 : (done / total) * 100,
      count,
      totalCount: phase.items.length,
    }
  }, [phase])

  const groups = useMemo(() => {
    if (!phase) return []
    const order = []
    const map = new Map()
    for (const item of phase.items) {
      const key = item.module || 'General'
      if (!map.has(key)) {
        map.set(key, [])
        order.push(key)
      }
      map.get(key).push(item)
    }
    return order.map((m) => ({ module: m, items: map.get(m) }))
  }, [phase])

  if (!phase || !stats) {
    return (
      <div>
        <h2 className="text-[28px] font-semibold mb-2">Topic not found</h2>
        <Link to="/topics" className="text-[14px] text-muted hover:text-text">
          Back to Topics
        </Link>
      </div>
    )
  }

  const colorHex = COLOR_HEX[phase.color] || '#7fa7c9'
  const st = phaseStatus(phase, state.settings)
  const lateDays = st.projected
    ? differenceInCalendarDays(parseISO(st.projected), parseISO(phase.end))
    : 0

  const showUndo = (itemId) => {
    setUndo({ phaseId: phase.id, itemId })
    clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setUndo(null), 6000)
  }

  const handleToggle = (item) => {
    if (item.locked) return
    const wasDone = item.done
    dispatch({ type: 'TOGGLE_DONE', phaseId: phase.id, itemId: item.id })
    if (wasDone) showUndo(item.id) // unchecked -> offer undo
    else {
      setUndo(null)
      clearTimeout(undoTimer.current)
    }
  }

  const handleUndo = () => {
    if (!undo) return
    dispatch({ type: 'TOGGLE_DONE', phaseId: undo.phaseId, itemId: undo.itemId })
    setUndo(null)
    clearTimeout(undoTimer.current)
  }

  const handleAdd = () => {
    const hours = parseFloat(draft.hours)
    if (!draft.title.trim() || Number.isNaN(hours) || hours < 0) return
    dispatch({
      type: 'ADD_ITEM',
      phaseId: phase.id,
      item: {
        id: `${phase.id}-${Date.now()}`,
        module: draft.module.trim() || 'General',
        title: draft.title.trim(),
        mustKnow: draft.mustKnow.trim(),
        hours,
        done: false,
        doneAt: null,
        note: draft.note.trim(),
        status: 'todo',
        snoozedUntil: null,
        locked: false,
      },
    })
    setDraft({ title: '', module: '', hours: '', mustKnow: '', note: '' })
    setAdding(false)
  }

  const handleDelete = (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    dispatch({ type: 'DELETE_ITEM', phaseId: phase.id, itemId: item.id })
  }

  return (
    <div>
      <Link to="/topics" className="text-[13px] text-muted hover:text-text">
        ← Topics
      </Link>
      <div className="mt-2 flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ background: colorHex }}
          aria-hidden="true"
        />
        <h2 className="text-[28px] font-semibold">{phase.name}</h2>
      </div>
      <p className="mt-1 text-[13px] text-muted font-mono">
        {phase.start} → {phase.end}
      </p>

      <div className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between mb-3">
          <span className="font-mono text-[22px]">{Math.round(stats.percent)}%</span>
          <span className="font-mono text-[13px] text-muted">
            {stats.count}/{stats.totalCount} tasks · {stats.left}h left
          </span>
        </div>
        <ProgressBar percent={stats.percent} colorHex={colorHex} />
        <p className="mt-2 text-[13px] text-muted">
          {stats.done}h done · {stats.left}h left
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusChip status={st.status} />
          {stats.left > 0 && (
            <span className="text-[12px] text-muted">
              Needs {st.needs.toFixed(1)} h/day to finish on time
            </span>
          )}
        </div>
        {st.projected && !st.isLate && (
          <p className="mt-1 font-mono text-[12px] text-muted">
            Projected finish {format(parseISO(st.projected), 'MMM d')}
          </p>
        )}
        {st.isLate && (
          <p className="mt-1 text-[12px]" style={{ color: '#cf9a7e' }}>
            {phase.name} now finishes {format(parseISO(st.projected), 'MMM d')}{' '}
            ({lateDays} days late) — raise daily hours or cut scope
          </p>
        )}
      </div>

      {groups.length === 0 && (
        <p className="mt-6 text-[14px] text-muted">
          No tasks here yet. Add the first one below.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.module} className="mt-6">
          <h3 className="text-[15px] font-semibold mb-3 text-muted">{g.module}</h3>
          <div className="flex flex-col gap-2">
            {g.items.map((item) => (
              <TaskRow
                key={item.id}
                item={item}
                colorHex={colorHex}
                onToggle={() => handleToggle(item)}
                onUpdate={(patch) =>
                  dispatch({ type: 'UPDATE_ITEM', phaseId: phase.id, itemId: item.id, patch })
                }
                onDelete={() => handleDelete(item)}
                onMove={(direction) =>
                  dispatch({ type: 'MOVE_ITEM', phaseId: phase.id, itemId: item.id, direction })
                }
              />
            ))}
          </div>
        </section>
      ))}

      <div className="mt-6">
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[14px] hover:bg-raised"
          >
            + Add task
          </button>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <input
              className="w-full mb-2 rounded-lg bg-raised border border-border px-3 py-2 text-[14px]"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Title"
            />
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 rounded-lg bg-raised border border-border px-3 py-2 text-[13px]"
                value={draft.module}
                onChange={(e) => setDraft({ ...draft, module: e.target.value })}
                placeholder="Module"
              />
              <input
                className="w-24 rounded-lg bg-raised border border-border px-3 py-2 text-[13px] font-mono"
                value={draft.hours}
                onChange={(e) => setDraft({ ...draft, hours: e.target.value })}
                placeholder="1.5"
                inputMode="decimal"
              />
            </div>
            <input
              className="w-full mb-2 rounded-lg bg-raised border border-border px-3 py-2 text-[13px]"
              value={draft.mustKnow}
              onChange={(e) => setDraft({ ...draft, mustKnow: e.target.value })}
              placeholder="Must know (optional)"
            />
            <input
              className="w-full mb-3 rounded-lg bg-raised border border-border px-3 py-2 text-[13px]"
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="Note or link (optional)"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                className="rounded-lg px-3 py-1.5 text-[13px] bg-raised border border-border"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-lg px-3 py-1.5 text-[13px] text-muted hover:text-text"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {undo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl border border-border bg-raised px-4 py-2.5 text-[13px] flex items-center gap-3">
          <span>Unchecked. No stress.</span>
          <button type="button" onClick={handleUndo} className="font-medium underline">
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
