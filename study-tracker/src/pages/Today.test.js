// Guard for the freeze bug: an event prop must never CALL its handler while
// rendering, e.g. `onClick={onMove(-1)}` runs setState during render, which
// sends React into render -> setState -> render until the tab hangs.
// Handlers have to be passed as references or wrapped in an arrow.
// Run: node --test src/pages/Today.test.js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

// onX={...} where the body starts with an identifier call (not an arrow).
const EVENT_PROP = /\b(on[A-Z][A-Za-z]*)=\{([^{}]*)\}/g
const DIRECT_CALL = /^[a-zA-Z_$][\w$.]*\s*\(/

function jsxFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...jsxFiles(full))
    else if (name.endsWith('.jsx')) out.push(full)
  }
  return out
}

function findCallsDuringRender(code) {
  const hits = []
  let m
  EVENT_PROP.lastIndex = 0
  while ((m = EVENT_PROP.exec(code)) !== null) {
    if (DIRECT_CALL.test(m[2].trim())) {
      const line = code.slice(0, m.index).split('\n').length
      hits.push(`${m[1]}={${m[2].trim()}} (line ${line})`)
    }
  }
  return hits
}

describe('event handlers are not called during render', () => {
  for (const file of jsxFiles(SRC)) {
    it(file.replaceAll('\\', '/').split('/src/').pop(), () => {
      const hits = findCallsDuringRender(readFileSync(file, 'utf8'))
      assert.deepEqual(
        hits,
        [],
        `wrap in an arrow (onClick={() => onMove(-1)}): ${hits.join('; ')}`,
      )
    })
  }
})

// The picker's job is only to stage ids. It must never mention completion and
// never write to the store or the plan while you browse — committing happens
// once, through onAdd, and carries no `done`. (Filtering by done lives in the
// tested pickableItems helper, not in this component.)
describe('the picker never touches completion or writes while browsing', () => {
  const source = readFileSync(join(SRC, 'pages', 'Today.jsx'), 'utf8')
  const start = source.indexOf('function TaskPicker(')
  const end = source.indexOf('export default function Today()')
  // Only executable code matters — strip the explanatory comments first.
  const picker = source
    .slice(start, end)
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  it('found the picker source', () => {
    assert.ok(start > -1 && end > start, 'TaskPicker block not found in Today.jsx')
  })

  it('does not read or write an item `done` field', () => {
    // Allow the empty-state prose "…all done."; forbid field access/writes.
    assert.equal(/\.\s*done\b/.test(picker), false, '.done access')
    assert.equal(/\bdone\s*:/.test(picker), false, 'done: property')
    assert.equal(/\[\s*['"]done['"]\s*\]/.test(picker), false, "['done'] access")
  })

  it('does not dispatch to the store', () => {
    assert.equal(/dispatch\s*\(/.test(picker), false)
    assert.equal(/TOGGLE_DONE/.test(picker), false)
  })

  it('does not write todayPlans until onAdd is called', () => {
    assert.equal(/updatePlans\s*\(/.test(picker), false)
  })
})
