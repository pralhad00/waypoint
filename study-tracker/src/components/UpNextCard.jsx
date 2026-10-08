// Up-next card: exactly one big task. No choice fatigue.
// Start = mark in-progress + highlight only (no timer in V1).
import { Link } from 'react-router-dom'

export default function UpNextCard({
  item,
  phaseName,
  phaseId,
  colorHex,
  onStart,
  onDone,
  onSnooze,
}) {
  const active = item.status === 'in-progress'
  return (
    <div
      className="rounded-2xl border bg-surface p-6"
      style={{
        borderColor: active ? colorHex : undefined,
        borderWidth: active ? 2 : undefined,
      }}
    >
      <p className="text-[12px] text-muted mb-1">
        Up next · {phaseName}
        {active && <span className="ml-2">In progress</span>}
      </p>
      <h3 className="text-[20px] font-semibold">{item.title}</h3>
      {item.mustKnow && (
        <p className="mt-1 text-[13px] text-muted">{item.mustKnow}</p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[12px] text-muted">
          {item.hours}h
        </span>
        <Link
          to={`/topic/${phaseId}`}
          className="text-[12px] text-muted hover:text-text"
        >
          Open topic →
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!active && !item.done && (
          <button
            type="button"
            onClick={onStart}
            className="rounded-xl px-4 py-2 text-[14px] font-medium"
            style={{ background: `${colorHex}33` }}
          >
            Start
          </button>
        )}
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl px-4 py-2 text-[14px] font-medium bg-raised border border-border"
        >
          Mark done
        </button>
        <button
          type="button"
          onClick={onSnooze}
          className="rounded-xl px-4 py-2 text-[13px] text-muted hover:text-text"
        >
          Not today
        </button>
      </div>
    </div>
  )
}
