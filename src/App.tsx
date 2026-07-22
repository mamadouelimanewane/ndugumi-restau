import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import WhoAreYou from './components/WhoAreYou'
import GlobalSearch from './components/GlobalSearch'
import ReminderNotifier from './components/ReminderNotifier'
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
import AuditLog from './pages/AuditLog'
import Doublons from './pages/Doublons'
import Automatisations from './pages/Automatisations'
import SettingsAPI from './pages/SettingsAPI'
import Ressources from './pages/Ressources'
import Activite from './pages/Activite'
import { Tournee } from './pages/Tournee'
import PredictiveRestock from './pages/PredictiveRestock'
import Leaderboard from './pages/Leaderboard'
import Referrals from './pages/Referrals'
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
      <ReminderNotifier />
      <main className="main">
        <GlobalSearch />
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
          <Route path="/doublons" element={<Doublons />} />
          <Route path="/automatisations" element={<Automatisations />} />
          <Route path="/api" element={<SettingsAPI />} />
          <Route path="/ressources" element={<Ressources />} />
          <Route path="/tournee" element={<Tournee />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/activite" element={<Activite />} />
          <Route path="/reapprovisionnement" element={<PredictiveRestock />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/parrainage" element={<Referrals />} />
          <Route path="/taches" element={<Tasks />} />
          <Route path="/rapports" element={<Reports />} />
          <Route path="/agents" element={<Agents />} />
        </Routes>
      </main>
    </div>
  )
}
