// React Router v7, declarative mode, BrowserRouter.
// Refresh-safe via vercel.json + public/_redirects.
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Settings from './pages/Settings.jsx'
import Timeline from './pages/Timeline.jsx'
import Today from './pages/Today.jsx'
import TopicPage from './pages/TopicPage.jsx'
import Topics from './pages/Topics.jsx'
import { StudyProvider } from './store/StudyContext.jsx'

export default function App() {
  return (
    <StudyProvider>
      <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/today" element={<Today />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/topic/:id" element={<TopicPage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </StudyProvider>
  )
}
