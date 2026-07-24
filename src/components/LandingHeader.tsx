import { Link } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'

export default function LandingHeader() {
  const currentAgent = useCrmStore((s) => s.currentAgent)
  const setCurrentAgent = useCrmStore((s) => s.setCurrentAgent)

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 24px',
        background: '#ffffff',
        borderBottom: '1px solid var(--border)',
        borderRadius: 12,
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #232a3b 0%, #7a1f1f 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 18,
          }}
        >
          R
        </div>
        <div>
          <strong style={{ fontSize: 16, color: 'var(--primary, #7a1f1f)', display: 'block', lineHeight: 1.2 }}>
            Restau CRM
          </strong>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Prospection B2B NDUGUMi — Dakar &amp; Banlieue
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'right' }}>
          Agent : <strong style={{ color: 'var(--text)' }}>{currentAgent}</strong>{' '}
          <button
            onClick={() => setCurrentAgent(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontSize: 11,
              textDecoration: 'underline',
              padding: 0,
              marginLeft: 4,
            }}
          >
            (Changer)
          </button>
        </div>

        <Link to="/dashboard">
          <button
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 800,
              background: '#16a34a',
              color: '#ffffff',
              borderColor: '#15803d',
              padding: '10px 18px',
              fontSize: 14,
              borderRadius: 8,
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
            }}
          >
            <span>Accéder à l'application</span>
            <span>➔</span>
          </button>
        </Link>
      </div>
    </header>
  )
}
