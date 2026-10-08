// Main layout: sticky top nav, content full width below with padding.
import { Outlet } from 'react-router-dom'
import TopNav from './TopNav.jsx'

export default function Layout() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <TopNav />
      <main className="px-4 nav:px-6 lg:px-8 py-6 nav:py-8">
        <Outlet />
      </main>
    </div>
  )
}
