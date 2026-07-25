import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import WhoAreYou from './components/WhoAreYou'
import GlobalSearch from './components/GlobalSearch'
import ReminderNotifier from './components/ReminderNotifier'
import LandingHeader from './components/LandingHeader'
import PwaInstallBanner from './components/PwaInstallBanner'
import Landing from './pages/Landing'
import PublicLeadForm from './pages/PublicLeadForm'
import { useCrmStore } from './store/useCrmStore'

// Chargement paresseux : chaque page ne télécharge son code que lorsqu'on y navigue, au lieu de
// tout embarquer dans le bundle initial (~2 Mo avant ce changement, sensible sur mobile/réseau moyen).
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Prospects = lazy(() => import('./pages/Prospects'))
const ProspectDetail = lazy(() => import('./pages/ProspectDetail'))
const Pipeline = lazy(() => import('./pages/Pipeline'))
const Workflow = lazy(() => import('./pages/Workflow'))
const Tasks = lazy(() => import('./pages/Tasks'))
const Agents = lazy(() => import('./pages/Agents'))
const Reports = lazy(() => import('./pages/Reports'))
const Carte = lazy(() => import('./pages/Carte'))
const Catalogue = lazy(() => import('./pages/Catalogue'))
const Communication = lazy(() => import('./pages/Communication'))
const Marketing = lazy(() => import('./pages/Marketing'))
const NdugumiSuivi = lazy(() => import('./pages/NdugumiSuivi'))
const AuditLog = lazy(() => import('./pages/AuditLog'))
const Doublons = lazy(() => import('./pages/Doublons'))
const Automatisations = lazy(() => import('./pages/Automatisations'))
const SettingsAPI = lazy(() => import('./pages/SettingsAPI'))
const Ressources = lazy(() => import('./pages/Ressources'))
const Activite = lazy(() => import('./pages/Activite'))
const Tournee = lazy(() => import('./pages/Tournee').then((m) => ({ default: m.Tournee })))
const PredictiveRestock = lazy(() => import('./pages/PredictiveRestock'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const Referrals = lazy(() => import('./pages/Referrals'))
const CreditInvoicing = lazy(() => import('./pages/CreditInvoicing'))
const Livraisons = lazy(() => import('./pages/Livraisons'))
const MarchePrices = lazy(() => import('./pages/MarchePrices'))
const Abonnements = lazy(() => import('./pages/Abonnements'))
const PocketCommercial = lazy(() => import('./pages/PocketCommercial'))
const Calculator = lazy(() => import('./pages/Calculator'))
const Simulateur = lazy(() => import('./pages/Simulateur'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Fournisseurs = lazy(() => import('./pages/Fournisseurs'))
const Academie = lazy(() => import('./pages/Academie'))
const Settings = lazy(() => import('./pages/Settings'))

function PageLoading() {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
      Chargement…
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const isLandingPage = location.pathname === '/'
  const ensureAll = useCrmStore((s) => s.ensureAll)
  const currentAgent = useCrmStore((s) => s.currentAgent)
  const hasHydrated = useCrmStore((s) => s.hasHydrated)
  const isPublicLeadPage = location.pathname === '/devenir-partenaire'

  useEffect(() => {
    // Attendre la fin de l'hydratation distante avant de seeder quoi que ce soit : sinon l'état
    // par défaut (vide) déclenche un ensureAll() qui écrit prématurément par-dessus les vraies
    // données serveur pas encore chargées. Ne rien faire non plus sur la page publique, qui ne
    // dépend pas du store CRM.
    if (hasHydrated && !isPublicLeadPage) ensureAll()
  }, [ensureAll, hasHydrated, isPublicLeadPage])

  // Page publique (formulaire d'intérêt restaurant) : reste accessible sans agent choisi ni
  // attente d'hydratation (pas de sidebar, pas de gate WhoAreYou), pour un lien partageable
  // avec de vrais restaurateurs sans qu'ils touchent à l'outil interne.
  if (isPublicLeadPage) {
    return <PublicLeadForm />
  }

  if (!hasHydrated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-dim)', fontSize: 13 }}>
        Chargement…
      </div>
    )
  }

  if (currentAgent === null) {
    return <WhoAreYou />
  }

  return (
    <div className="app-shell">
      {!isLandingPage && <Sidebar />}
      <ReminderNotifier />
      <main className="main">
        {isLandingPage ? <LandingHeader /> : <GlobalSearch />}
        <PwaInstallBanner />
        <Suspense fallback={<PageLoading />}>
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
            <Route path="/credit-invoicing" element={<CreditInvoicing />} />
            <Route path="/livraisons" element={<Livraisons />} />
            <Route path="/marche-prices" element={<MarchePrices />} />
            <Route path="/abonnements" element={<Abonnements />} />
            <Route path="/pocket" element={<PocketCommercial />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/simulateur" element={<Simulateur />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/fournisseurs" element={<Fournisseurs />} />
            <Route path="/academie" element={<Academie />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/taches" element={<Tasks />} />
            <Route path="/rapports" element={<Reports />} />
            <Route path="/agents" element={<Agents />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
