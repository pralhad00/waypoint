// Sample-date checks for Job 6. No new library: uses node:test.
// Run: node --test src/utils/logic.test.js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_DATA } from '../data/defaultData.js'
import { overallHours, phaseHours } from './progress.js'
import {
  datesInRange,
  isRestDay,
  listStudyDays,
  needsPerDay,
  nextStudyDay,
  previewRestImpact,
  projectedFinish,
  schedulePhase,
} from './schedule.js'
import { phaseStatus } from './status.js'

const settings = {
  dailyHours: 2.5,
  deadline: '2026-12-07',
  restDays: ['2026-10-12'],
  restRanges: [],
}
const js = DEFAULT_DATA.phases.find((p) => p.id === 'js')
const apps = DEFAULT_DATA.phases.find((p) => p.id === 'apps')

describe('progress', () => {
  it('JS starts near 70% (50h locked done of 72h)', () => {
    const h = phaseHours(js)
    assert.equal(h.total, 72)
    assert.equal(h.done, 50)
    assert.ok(h.percent > 68 && h.percent < 71)
  })
  it('overall sums all phases', () => {
    const o = overallHours(DEFAULT_DATA.phases)
    assert.equal(o.total, 72 + 50.5 + 26.5 + 17 + 38.5)
  })
})

describe('schedule', () => {
  it('study days exclude rest days (Oct 9-15 minus Oct 12 = 6 days)', () => {
    assert.deepEqual(listStudyDays('2026-10-09', '2026-10-15', settings), [
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
    ])
  })
  it('JS overflows its end at 2.5h/day (22h left, 15h capacity)', () => {
    const projected = projectedFinish(js, settings, '2026-10-09')
    assert.ok(projected > '2026-10-15')
  })
  it('snoozed items skip today', () => {
    const phase = {
      ...js,
      items: js.items.map((i) =>
        i.id === 'js-01' ? { ...i, snoozedUntil: '2026-10-10' } : i,
      ),
    }
    const plan = schedulePhase(phase, settings, '2026-10-09')
    assert.ok(!plan[0].itemIds.includes('js-01'))
  })
  it('needs per day rises when time is short', () => {
    const need = needsPerDay(js, settings, '2026-10-09')
    assert.ok(need > 2.5) // 22h over 6 days
  })
  it('next study day skips rest', () => {
    assert.equal(nextStudyDay('2026-10-12', settings), '2026-10-13')
    assert.equal(isRestDay('2026-10-12', settings), true)
  })
})

describe('rest impact', () => {
  it('datesInRange lists inclusive days', () => {
    assert.deepEqual(datesInRange('2026-10-09', '2026-10-11'), [
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ])
    assert.deepEqual(datesInRange('2026-10-11', '2026-10-09'), [])
  })
  it('an extra rest day pushes JS finish later', () => {
    const plain = {
      dailyHours: 2.5,
      deadline: '2026-12-07',
      restDays: [],
      restRanges: [],
    }
    const impact = previewRestImpact([js], plain, ['2026-10-10'])
    assert.equal(impact.length, 1)
    assert.ok(impact[0].after > impact[0].before)
  })
  it('no extra days means no impact rows', () => {
    assert.deepEqual(previewRestImpact([js], settings, []), [])
  })
})

describe('status', () => {
  it('fresh JS on day 1 is ahead (69% actual vs ~17% expected)', () => {
    // Day 1: 1 of 6 study days elapsed -> expected ~17%, actual 69% -> ahead
    const s = phaseStatus(js, settings, '2026-10-09')
    assert.equal(s.status, 'ahead')
  })
  it('apps uses calendar days even on rest days', () => {
    // Oct 9: 1 of 60 calendar days -> expected ~1.7%, actual 0% -> on-track
    const s = phaseStatus(apps, settings, '2026-10-09')
    assert.equal(s.status, 'on-track')
    assert.ok(s.expected > 0 && s.expected < 5)
    // Rest day does not change the apps expectation (calendar, not study days)
    const sRest = phaseStatus(apps, settings, '2026-10-12')
    assert.ok(sRest.expected > s.expected)
  })
})
