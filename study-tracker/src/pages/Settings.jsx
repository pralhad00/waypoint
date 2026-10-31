// Settings: budget, deadline, phase dates, rest days, backup, reset.
// Export downloads JSON (use it to move data when deploying).
// Import restores it. Reset needs confirmation.
import { useEffect, useRef, useState } from 'react'
import RestDayPicker from '../components/RestDayPicker.jsx'
import { useStudy } from '../store/StudyContext.jsx'
import { STORAGE_KEY } from '../store/StudyContext.jsx'
import { todayKey } from '../utils/schedule.js'

const inputCls =
  'rounded-lg bg-raised border border-border px-3 py-2 text-[14px]'
const dateStyle = { colorScheme: 'dark' }

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="text-[15px] font-medium mb-3">{title}</h3>
      {children}
    </section>
  )
}

export default function Settings() {
  const { state, dispatch } = useStudy()
  const { settings, phases } = state
  const [notice, setNotice] = useState('')
  const fileRef = useRef(null)

  // Budget draft: commits on blur or Enter, Escape reverts.
  // Invalid values show a hint and snap back to the saved value.
  const [hoursDraft, setHoursDraft] = useState(String(settings.dailyHours))
  const [hoursError, setHoursError] = useState('')
  useEffect(() => {
    setHoursDraft(String(settings.dailyHours))
    setHoursError('')
  }, [settings.dailyHours])

  const commitHours = () => {
    const v = parseFloat(hoursDraft)
    if (Number.isNaN(v) || v < 0.5 || v > 12) {
      setHoursError('Enter 0.5 – 12')
      setHoursDraft(String(settings.dailyHours))
      return
    }
    setHoursError('')
    const rounded = Math.round(v * 10) / 10
    if (rounded !== settings.dailyHours) {
      dispatch({ type: 'UPDATE_SETTINGS', patch: { dailyHours: rounded } })
    }
    setHoursDraft(String(rounded))
  }

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `study-tracker-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setNotice('Backup downloaded.')
  }

  const importBackup = (file) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (!data || data.version !== 1 || !Array.isArray(data.phases)) {
          setNotice('That file is not a Study Tracker backup.')
          return
        }
        dispatch({ type: 'IMPORT_DATA', data })
        setNotice('Backup restored.')
      } catch {
        setNotice('Could not read that file.')
      }
    }
    reader.readAsText(file)
  }

  const resetAll = () => {
    if (
      window.confirm(
        'Reset to default checklists? Your progress will be erased.',
      )
    ) {
      dispatch({ type: 'RESET_DEFAULTS' })
      setNotice('Reset to defaults.')
    }
  }

  return (
    <div>
      <h2 className="text-[28px] font-semibold mb-1">Settings</h2>
      <p className="font-mono text-[12px] text-muted mb-4">
        stored as {STORAGE_KEY} in this browser
      </p>

      {notice && (
        <p className="mb-4 rounded-xl border border-border bg-surface px-4 py-2.5 text-[13px]">
          {notice}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Section title="Daily budget">
          <label className="text-[13px] text-muted">
            Hours per day{' '}
            <input
              type="number"
              min="0.5"
              max="12"
              step="0.5"
              value={hoursDraft}
              onChange={(e) => {
                setHoursDraft(e.target.value)
                if (hoursError) setHoursError('')
              }}
              onBlur={commitHours}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.target.blur()
                if (e.key === 'Escape') {
                  setHoursDraft(String(settings.dailyHours))
                  setHoursError('')
                  e.target.blur()
                }
              }}
              aria-invalid={hoursError ? true : undefined}
              className={`ml-2 w-24 font-mono ${inputCls}`}
            />
          </label>
          {hoursError ? (
            <p className="mt-1 text-[12px]" style={{ color: '#cf9a7e' }}>
              {hoursError} — kept {settings.dailyHours}h.
            </p>
          ) : (
            <p className="mt-1 text-[12px] text-muted">
              Today's hour budget and projected finishes use this.
            </p>
          )}
        </Section>

        <Section title="Deadline">
          <label className="text-[13px] text-muted">
            Overall deadline{' '}
            <input
              type="date"
              value={settings.deadline}
              onChange={(e) =>
                e.target.value &&
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  patch: { deadline: e.target.value },
                })
              }
              className={`ml-2 font-mono ${inputCls}`}
              style={dateStyle}
            />
          </label>
        </Section>

        <Section title="Phase dates">
          <div className="flex flex-col gap-3">
            {phases.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-2">
                <span className="w-28 text-[14px]">{p.name}</span>
                <input
                  type="date"
                  aria-label={`${p.name} start`}
                  value={p.start}
                  onChange={(e) =>
                    e.target.value &&
                    dispatch({
                      type: 'UPDATE_PHASE',
                      phaseId: p.id,
                      patch: { start: e.target.value },
                    })
                  }
                  className={`font-mono text-[13px] ${inputCls}`}
                  style={dateStyle}
                />
                <span className="text-muted">→</span>
                <input
                  type="date"
                  aria-label={`${p.name} end`}
                  value={p.end}
                  onChange={(e) =>
                    e.target.value &&
                    dispatch({
                      type: 'UPDATE_PHASE',
                      phaseId: p.id,
                      patch: { end: e.target.value },
                    })
                  }
                  className={`font-mono text-[13px] ${inputCls}`}
                  style={dateStyle}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted">
            Status chips, projected finishes and the timeline follow these dates.
          </p>
        </Section>

        <RestDayPicker
          settings={settings}
          phases={phases}
          dispatch={dispatch}
          today={todayKey()}
        />

        <Section title="Backup">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportBackup}
              className="rounded-xl border border-border bg-raised px-4 py-2 text-[14px]"
            >
              Export backup (JSON)
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border border-border bg-raised px-4 py-2 text-[14px]"
            >
              Import backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files[0]) importBackup(e.target.files[0])
                e.target.value = ''
              }}
            />
          </div>
          <p className="mt-2 text-[12px] text-muted">
            Export before deploying, then import on the live URL to move your
            data (localStorage is per-URL).
          </p>
        </Section>

        <Section title="Danger zone">
          <button
            type="button"
            onClick={resetAll}
            className="rounded-xl border border-border px-4 py-2 text-[14px]"
            style={{ color: '#cf9a7e' }}
          >
            Reset to default checklists
          </button>
        </Section>
      </div>
    </div>
  )
}
