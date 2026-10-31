// Safety checks for daily plan storage (the user-chosen Today).
// The point: broken or old data must never break the app.
// Run: node --test src/utils/todayPlans.test.js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_DATA } from '../data/defaultData.js'
import {
  makeCustomEntry,
  makeTopicEntry,
  pickableItems,
  planHours,
  resolveEntry,
  sanitizePlans,
  topicEntryId,
} from './todayPlans.js'

const js = DEFAULT_DATA.phases.find((p) => p.id === 'js')
const phasesById = new Map(DEFAULT_DATA.phases.map((p) => [p.id, p]))
const today = '2026-10-09'

describe('sanitizePlans', () => {
  it('missing or wrong-shaped data becomes {} instead of throwing', () => {
    assert.deepEqual(sanitizePlans(undefined), {})
    assert.deepEqual(sanitizePlans(null), {})
    assert.deepEqual(sanitizePlans('nonsense'), {})
    assert.deepEqual(sanitizePlans([1, 2, 3]), {})
    assert.deepEqual(sanitizePlans(42), {})
  })

  it('keeps valid dates and drops junk keys', () => {
    assert.deepEqual(sanitizePlans({ 'not-a-date': [] }), {})
    assert.deepEqual(sanitizePlans({ '2026-10-09': 'nope' }), {})
    assert.deepEqual(sanitizePlans({ '2026-10-09': [] }), {})
  })

  it('keeps good entries and drops broken ones', () => {
    const topic = makeTopicEntry(js, js.items[1])
    const raw = {
      [today]: [
        topic,
        { id: 'x' }, // no kind/phaseId
        null,
        { kind: 'custom', title: 'no id' },
        { id: 'c1', kind: 'custom', title: '  Read mail  ', hours: '0.5' },
      ],
      junk: [topic],
    }
    const out = sanitizePlans(raw)
    assert.deepEqual(Object.keys(out), [today])
    assert.equal(out[today].length, 2)
    assert.equal(out[today][0].id, topic.id)
    assert.equal(out[today][1].title, 'Read mail')
    assert.equal(out[today][1].hours, 0.5)
  })

  it('extra fields never survive a save (resolved phase objects)', () => {
    const resolved = resolveEntry(makeTopicEntry(js, js.items[1]), phasesById)
    const out = sanitizePlans({ [today]: [{ ...resolved, phase: js, junk: 1 }] })
    assert.equal('phase' in out[today][0], false)
    assert.equal('junk' in out[today][0], false)
  })

  it('blank hours fall back to 0', () => {
    const out = sanitizePlans({
      [today]: [{ id: 'c1', kind: 'custom', title: 'Walk', hours: '' }],
    })
    assert.equal(out[today][0].hours, 0)
  })
})

describe('resolveEntry', () => {
  it('reads live title, hours and done from the store', () => {
    const entry = makeTopicEntry(js, js.items[1])
    const live = resolveEntry(entry, phasesById)
    assert.equal(live.title, js.items[1].title)
    assert.equal(live.hours, js.items[1].hours)
    assert.equal(live.done, js.items[1].done)
    assert.equal(live.phase.id, 'js')
  })

  it('returns null when the task no longer exists', () => {
    const entry = { ...makeTopicEntry(js, js.items[1]), itemId: 'deleted-task' }
    assert.equal(resolveEntry(entry, phasesById), null)
    assert.equal(resolveEntry({ id: 'bad' }, phasesById), null)
  })

  it('passes custom tasks through untouched', () => {
    const entry = makeCustomEntry('Review notes', 1.5)
    assert.deepEqual(resolveEntry(entry, phasesById), entry)
  })

  it('topic entry ids are stable per task', () => {
    assert.equal(topicEntryId('js', 'js-01'), 'topic:js:js-01')
  })
})

describe('planHours', () => {
  it('sums a day of picks and rounds to one decimal', () => {
    const picks = [
      makeTopicEntry(js, js.items[1]), // 1.5h
      makeTopicEntry(js, js.items[2]), // 1.5h
      makeCustomEntry('Extra review', 0.33),
    ]
    assert.equal(planHours(picks), 3.3)
  })

  it('empty or missing plans are 0', () => {
    assert.equal(planHours([]), 0)
    assert.equal(planHours(undefined), 0)
  })
})

describe('pickableItems', () => {
  it('offers a task only when done === false and it is not locked', () => {
    const phase = {
      id: 'js',
      items: [
        { id: 'open', done: false },
        { id: 'finished', done: true },
        { id: 'locked', done: false, locked: true },
        { id: 'unknown' }, // legacy row without a done flag: not offered
      ],
    }
    assert.deepEqual(pickableItems(phase).map((i) => i.id), ['open'])
  })

  it('is empty for a phase with no items', () => {
    assert.deepEqual(pickableItems({ id: 'js' }), [])
    assert.deepEqual(pickableItems(undefined), [])
  })

  it('building a pick never mutates the task or its completion', () => {
    const item = { id: 'js-09', title: 'Closures', hours: 2, done: false }
    const entry = makeTopicEntry({ id: 'js' }, item)
    assert.equal(entry.done, false) // a stored pick never carries completion
    assert.equal(item.done, false) // the task itself is untouched
    assert.equal(item.title, 'Closures')
  })

  it('a completed task stays completed and is never offered again', () => {
    // Adding it once, then completing it, must leave it out of the picker.
    const items = [{ id: 'js-09', title: 'Closures', hours: 2, done: false }]
    const phase = { id: 'js', items }
    assert.equal(pickableItems(phase).length, 1)
    items[0].done = true // completed via the topic page or Today list
    assert.deepEqual(pickableItems(phase), [])
  })
})
