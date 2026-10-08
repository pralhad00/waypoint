// Hours-weighted progress. Pure: no dates, no UI.
// progress % = checked hours / total hours.
export function phaseHours(phase) {
  const items = phase?.items || []
  const total = items.reduce((s, i) => s + i.hours, 0)
  const done = items.filter((i) => i.done).reduce((s, i) => s + i.hours, 0)
  const doneCount = items.filter((i) => i.done).length
  return {
    total,
    done,
    left: Math.max(0, total - done),
    percent: total === 0 ? 0 : (done / total) * 100,
    doneCount,
    totalCount: items.length,
  }
}

// Overall across phases. Pass excludeIds ['apps'] if you want to skip apps.
export function overallHours(phases, excludeIds = []) {
  const list = (phases || []).filter((p) => !excludeIds.includes(p.id))
  const total = list.reduce((s, p) => s + phaseHours(p).total, 0)
  const done = list.reduce((s, p) => s + phaseHours(p).done, 0)
  return {
    total,
    done,
    left: Math.max(0, total - done),
    percent: total === 0 ? 0 : (done / total) * 100,
  }
}
