import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'

export default function AuditLog() {
  const auditLog = useCrmStore((s) => s.auditLog)
  const restaurants = useCrmStore((s) => s.restaurants)
  const agents = useCrmStore((s) => s.agents)

  const [agentFilter, setAgentFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [search, setSearch] = useState('')

  const actions = useMemo(() => {
    const set = new Set(auditLog.map((e) => e.action))
    return Array.from(set).sort()
  }, [auditLog])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return auditLog.filter((e) => {
      if (agentFilter && e.agent !== agentFilter) return false
      if (actionFilter && e.action !== actionFilter) return false
      if (q) {
        const nom = restaurants[e.restaurantId]?.etablissement ?? ''
        if (!nom.toLowerCase().includes(q) && !e.details.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [auditLog, agentFilter, actionFilter, search, restaurants])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Journal d'audit</h1>
          <p className="page-subtitle">
            Historique des actions importantes ({auditLog.length} entrée{auditLog.length > 1 ? 's' : ''}) — statuts,
            agents assignés, comptes clients, pièces jointes, suppressions
          </p>
        </div>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          placeholder="Rechercher un restaurant ou un détail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
          <option value="">Tous les agents</option>
          {agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">Toutes les actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        {(agentFilter || actionFilter || search) && (
          <button
            className="btn secondary small"
            onClick={() => {
              setAgentFilter('')
              setActionFilter('')
              setSearch('')
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Restaurant</th>
              <th>Agent</th>
              <th>Action</th>
              <th>Détails</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((e) => (
              <tr key={e.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(e.date).toLocaleString('fr-FR')}</td>
                <td>{restaurants[e.restaurantId]?.etablissement ?? `#${e.restaurantId} (supprimé)`}</td>
                <td>{e.agent}</td>
                <td>{e.action}</td>
                <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{e.details}</td>
                <td>
                  {restaurants[e.restaurantId] && (
                    <Link className="btn small secondary" to={`/prospects/${e.restaurantId}`}>
                      Ouvrir
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  Aucune entrée d'audit pour l'instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {filtered.length > 300 && (
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', padding: 10 }}>
            Affichage limité aux 300 entrées les plus récentes — affinez les filtres pour cibler plus précisément.
          </div>
        )}
      </div>
    </div>
  )
}
