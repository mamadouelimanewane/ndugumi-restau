import { useCrmStore } from '../store/useCrmStore'

export default function WhoAreYou() {
  const agents = useCrmStore((s) => s.agents)
  const userProfiles = useCrmStore((s) => s.userProfiles)
  const setCurrentAgent = useCrmStore((s) => s.setCurrentAgent)

  const activeAgents = agents.filter((a) => a !== 'Non assigné' && (userProfiles[a]?.actif ?? true))

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="panel" style={{ maxWidth: 420, width: '100%' }}>
        <h2 style={{ marginTop: 0, color: 'var(--primary-dark)' }}>Qui êtes-vous ?</h2>
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
          Sert uniquement à préremplir votre nom sur les notes, tâches et messages envoyés — ce n'est{' '}
          <strong>pas</strong> une connexion sécurisée (pas de mot de passe).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {activeAgents.map((a) => (
            <button key={a} className="btn" onClick={() => setCurrentAgent(a)}>
              {a}
            </button>
          ))}
        </div>
        {activeAgents.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
            Aucun utilisateur actif configuré — ajoutez-en un depuis « Équipe & paramètres » après être entré.
          </p>
        )}
        <button
          className="btn secondary"
          style={{ marginTop: 16, width: '100%' }}
          onClick={() => setCurrentAgent('Non assigné')}
        >
          Continuer sans choisir
        </button>
      </div>
    </div>
  )
}
