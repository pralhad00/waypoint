# PLAN — Study Tracker (React + localStorage)

Source of truth: PRD in user prompt + 7 decisions below (Oct 8, 2026).
App lives in `study-tracker/`. This file lives in parent `docs/` as requested.

## Locked decisions
1. Router v7, declarative, BrowserRouter + `vercel.json` + `public/_redirects`.
2. Tailwind v4 with `@theme` tokens (PRD §7), via `@tailwindcss/vite`.
3. No timer in V1. `Start` = mark `status: in-progress` + highlight only.
4. `Not today` = set `snoozedUntil` to next study day. Scheduler skips snoozed items today.
5. Applications separate: excluded from Today queue + daily budget. Small optional section below main tasks. Status = calendar progress only (days elapsed, not hours-vs-expected).
6. JS 50h item locked: `locked: true`, shown as “Already completed”, no checkbox, hours editable only in edit mode.
7. Defer hosting. Build locally. Export/Import used to move data on deploy.

Data model delta (applies from Job 3 onward):
- `item.status: done | in-progress | todo` (default `todo`, V1 no timer)
- `item.snoozedUntil: "YYYY-MM-DD" | null`
- `item.locked: boolean` (only js-00 true)

## Jobs (PRD §10 order, no merges)

- [x] Job 1 — Setup, theme, layout + sidebar
  Goal: Running Vite+React+Tailwind v4+Router v7+date-fns with PRD tokens and nav.
  Files: `study-tracker/package.json`, `vite.config.js`, `src/index.css`, `index.html`, `src/App.jsx`, `src/components/Layout.jsx`, `src/components/Sidebar.jsx`, `src/pages/*`, `vercel.json`, `public/_redirects`
  Test: `npm run dev` → sidebar Today/Dashboard/Timeline/Topics/Settings, dark `#1A1C23`, click each link, refresh `/today` (no 404 logic broken locally, rewrite files exist).
  Commit: `chore: setup vite tailwind router layout sidebar`

- [x] Job 2 — Default data file only
  Goal: `src/data/defaultData.js` copied exactly from PRD §11 + locked/snoozed fields.
  Files: `study-tracker/src/data/defaultData.js`
  Test: Open file, verify counts/hours, `js-00` has `locked:true, done:true, hours:50`.
  Commit: `data: add default checklists from PRD`

- [x] Job 3 — Store + localStorage
  Goal: Context+useReducer+useLocalStorage, key `studyTracker.v1`, save on change, validate + version migrate.
  Files: `study-tracker/src/store/StudyContext.jsx`, `src/hooks/useLocalStorage.js`
  Test: Check → refresh → survives. Corrupt localStorage → defaults reload.
  Commit: `feat: context reducer localstorage persistence`

- [x] Job 4 — Topic detail page
  Goal: Grouped checklist, locked row has no checkbox, add/edit/delete/reorder, weighted bar + undo toast.
  Files: `src/pages/TopicPage.jsx`, `src/components/TaskRow.jsx`, `src/components/ProgressBar.jsx`
  Test: `/topic/js` → check `Objects 1.5h` → bar moves instantly. Uncheck → undo toast. Locked 50h shows “Already completed”.
  Commit: `feat: topic detail checklist weighted progress`

- [x] Job 5 — Dashboard (first usable version)
  Goal: Header days-left + overall %, 5 cards (dot/%/bar/x-y/hours/dates/chip), Today preview, mini strip. Apps chip uses calendar progress.
  Files: `src/pages/Dashboard.jsx`, `src/components/TopicCard.jsx`, `src/components/StatusChip.jsx`
  Test: `/` shows 5 bars, JS ~70% at start.
  Commit: `feat: dashboard with 5 progress cards`

- [x] Job 6 — Pure utils + sample tests
  Goal: `progress/schedule/status` pure functions, no UI. Apps excluded from budget calc. Snoozed skipped. Calendar-status for apps.
  Files: `src/utils/progress.js`, `src/utils/schedule.js`, `src/utils/status.js`
  Test: Sample dates: JS Oct9-15 minus 1 rest, 2.5h/day → finish date correct. Snoozed item skipped today. Apps status = days elapsed %.
  Commit: `feat: pure scheduling progress status utils`

- [x] Job 7 — Wire dates + status chips
  Goal: Projected finish, Ahead/On-track/Behind ±5pt, `Needs X h/day`, late warning.
  Files: edits to `TopicCard.jsx`, `TopicPage.jsx`, `Dashboard.jsx`
  Test: Change dates → chip flips correctly with sage/blue/terracotta.
  Commit: `feat: status chips projected finish needs-per-day`

- [x] Job 8 — Today view (most important)
  Goal: Ring done/budget (excl. apps), Up-next one task with Start (=in-progress) + Mark done, Rest-of-today fits budget, Carried-over calm, Not-today sets snoozedUntil, Take-today-off, empty state, separate optional Applications section below.
  Files: `src/pages/Today.jsx`, `src/components/UpNextCard.jsx`
  Test: `/today` → one Up-next. Start highlights. Not today → disappears until next study day. Apps below do not affect ring.
  Commit: `feat: today view up-next carried-over`

- [x] Job 9 — Rest days + rescheduling
  Goal: Single/range rest, auto-shift, plain message `JS now finishes Oct 18 (3 days late)`, miss warning + fix suggestion.
  Files: `src/components/RestDayPicker.jsx`, edits to `schedule.js`, `Today.jsx`
  Test: Add rest → finish +1 study day, warning if past end.
  Commit: `feat: rest days rescheduling impact message`

- [x] Job 10 — Timeline view
  Goal: Bars Oct9-Dec7, fill by progress, today line, rest shading, Dec7 flag, hollow late marker.
  Files: `src/pages/Timeline.jsx`, `src/components/TimelineBar.jsx`
  Test: `/timeline` shows 5 bars + today + rest + flag + late hollow.
  Commit: `feat: timeline today rest deadline late markers`

- [x] Job 11 — Settings + backup
  Goal: Edit dailyHours/deadline/phases/rest, Export/Import JSON (for deploy move), Reset with confirm.
  Files: `src/pages/Settings.jsx`
  Test: Change 2.5→3 → Today fits more. Export downloads, Import restores. Reset confirms.
  Commit: `feat: settings export import reset`

- [x] Job 12 — Polish
  Goal: 150-250ms hovers, 600ms bar, tick+dim, empty states, prefers-reduced-motion. No confetti.
  Files: CSS + `ProgressBar.jsx`, `TaskRow.jsx` tweaks
  Test: Check → tick draws, bar slides. Reduced-motion → no anim.
  Commit: `polish: motion empty-states reduced-motion`
