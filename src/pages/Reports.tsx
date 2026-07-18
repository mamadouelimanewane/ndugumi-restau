import { useMemo } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { startOfMonth } from '../utils/calendar'
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

function inRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

function formatDelta(current: number, previous: number): { text: string; color: string } {
  const diff = current - previous
  if (previous === 0) {
    if (diff === 0) return { text: '=', color: 'var(--text-dim)' }
    return { text: `+${diff}`, color: 'var(--ok)' }
  }
  const pct = Math.round((diff / previous) * 100)
  const sign = diff > 0 ? '+' : ''
  const color = diff > 0 ? 'var(--ok)' : diff < 0 ? 'var(--danger)' : 'var(--text-dim)'
  return { text: `${sign}${diff} (${sign}${pct}%)`, color }
}

export default function Reports() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const tasks = useCrmStore((s) => s.tasks)

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const monthlyComparison = useMemo(() => {
    const now = new Date()
    const currentStart = startOfMonth(now)
    const prevStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1)

    function computeFor(start: Date, end: Date) {
      let newProspects = 0
      let newSignings = 0
      let interactions = 0
      let tasksCreated = 0
      for (const j of joined) {
        if (inRange(j.crm.createdAt, start, end)) newProspects++
        for (const h of j.crm.statutHistory) {
          if (h.statut === 'signe' && inRange(h.date, start, end)) newSignings++
        }
        for (const n of j.crm.notes) {
          if (inRange(n.date, start, end)) interactions++
        }
      }
      for (const t of Object.values(tasks)) {
        if (inRange(t.createdAt, start, end)) tasksCreated++
      }
      return { newProspects, newSignings, interactions, tasksCreated }
    }

    return {
      current: computeFor(currentStart, now),
      previous: computeFor(prevStart, currentStart),
      currentLabel: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      previousLabel: prevStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    }
  }, [joined, tasks])

  const COMPARISON_ROWS: { key: 'newProspects' | 'newSignings' | 'interactions' | 'tasksCreated'; label: string }[] = [
    { key: 'newProspects', label: 'Nouveaux prospects ajoutés' },
    { key: 'newSignings', label: 'Nouvelles signatures' },
    { key: 'interactions', label: 'Interactions enregistrées' },
    { key: 'tasksCreated', label: 'Tâches créées' },
  ]

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
        <h3>Comparaison mensuelle</h3>
        <p className="page-subtitle" style={{ margin: '0 0 14px' }}>
          {monthlyComparison.currentLabel} (depuis le 1er, à ce jour) vs {monthlyComparison.previousLabel} (mois complet)
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Indicateur</th>
              <th>{monthlyComparison.previousLabel}</th>
              <th>{monthlyComparison.currentLabel} (à ce jour)</th>
              <th>Évolution</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map(({ key, label }) => {
              const current = monthlyComparison.current[key]
              const previous = monthlyComparison.previous[key]
              const delta = formatDelta(current, previous)
              return (
                <tr key={key}>
                  <td>{label}</td>
                  <td>{previous}</td>
                  <td>{current}</td>
                  <td style={{ color: delta.color, fontWeight: 600 }}>{delta.text}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
