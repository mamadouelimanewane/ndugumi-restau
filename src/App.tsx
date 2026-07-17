import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import WhoAreYou from './components/WhoAreYou'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Prospects from './pages/Prospects'
import ProspectDetail from './pages/ProspectDetail'
import Pipeline from './pages/Pipeline'
import Workflow from './pages/Workflow'
import Tasks from './pages/Tasks'
import Agents from './pages/Agents'
import Reports from './pages/Reports'
import Carte from './pages/Carte'
import Catalogue from './pages/Catalogue'
import Communication from './pages/Communication'
import Marketing from './pages/Marketing'
import NdugumiSuivi from './pages/NdugumiSuivi'
import { useCrmStore } from './store/useCrmStore'

export default function App() {
  const ensureAll = useCrmStore((s) => s.ensureAll)
  const currentAgent = useCrmStore((s) => s.currentAgent)

  useEffect(() => {
    ensureAll()
  }, [ensureAll])

  if (currentAgent === null) {
    return <WhoAreYou />
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/prospects" element={<Prospects />} />
          <Route path="/prospects/:id" element={<ProspectDetail />} />
          <Route path="/workflow" element={<Workflow />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/carte" element={<Carte />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/communication" element={<Communication />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/ndugumi" element={<NdugumiSuivi />} />
          <Route path="/taches" element={<Tasks />} />
          <Route path="/rapports" element={<Reports />} />
          <Route path="/agents" element={<Agents />} />
        </Routes>
      </main>
    </div>
  )
}
