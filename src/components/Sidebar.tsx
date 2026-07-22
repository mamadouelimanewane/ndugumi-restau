import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'

const links = [
  { to: '/', label: 'Accueil', icon: '🏠', end: true },
  { to: '/dashboard', label: 'Tableau de bord', icon: '📊', end: true },
  { to: '/prospects', label: 'Prospects', icon: '🍽️', end: false },
  { to: '/workflow', label: 'Parcours client', icon: '🧭', end: false },
  { to: '/automatisations', label: 'Automatisations', icon: '⚡', end: false },
  { to: '/ressources', label: 'Ressources terrain', icon: '📁', end: false },
  { to: '/tournee', label: 'Tournée du jour', icon: '🗓️', end: false },
  { to: '/pipeline', label: 'Pipeline', icon: '🗂️', end: false },
  { to: '/carte', label: 'Carte', icon: '🗺️', end: false },
  { to: '/catalogue', label: 'Catalogue produits', icon: '🛒', end: false },
  { to: '/communication', label: 'Communication', icon: '💬', end: false },
  { to: '/marketing', label: 'Marketing', icon: '📣', end: false },
  { to: '/ndugumi', label: 'Suivi NDUGUMi', icon: '📦', end: false },
  { to: '/taches', label: 'Tâches & agenda', icon: '✅', end: false },
  { to: '/rapports', label: 'Rapports', icon: '📈', end: false },
  { to: '/doublons', label: 'Doublons', icon: '🧬', end: false },
  { to: '/audit', label: "Journal d'audit", icon: '🕵️', end: false },
  { to: '/agents', label: 'Équipe', icon: '👥', end: false },
  { to: '/activite', label: "Journal d'activité", icon: '⏱️', end: false },
  { to: '/reapprovisionnement', label: 'Réappro IA', icon: '🔮', end: false },
  { to: '/leaderboard', label: 'Challenge Commerciaux', icon: '🏆', end: false },
  { to: '/parrainage', label: 'Parrainage B2B', icon: '🎁', end: false },
  { to: '/api', label: 'Développeur & API', icon: '⚙️', end: false },
]

export default function Sidebar() {
  const currentAgent = useCrmStore((s) => s.currentAgent)
  const setCurrentAgent = useCrmStore((s) => s.setCurrentAgent)
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="mobile-topbar">
        <button className="mobile-menu-btn" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
          ☰
        </button>
        <span className="mobile-topbar-brand">Restau CRM</span>
        <span style={{ width: 24 }} />
      </div>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <aside className={'sidebar' + (open ? ' open' : '')}>
        <div className="sidebar-brand">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span>
              Restau CRM
              <small>Prospection NDUGUMi</small>
            </span>
            <button className="sidebar-close-btn" onClick={() => setOpen(false)} aria-label="Fermer le menu">
              ✕
            </button>
          </div>
        </div>
        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          Connecté : <strong>{currentAgent ?? '—'}</strong>{' '}
          <button
            onClick={() => setCurrentAgent(null)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: 11 }}
          >
            Changer
          </button>
          <br />
          Outil interne de relation client
          <br />
          pour la prospection des restaurants
          <br />
          de Dakar &amp; banlieue &mdash; NDUGUMi.
        </div>
      </aside>
    </>
  )
}
