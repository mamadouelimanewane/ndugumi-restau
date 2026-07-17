import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Prospects from './pages/Prospects'
import ProspectDetail from './pages/ProspectDetail'
import Pipeline from './pages/Pipeline'
import Tasks from './pages/Tasks'
import Agents from './pages/Agents'
import Reports from './pages/Reports'
import Carte from './pages/Carte'
import Catalogue from './pages/Catalogue'
import { useCrmStore } from './store/useCrmStore'

export default function App() {
  const ensureAll = useCrmStore((s) => s.ensureAll)

  useEffect(() => {
    ensureAll()
  }, [ensureAll])

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/prospects" element={<Prospects />} />
          <Route path="/prospects/:id" element={<ProspectDetail />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/carte" element={<Carte />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/taches" element={<Tasks />} />
          <Route path="/rapports" element={<Reports />} />
          <Route path="/agents" element={<Agents />} />
        </Routes>
      </main>
    </div>
  )
}
