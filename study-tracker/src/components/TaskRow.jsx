// One checklist row.
// Locked items (JS 50h) show "Already completed", no checkbox.
// Hours editable only in edit mode for locked rows.
import { useState } from 'react'

export default function TaskRow({
  item,
  colorHex,
  onToggle,
  onUpdate,
  onDelete,
  onMove,
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})

  const startEdit = () => {
    setForm({
      title: item.title,
      module: item.module,
      mustKnow: item.mustKnow || '',
      hours: String(item.hours),
      note: item.note || '',
    })
    setEditing(true)
  }

  const saveEdit = () => {
    const hours = parseFloat(form.hours)
    if (!form.title.trim() || Number.isNaN(hours) || hours < 0) return
    if (item.locked) {
      // Locked: only hours can change.
      onUpdate({ hours })
    } else {
      onUpdate({
        title: form.title.trim(),
        module: form.module.trim() || 'General',
        mustKnow: form.mustKnow.trim(),
        hours,
        note: form.note.trim(),
      })
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-raised p-4">
        {item.locked ? (
          <p className="text-[12px] text-muted mb-2">
            Already completed — only hours can be edited.
          </p>
        ) : (
          <>
            <input
              className="w-full mb-2 rounded-lg bg-surface border border-border px-3 py-2 text-[14px]"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title"
            />
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 rounded-lg bg-surface border border-border px-3 py-2 text-[13px]"
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                placeholder="Module"
              />
              <input
                className="w-24 rounded-lg bg-surface border border-border px-3 py-2 text-[13px] font-mono"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                placeholder="1.5"
                inputMode="decimal"
              />
            </div>
            <input
              className="w-full mb-2 rounded-lg bg-surface border border-border px-3 py-2 text-[13px]"
              value={form.mustKnow}
              onChange={(e) => setForm({ ...form, mustKnow: e.target.value })}
              placeholder="Must know"
            />
            <input
              className="w-full mb-3 rounded-lg bg-surface border border-border px-3 py-2 text-[13px]"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Note or link"
            />
          </>
        )}
        {item.locked && (
          <input
            className="w-24 mb-3 rounded-lg bg-surface border border-border px-3 py-2 text-[13px] font-mono"
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
            placeholder="50"
            inputMode="decimal"
          />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveEdit}
            className="rounded-lg px-3 py-1.5 text-[13px] bg-surface border border-border hover:bg-raised"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-1.5 text-[13px] text-muted hover:text-text"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-border bg-surface p-4 flex gap-3 ${
        item.done ? 'opacity-70' : ''
      }`}
    >
      {item.locked ? (
        <span className="mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[12px] bg-raised text-muted">
          Already completed
        </span>
      ) : (
        <button
          type="button"
          role="checkbox"
          aria-checked={item.done}
          aria-label={item.title}
          onClick={onToggle}
          className="mt-0.5 h-5 w-5 shrink-0 rounded-md border border-border flex items-center justify-center"
          style={item.done ? { background: colorHex, borderColor: colorHex } : undefined}
        >
          {item.done && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6.5 4.8 9 10 3.5"
                stroke="#1a1c23"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p
            className={`text-[14px] font-medium flex-1 ${
              item.done ? 'line-through text-muted' : ''
            }`}
          >
            {item.title}
          </p>
          <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 font-mono text-[12px] text-muted">
            {item.hours}h
          </span>
        </div>

        {item.status === 'in-progress' && !item.done && (
          <span className="inline-block mt-1 rounded-full px-2 py-0.5 text-[12px] bg-raised">
            In progress
          </span>
        )}

        {item.mustKnow && (
          <details className="mt-1">
            <summary className="cursor-pointer text-[12px] text-muted">
              Must know
            </summary>
            <p className="mt-1 text-[13px] text-muted">{item.mustKnow}</p>
          </details>
        )}
        {item.note && <p className="mt-1 text-[13px] text-muted">{item.note}</p>}

        <div className="mt-2 flex gap-3 text-[12px] text-muted">
          <button type="button" onClick={startEdit} className="hover:text-text">
            Edit
          </button>
          {!item.locked && (
            <>
              <button type="button" onClick={() => onMove(-1)} className="hover:text-text">
                Up
              </button>
              <button type="button" onClick={() => onMove(1)} className="hover:text-text">
                Down
              </button>
              <button type="button" onClick={onDelete} className="hover:text-text">
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
