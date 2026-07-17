import { useMemo } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { exportProspectsCsv } from '../utils/csv'
import { exportProspectsPdf, exportClientsPdf } from '../utils/pdf'
import { exportProspectsXlsx, exportClientsXlsx } from '../utils/excel'
import {
  CLIENT_STATUTS,
  INTERACTION_LABELS,
  SANTE_LABELS,
  SANTE_COLORS,
  type InteractionType,
  type SanteCompte,
} from '../types'

function formatFcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

export default function Reports() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const clients = useMemo(
    () => joined.filter((j) => CLIENT_STATUTS.includes(j.crm.statut) && j.crm.statut !== 'client_inactif'),
    [joined]
  )

  const volumeTotal = clients.reduce((acc, j) => acc + (j.crm.deal.volumeEstimeMensuel ?? 0), 0)
  const commandesTotal = clients.reduce((acc, j) => acc + (j.crm.deal.nombreCommandesMensuel ?? 0), 0)
  const clientsActifsNdugumi = clients.filter((j) => j.crm.ndugumi.inscrit).length

  const santeCounts = useMemo(() => {
    const m: Record<SanteCompte, number> = { bonne: 0, a_risque: 0, churn: 0 }
    for (const j of clients) m[j.crm.deal.santeCompte]++
    return m
  }, [clients])

  const interactionCounts = useMemo(() => {
    const m: Record<InteractionType, number> = { appel: 0, visite: 0, whatsapp: 0, email: 0, proposition: 0, autre: 0 }
    for (const j of joined) for (const n of j.crm.notes) m[n.type]++
    return m
  }, [joined])
  const totalInteractions = Object.values(interactionCounts).reduce((a, b) => a + b, 0)
  const interactionMax = Math.max(1, ...Object.values(interactionCounts))

  const interactionsByAgent = useMemo(() => {
    const m: Record<string, number> = {}
    for (const j of joined) for (const n of j.crm.notes) m[n.agent] = (m[n.agent] ?? 0) + 1
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [joined])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rapports</h1>
          <p className="page-subtitle">Volumes de commandes, santé des comptes clients et activité commerciale</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={() => exportProspectsCsv(joined)}>
            Exporter tout en CSV
          </button>
          <button className="btn secondary" onClick={() => exportProspectsXlsx(joined)}>
            Exporter tout en Excel
          </button>
          <button className="btn secondary" onClick={() => exportProspectsPdf(joined, 'Répertoire complet')}>
            Exporter tout en PDF
          </button>
          <button className="btn secondary" onClick={() => exportClientsXlsx(clients)}>
            Exporter les clients en Excel
          </button>
          <button className="btn secondary" onClick={() => exportClientsPdf(clients)}>
            Exporter les clients en PDF
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{clients.length}</div>
          <div className="kpi-label">Clients (signés + actifs)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ fontSize: 19 }}>
            {formatFcfa(volumeTotal)}
          </div>
          <div className="kpi-label">Valeur de marché commandée / mois (cumulée)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{commandesTotal}</div>
          <div className="kpi-label">Commandes de marché / mois (cumulées)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{clientsActifsNdugumi}</div>
          <div className="kpi-label">Clients utilisant activement l'appli</div>
        </div>
      </div>

      <div className="panel">
        <h3>Santé des comptes clients</h3>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {(Object.keys(SANTE_LABELS) as SanteCompte[]).map((s) => (
            <div
              key={s}
              style={{
                flex: '1 1 160px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 12px',
                borderLeft: `4px solid ${SANTE_COLORS[s]}`,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700 }}>{santeCounts[s]}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{SANTE_LABELS[s]}</div>
            </div>
          ))}
        </div>
        {clients.length > 0 && (
          <table className="data-table" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Client</th>
                <th>Quartier</th>
                <th>Commandes / mois</th>
                <th>Volume mensuel</th>
                <th>Compte NDUGUMi</th>
                <th>Santé du compte</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((j) => (
                <tr key={j.id}>
                  <td>{j.etablissement}</td>
                  <td>{j.quartier}</td>
                  <td>{j.crm.deal.nombreCommandesMensuel ?? '—'}</td>
                  <td>{j.crm.deal.volumeEstimeMensuel !== null ? formatFcfa(j.crm.deal.volumeEstimeMensuel) : '—'}</td>
                  <td>{j.crm.ndugumi.inscrit ? 'Actif' : '—'}</td>
                  <td>
                    <span className="badge" style={{ background: SANTE_COLORS[j.crm.deal.santeCompte] }}>
                      {SANTE_LABELS[j.crm.deal.santeCompte]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h3>Activité commerciale — {totalInteractions} interactions au total</h3>
        {(Object.keys(INTERACTION_LABELS) as InteractionType[]).map((t) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 90, fontSize: 12, color: 'var(--text-dim)' }}>{INTERACTION_LABELS[t]}</div>
            <div style={{ flex: 1, background: '#efe9de', borderRadius: 5, overflow: 'hidden', height: 18 }}>
              <div
                style={{
                  width: `${(interactionCounts[t] / interactionMax) * 100}%`,
                  background: 'var(--accent)',
                  height: '100%',
                  minWidth: interactionCounts[t] > 0 ? 4 : 0,
                }}
              />
            </div>
            <div style={{ width: 30, fontSize: 12.5, fontWeight: 700, textAlign: 'right' }}>
              {interactionCounts[t]}
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>Interactions par agent</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Nombre d'interactions enregistrées</th>
            </tr>
          </thead>
          <tbody>
            {interactionsByAgent.map(([agent, count]) => (
              <tr key={agent}>
                <td>{agent}</td>
                <td>{count}</td>
              </tr>
            ))}
            {interactionsByAgent.length === 0 && (
              <tr>
                <td colSpan={2} className="empty-state">
                  Aucune interaction enregistrée pour l'instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
