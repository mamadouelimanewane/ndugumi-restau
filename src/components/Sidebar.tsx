import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Accueil', icon: '🏠', end: true },
  { to: '/dashboard', label: 'Tableau de bord', icon: '📊', end: true },
  { to: '/prospects', label: 'Prospects', icon: '🍽️', end: false },
  { to: '/workflow', label: 'Parcours client', icon: '🧭', end: false },
  { to: '/pipeline', label: 'Pipeline', icon: '🗂️', end: false },
  { to: '/carte', label: 'Carte', icon: '🗺️', end: false },
  { to: '/catalogue', label: 'Catalogue produits', icon: '🛒', end: false },
  { to: '/communication', label: 'Communication', icon: '💬', end: false },
  { to: '/marketing', label: 'Marketing', icon: '📣', end: false },
  { to: '/ndugumi', label: 'Suivi NDUGUMi', icon: '📦', end: false },
  { to: '/taches', label: 'Tâches & agenda', icon: '✅', end: false },
  { to: '/rapports', label: 'Rapports', icon: '📈', end: false },
  { to: '/agents', label: 'Équipe', icon: '👥', end: false },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        Restau CRM
        <small>Prospection NDUGUMi</small>
      </div>
      <nav className="sidebar-nav">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        Outil interne de relation client
        <br />
        pour la prospection des restaurants
        <br />
        de Dakar &amp; banlieue &mdash; NDUGUMi.
      </div>
    </aside>
  )
}
