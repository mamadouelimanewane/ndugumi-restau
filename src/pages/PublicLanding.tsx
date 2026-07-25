import { Link } from 'react-router-dom'

const DARK_BG = '#181310'
const DARK_PANEL = '#231b17'
const ACCENT = '#c0793a'
const ACCENT_DARK = '#a5622a'
const PRIMARY_RED = '#c0453f'

const FEATURES = [
  {
    icon: '🎯',
    title: 'Scoring IA & relance groupée',
    desc: "L'IA évalue la probabilité de conversion de chaque prospect et génère le message de relance, envoyé en un clic sur WhatsApp — pas de saisie manuelle.",
  },
  {
    icon: '📷',
    title: 'Scan terrain par OCR',
    desc: "Photographiez une étiquette de prix, un ticket de caisse ou une carte de visite : l'IA en extrait automatiquement les informations structurées.",
  },
  {
    icon: '📊',
    title: 'Veille tarifaire en direct',
    desc: 'Suivi des prix des marchés de Dakar (Tilène, Castors, Sandaga) et des supermarchés, avec recherche web en temps réel — jamais de chiffre inventé.',
  },
  {
    icon: '🗺️',
    title: 'Carte & tournées optimisées',
    desc: 'Localisation GPS précise (lien Google Maps ou coordonnées), calcul automatique d\'itinéraire et navigation Google Maps / Waze en un clic.',
  },
]

const TRUST_POINTS = [
  'Fonctionne même en coupure réseau, se resynchronise automatiquement',
  'Export CSV / Excel / PDF de vos données à tout moment',
  "IA (DeepSeek & Perplexity) utilisée pour analyser vos vraies données — jamais pour en inventer",
]

export default function PublicLanding() {
  return (
    <div style={{ background: DARK_BG, color: '#f5efe8', minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      {/* Navigation */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(24, 19, 16, 0.85)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(245, 239, 232, 0.08)',
        }}
      >
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <strong style={{ fontSize: 18, letterSpacing: 0.5 }}>🍽️ Restau CRM</strong>
          <nav style={{ display: 'flex', gap: 24, fontSize: 13.5, fontWeight: 600 }} className="public-landing-nav">
            <a href="#fonctionnalites" style={{ color: '#cfc3b8' }}>Fonctionnalités</a>
            <a href="#ia" style={{ color: '#cfc3b8' }}>Intelligence IA</a>
            <Link to="/devenir-partenaire" style={{ color: '#cfc3b8' }}>Devenir partenaire</Link>
          </nav>
          <Link
            to="/app"
            style={{
              padding: '10px 22px',
              borderRadius: 999,
              background: ACCENT,
              color: '#1a1210',
              fontWeight: 800,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              whiteSpace: 'nowrap',
            }}
          >
            Accéder à l'app
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '90px 24px 60px', textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '7px 18px',
            borderRadius: 999,
            background: 'rgba(192, 121, 58, 0.15)',
            color: ACCENT,
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 28,
          }}
        >
          Outil interne · Prospection B2B Dakar &amp; Banlieue
        </span>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 900, lineHeight: 1.15, margin: '0 0 20px' }}>
          Votre prospection terrain,{' '}
          <span style={{ color: ACCENT }}>propulsée par l'Intelligence Artificielle.</span>
        </h1>
        <p style={{ fontSize: 16, color: '#cfc3b8', lineHeight: 1.6, maxWidth: 620, margin: '0 auto 36px' }}>
          Restau CRM centralise la prospection, le scoring IA, la veille tarifaire et la relation
          commerciale avec les restaurants de Dakar &amp; banlieue, pour toute l'équipe NDUGUMi.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/app"
            style={{
              padding: '16px 32px',
              borderRadius: 999,
              background: ACCENT,
              color: '#1a1210',
              fontWeight: 800,
              fontSize: 13.5,
              textTransform: 'uppercase',
              letterSpacing: 1,
              boxShadow: `0 12px 30px -8px ${ACCENT}80`,
            }}
          >
            Accéder à l'application →
          </Link>
          <Link
            to="/devenir-partenaire"
            style={{
              padding: '16px 32px',
              borderRadius: 999,
              background: 'rgba(245, 239, 232, 0.06)',
              border: '1px solid rgba(245, 239, 232, 0.15)',
              color: '#f5efe8',
              fontWeight: 800,
              fontSize: 13.5,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Vous êtes restaurateur ?
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap', marginTop: 72 }}>
          {[
            ['235+', 'Restaurants répertoriés à Dakar & banlieue'],
            ['32', 'Modules métier (prospection, IA, logistique…)'],
            ['100%', 'Données réelles — zéro simulation'],
          ].map(([n, label]) => (
            <div key={label} style={{ minWidth: 160 }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: '#fff' }}>{n}</div>
              <div style={{ fontSize: 12.5, color: '#a89a8d', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" style={{ maxWidth: 1120, margin: '0 auto', padding: '50px 24px' }}>
        <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 44px' }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 12px' }}>Des outils pensés pour le terrain</h2>
          <p style={{ color: '#a89a8d', fontSize: 14.5, margin: 0 }}>
            32 modules construits au fil des retours de l'équipe commerciale — pas de fonctionnalité décorative.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: DARK_PANEL,
                border: '1px solid rgba(245, 239, 232, 0.08)',
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15.5, fontWeight: 800, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#a89a8d', lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Confiance / IA */}
      <section id="ia" style={{ maxWidth: 1120, margin: '0 auto', padding: '30px 24px 70px' }}>
        <div
          style={{
            background: DARK_PANEL,
            border: '1px solid rgba(245, 239, 232, 0.08)',
            borderRadius: 20,
            padding: '40px clamp(20px, 5vw, 56px)',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
            gap: 32,
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 14px' }}>Construit pour aller vite, honnêtement.</h2>
            <p style={{ fontSize: 14, color: '#cfc3b8', lineHeight: 1.7, margin: 0 }}>
              Chaque module IA de Restau CRM s'appuie sur vos vraies données de terrain — relevés,
              conversations, photos. Quand l'information manque, l'outil le dit clairement plutôt que
              d'inventer un chiffre.
            </p>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {TRUST_POINTS.map((p) => (
              <li key={p} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: '#f5efe8' }}>
                <span style={{ color: ACCENT, fontWeight: 900 }}>✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA final */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 90px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 22px' }}>Prêt à passer sur le terrain ?</h2>
        <Link
          to="/app"
          style={{
            display: 'inline-block',
            padding: '16px 40px',
            borderRadius: 999,
            background: PRIMARY_RED,
            color: '#fff',
            fontWeight: 800,
            fontSize: 13.5,
            textTransform: 'uppercase',
            letterSpacing: 1,
            boxShadow: `0 12px 30px -8px ${PRIMARY_RED}90`,
          }}
        >
          Accéder à l'application
        </Link>
        <p style={{ fontSize: 12, color: '#a89a8d', marginTop: 16 }}>
          Réservé à l'équipe commerciale NDUGUMi — un simple choix de nom, sans mot de passe.
        </p>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(245, 239, 232, 0.08)',
          padding: '28px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          maxWidth: 1120,
          margin: '0 auto',
          fontSize: 12.5,
          color: '#a89a8d',
        }}
      >
        <span>Restau CRM (NDUGUMi) © 2026 · Dakar, Sénégal</span>
        <Link to="/devenir-partenaire" style={{ color: '#a89a8d' }}>Devenir partenaire</Link>
      </footer>
    </div>
  )
}
