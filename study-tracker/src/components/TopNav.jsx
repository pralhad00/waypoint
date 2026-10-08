// Sticky top bar, 56px: app name left, tab links right.
// Icons always show; labels appear from 700px up (nav: breakpoint),
// so the single row never wraps at any width.
import { NavLink } from 'react-router-dom'

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
}

function TodayIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="m9 15.5 2 2 4-4" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" {...stroke}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </svg>
  )
}

function TimelineIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="5" width="11" height="3.5" rx="1.75" />
      <rect x="7.5" y="10.25" width="13" height="3.5" rx="1.75" />
      <rect x="5" y="15.5" width="8" height="3.5" rx="1.75" />
    </svg>
  )
}

function TopicsIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" {...stroke}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

const links = [
  { to: '/today', label: 'Today', Icon: TodayIcon },
  { to: '/', label: 'Dashboard', Icon: DashboardIcon, end: true },
  { to: '/timeline', label: 'Timeline', Icon: TimelineIcon },
  { to: '/topics', label: 'Topics', Icon: TopicsIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

export default function TopNav() {
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-surface px-4 nav:px-6 lg:px-8">
      <div className="flex h-full items-center gap-3">
        <span className="min-w-0 truncate text-[15px] font-semibold">
          Study Tracker
        </span>
        <nav aria-label="Main" className="ml-auto flex shrink-0 items-center gap-1 nav:gap-1.5">
          {links.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              aria-label={label}
              className={({ isActive }) =>
                `flex h-9 items-center gap-1.5 rounded-lg px-2.5 nav:px-3 text-[14px] whitespace-nowrap ${
                  isActive
                    ? 'bg-raised text-text'
                    : 'text-muted hover:bg-raised hover:text-text'
                }`
              }
            >
              <Icon />
              <span className="hidden nav:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
