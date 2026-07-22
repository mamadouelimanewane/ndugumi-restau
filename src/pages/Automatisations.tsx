import { useCrmStore } from '../store/useCrmStore'

export default function Automatisations() {
  const settings = useCrmStore((s) => s.settings)
  const setSetting = useCrmStore((s) => s.setSetting)

  const rules = [
    {
      id: 'auto_client_actif',
      nom: 'Conversion automatique (Client)',
      description: "Lorsqu'une nouvelle commande est importée (via le Suivi NDUGUMi) pour un restaurant identifié, son statut passe automatiquement à « Client Actif » s'il ne l'était pas déjà.",
      icon: '✨',
      color: 'var(--ok)',
    },
    {
      id: 'auto_task_on_signe',
      nom: 'Tâche : Appel de bienvenue',
      description: "Lorsqu'un prospect passe au statut « Signé », créer automatiquement une tâche d'appel à J+2 pour le commercial assigné.",
      icon: '📞',
      color: 'var(--accent)',
    },
    {
      id: 'auto_churn_risk',
      nom: 'Alerte : Risque de Churn',
      description: "Si un « Client Actif » n'a aucune commande enregistrée depuis plus de 14 jours, sa santé financière passe automatiquement en « À risque ».",
      icon: '⚠️',
      color: 'var(--warn)',
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Automatisations</h1>
          <p className="page-subtitle">Moteur de règles pour automatiser les tâches répétitives (IF This THEN That)</p>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 800 }}>
        <p style={{ color: 'var(--text-dim)', marginBottom: 24, lineHeight: 1.5 }}>
          Ces règles intelligentes travaillent pour vous en arrière-plan. Elles surveillent les changements (imports de commandes, changements de statut) et déclenchent des actions automatiquement pour vous faire gagner du temps.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rules.map((rule) => {
            const isActive = settings[rule.id] ?? false
            return (
              <div
                key={rule.id}
                style={{
                  display: 'flex',
                  gap: 16,
                  padding: 16,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  backgroundColor: isActive ? '#f8fdfa' : '#fafafa',
                  transition: '0.2s',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ fontSize: 24 }}>{rule.icon}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: isActive ? rule.color : 'inherit' }}>
                    {rule.nom}
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.4 }}>{rule.description}</p>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setSetting(rule.id, e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: rule.color }}
                    />
                    <span style={{ fontWeight: isActive ? 'bold' : 'normal', color: isActive ? 'var(--ok)' : 'var(--text-dim)' }}>
                      {isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
