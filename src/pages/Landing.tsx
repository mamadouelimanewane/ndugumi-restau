import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { CLIENT_STATUTS } from '../types'

const MODULES = [
  { to: '/dashboard', icon: '📊', title: 'Tableau de bord', desc: 'Analytics globales, conversion et performances par agent.' },
  { to: '/prospects', icon: '🍽️', title: 'Prospects', desc: 'Liste des restaurants, filtres, score de priorité, import/export.' },
  { to: '/workflow', icon: '🧭', title: 'Parcours client', desc: "De l'identification du prospect à la gestion du compte client actif." },
  { to: '/automatisations', icon: '⚡', title: 'Automatisations', desc: 'Règles intelligentes et déclencheurs automatiques.' },
  { to: '/ressources', icon: '📁', title: 'Ressources terrain', desc: "Fiches d'enquête, guides de vente et documents PDF." },
  { to: '/tournee', icon: '🗓️', title: 'Tournée du jour', desc: 'Planification et optimisation des visites terrain.' },
  { to: '/pipeline', icon: '🗂️', title: 'Pipeline', desc: 'Vue Kanban interactive par étape de prospection.' },
  { to: '/carte', icon: '🗺️', title: 'Carte', desc: 'Géolocalisation des restaurants et calcul d\'itinéraires.' },
  { to: '/catalogue', icon: '🛒', title: 'Catalogue produits', desc: 'Produits vivriers et matières premières proposables.' },
  { to: '/communication', icon: '💬', title: 'Communication', desc: 'Modèles, scripts et historique WhatsApp / Email.' },
  { to: '/marketing', icon: '📣', title: 'Marketing', desc: 'Campagnes ciblées et suivi d\'impact.' },
  { to: '/ndugumi', icon: '📦', title: 'Suivi NDUGUMi', desc: "Commandes réelles et adoption de l'application." },
  { to: '/taches', icon: '✅', title: 'Tâches & agenda', desc: 'Relances, rendez-vous et vue calendrier.' },
  { to: '/rapports', icon: '📈', title: 'Rapports', desc: 'Entonnoir de conversion, activité et santé des comptes.' },
  { to: '/doublons', icon: '🧬', title: 'Doublons', desc: 'Détection et fusion des fiches en double.' },
  { to: '/audit', icon: '🕵️', title: 'Journal d\'audit', desc: 'Traçabilité complète des modifications du CRM.' },
  { to: '/agents', icon: '👥', title: 'Équipe & agents', desc: 'Gestion des commerciaux, rôles et synchronisation.' },
  { to: '/activite', icon: '⏱️', title: 'Journal d\'activité', desc: 'Flux chronologique des interactions et événements.' },
  { to: '/reapprovisionnement', icon: '🔮', title: 'Réappro IA', desc: 'Prédiction des ruptures et relances automatiques.' },
  { to: '/leaderboard', icon: '🏆', title: 'Challenge Commerciaux', desc: 'Gamification, badges et classement d\'équipe.' },
  { to: '/parrainage', icon: '🎁', title: 'Parrainage B2B', desc: 'Réseau de recommandation inter-restaurants.' },
  { to: '/api', icon: '⚙️', title: 'Développeur & API', desc: 'Intégrations Webhook et simulateur d\'événements.' },
]

export default function Landing() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const total = joined.length
  const clients = joined.filter((j) => CLIENT_STATUTS.includes(j.crm.statut) && j.crm.statut !== 'client_inactif').length
  const inscrits = joined.filter((j) => j.crm.ndugumi.inscrit).length
  const enCours = joined.filter((j) => !['nouveau', 'refuse', 'client_inactif'].includes(j.crm.statut)).length

  return (
    <div>
      <div
        className="panel"
        style={{
          background: 'linear-gradient(135deg, #232a3b 0%, #7a1f1f 100%)',
          color: '#fff',
          padding: '40px 34px',
          border: 'none',
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: '0.08em', color: '#e7c9a9', fontWeight: 700 }}>
          RESTAU CRM
        </div>
        <h1 style={{ fontSize: 30, margin: '8px 0 10px', fontWeight: 800 }}>
          De la prospection à la relation client, pour NDUGUMi
        </h1>
        <p style={{ fontSize: 14.5, maxWidth: 640, color: '#e4e4e4', lineHeight: 1.6 }}>
          Un seul outil pour identifier les restaurants de Dakar et sa banlieue, les accompagner vers
          l'adoption de l'application NDUGUMi pour leur marché, et gérer la relation dans la durée une fois
          devenus clients.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
          <Link to="/prospects">
            <button className="btn" style={{ background: '#fff', color: '#7a1f1f' }}>
              Ouvrir les prospects
            </button>
          </Link>
          <Link to="/workflow">
            <button className="btn secondary" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
              Voir le parcours client
            </button>
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{total}</div>
          <div className="kpi-label">Restaurants au total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{enCours}</div>
          <div className="kpi-label">En cours de prospection</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{clients}</div>
          <div className="kpi-label">Clients (signés + actifs)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{inscrits}</div>
          <div className="kpi-label">Inscrits sur l'appli NDUGUMi</div>
        </div>
      </div>

      <div className="panel">
        <h3>Modules</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {MODULES.map((m) => (
            <Link key={m.to} to={m.to} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '14px 16px',
                  height: '100%',
                  background: '#fff',
                  transition: 'box-shadow 0.15s',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{m.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--primary-dark)', marginBottom: 4 }}>
                  {m.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}>{m.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
