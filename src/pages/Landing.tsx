import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { CLIENT_STATUTS } from '../types'

interface ModuleItem {
  to: string
  icon: string
  title: string
  desc: string
  badge?: string
}

interface ModuleCategory {
  categoryName: string
  icon: string
  modules: ModuleItem[]
}

const MODULE_CATEGORIES: ModuleCategory[] = [
  {
    categoryName: 'Prospection Terrain & Vente',
    icon: '🎯',
    modules: [
      { to: '/pocket', icon: '⚡', title: 'Pocket Terrain (5s)', desc: 'Mode mobile ultra-rapide pour saisir et visiter en 5 secondes.', badge: 'NOUVEAU' },
      { to: '/prospects', icon: '🍽️', title: 'Prospects & Restaurants', desc: 'Gestion complète du parc de restaurants de Dakar et banlieue.' },
      { to: '/workflow', icon: '🧭', title: 'Parcours Client', desc: 'Du premier contact à l\'activation du compte client actif.' },
      { to: '/pipeline', icon: '🗂️', title: 'Pipeline Kanban', desc: 'Vue visuelle par étape de conversion commerciale.' },
      { to: '/tournee', icon: '🗓️', title: 'Tournée du Jour', desc: 'Planification et optimisation des visites terrain.' },
      { to: '/carte', icon: '🗺️', title: 'Carte GPS & Waze', desc: 'Cartographie Leaflet et navigation GPS 1-clic.' },
    ],
  },
  {
    categoryName: 'Finances, Rentabilité & Crédit Client',
    icon: '💰',
    modules: [
      { to: '/calculator', icon: '🍲', title: 'Calculateur Marge Plat', desc: 'Calcul du food cost et de la marge brute par recette.', badge: 'NOUVEAU' },
      { to: '/simulateur', icon: '🧮', title: 'Simulateur ROI Client', desc: 'Démonstration instantanée des économies nettes du restaurant.', badge: 'NOUVEAU' },
      { to: '/credit-invoicing', icon: '💳', title: 'Crédits, Factures & Impayés', desc: 'Suivi des en-cours, relances Wave/OM et factures PDF.', badge: 'NOUVEAU' },
      { to: '/abonnements', icon: '🔄', title: 'Abonnements Récurrents', desc: 'Commandes hebdomadaires automatiques et MRR.', badge: 'NOUVEAU' },
      { to: '/marche-prices', icon: '📊', title: 'Baromètre Prix Dakar', desc: 'Relevés en temps réel des marchés Tilène, Castors, Sandaga.', badge: 'NOUVEAU' },
    ],
  },
  {
    categoryName: 'Logistique, Livraisons & Achats',
    icon: '🚛',
    modules: [
      { to: '/livraisons', icon: '🚛', title: 'Livraisons & Tournées', desc: 'Dispatching livreurs, créneaux matin et preuve de réception.', badge: 'NOUVEAU' },
      { to: '/fournisseurs', icon: '🏢', title: 'Achats Fournisseurs', desc: 'Producteurs locaux (Niayes, Fleuve) et importateurs B2B.', badge: 'NOUVEAU' },
      { to: '/catalogue', icon: '🛒', title: 'Catalogue & Fiches Médias', desc: 'Fiches produits avec upload/download d\'images et vidéos.' },
      { to: '/ndugumi', icon: '📦', title: 'Suivi NDUGUMi', desc: 'Chiffre d\'affaires réel et taux d\'adoption de l\'application.' },
    ],
  },
  {
    categoryName: 'Communication & Marketing',
    icon: '💬',
    modules: [
      { to: '/communication', icon: '💬', title: 'Communication Multicanale', desc: 'Modèles, envoi groupé et cases à cocher WhatsApp/Email.' },
      { to: '/marketing', icon: '📣', title: 'Campagnes Marketing', desc: 'Gestion des campagnes ciblées et analyse de performance.' },
      { to: '/ressources', icon: '📁', title: 'Ressources & Kit Terrain', desc: 'Fiches d\'enquête, documents Word modifiables et PDF.' },
    ],
  },
  {
    categoryName: 'IA, Automatisations & Alertes',
    icon: '🤖',
    modules: [
      { to: '/notifications', icon: '🔔', title: 'Alertes Quotidiennes', desc: 'Cockpit des relances, impayés et réapprovisionnements du jour.', badge: 'NOUVEAU' },
      { to: '/reapprovisionnement', icon: '🔮', title: 'Réapprovisionnement IA', desc: 'Prédiction des ruptures de stock par intelligence artificielle.' },
      { to: '/automatisations', icon: '⚡', title: 'Automatisations', desc: 'Déclencheurs intelligents et règles métiers automatisées.' },
    ],
  },
  {
    categoryName: 'Gamification, Formation & Équipe',
    icon: '🎓',
    modules: [
      { to: '/academie', icon: '🎓', title: 'Académie Commerciale', desc: 'Fiches d\'arguments, lexique Wolof et quiz de certification.', badge: 'NOUVEAU' },
      { to: '/leaderboard', icon: '🏆', title: 'Challenge Commerciaux', desc: 'Classement d\'équipe, badges et gamification des ventes.' },
      { to: '/parrainage', icon: '🎁', title: 'Parrainage B2B', desc: 'Programme de recommandation entre restaurateurs.' },
      { to: '/agents', icon: '👥', title: 'Équipe & Commerciaux', desc: 'Gestion des profils, quotas et synchronisation.' },
      { to: '/taches', icon: '✅', title: 'Tâches & Agenda', desc: 'Calendrier des relances et rendez-vous commerciaux.' },
    ],
  },
  {
    categoryName: 'Rapports, Audit & Système',
    icon: '🛠️',
    modules: [
      { to: '/dashboard', icon: '📊', title: 'Tableau de Bord', desc: 'Statistiques globales, entonnoir et performances.' },
      { to: '/rapports', icon: '📈', title: 'Rapports Avancés', desc: 'Santé des comptes, taux de conversion et analyses.' },
      { to: '/doublons', icon: '🧬', title: 'Gestion des Doublons', desc: 'Détection et fusion intelligente des fiches en double.' },
      { to: '/audit', icon: '🕵️', title: 'Journal d\'Audit', desc: 'Traçabilité complète des modifications du CRM.' },
      { to: '/activite', icon: '⏱️', title: 'Journal d\'Activité', desc: 'Flux chronologique des événements et notes.' },
      { to: '/api', icon: '⚙️', title: 'Développeur & API', desc: 'Configuration Webhooks et intégrations techniques.' },
    ],
  },
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
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Hero Header avec Gradient Élégan Premier coup d'œil */}
      <div
        className="panel"
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #7a1f1f 100%)',
          color: '#fff',
          padding: '36px 32px',
          border: 'none',
          borderRadius: 16,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', color: '#facc15', fontWeight: 800, textTransform: 'uppercase' }}>
              PLATEFORME INTEGRALE B2B — NDUGUMi RESTAU
            </div>
            <h1 style={{ fontSize: 32, margin: '8px 0 10px', fontWeight: 900, color: '#ffffff' }}>
              CRM & Operating System Restauration Dakar
            </h1>
            <p style={{ fontSize: 14.5, maxWidth: 720, color: '#e2e8f0', lineHeight: 1.6, margin: 0 }}>
              De la prospection terrain à la livraison quotidienne du marché, suivez vos restaurants, gérez vos crédits, automatisez vos approvisionnements et optimisez la rentabilité de la restauration à Dakar et banlieue.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/pocket">
              <button className="btn" style={{ background: '#facc15', color: '#1e293b', fontWeight: 800 }}>
                ⚡ Pocket Terrain (5s)
              </button>
            </Link>
            <Link to="/prospects">
              <button className="btn secondary" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                🍽️ Voir les prospects
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Global Counter Grid */}
      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <div className="kpi-card" style={{ borderLeft: '4px solid #7a1f1f' }}>
          <div className="kpi-value">{total}</div>
          <div className="kpi-label">Restaurants répertoriés</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="kpi-value">{enCours}</div>
          <div className="kpi-label">En cours de prospection</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div className="kpi-value">{clients}</div>
          <div className="kpi-label">Clients signés & actifs</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="kpi-value">{inscrits}</div>
          <div className="kpi-label">Inscrits sur l'appli NDUGUMi</div>
        </div>
      </div>

      {/* Categories de Modules Structurées */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {MODULE_CATEGORIES.map((cat, idx) => (
          <div key={idx} className="panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, borderBottom: '2px solid var(--border)', paddingBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{cat.icon}</span>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--primary, #7a1f1f)', fontWeight: 800 }}>
                {cat.categoryName}
              </h2>
              <span style={{ fontSize: 11, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 12, fontWeight: 700, marginLeft: 'auto' }}>
                {cat.modules.length} module(s)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {cat.modules.map((m) => (
                <Link key={m.to} to={m.to} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 16,
                      height: '100%',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)'
                      e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(0,0,0,0.1)'
                      e.currentTarget.style.borderColor = 'var(--primary, #7a1f1f)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    {m.badge && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          fontSize: 9.5,
                          fontWeight: 800,
                          background: '#d97706',
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {m.badge}
                      </span>
                    )}
                    <div style={{ fontSize: 26, marginBottom: 8 }}>{m.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.45, marginTop: 'auto' }}>
                      {m.desc}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
