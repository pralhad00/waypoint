// Main layout: sidebar left, content centred, max 1100px.
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

export default function Layout() {
  return (
    <div className="min-h-screen bg-bg text-text flex">
      <Sidebar />
      <main className="flex-1 px-8 py-8">
        <div className="max-w-[1100px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
