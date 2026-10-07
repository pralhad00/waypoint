// Simple sidebar. Laptop only in V1, 240px wide.
// Links use React Router v7 declarative <NavLink>.
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/today', label: 'Today' },
  { to: '/', label: 'Dashboard' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/topics', label: 'Topics' },
  { to: '/settings', label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-[240px] shrink-0 border-r border-border bg-surface min-h-screen p-5">
      <h1 className="text-[18px] font-semibold mb-6">Study Tracker</h1>
      <nav className="flex flex-col gap-1">
        {links.map((l) => (
          <NavLink
            key={l.to + l.label}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-[14px] ${
                isActive
                  ? 'bg-raised text-text'
                  : 'text-muted hover:bg-raised hover:text-text'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <p className="mt-8 text-[12px] text-muted">
        Dec 7 deadline. One next task at a time.
      </p>
    </aside>
  )
}
