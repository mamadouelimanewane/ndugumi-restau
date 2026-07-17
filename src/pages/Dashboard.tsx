import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects, isLate, isToday } from '../utils/joined'
import { STATUTS, STATUT_LABELS, STATUT_COLORS, CLIENT_STATUTS } from '../types'
import StatutBadge from '../components/StatutBadge'

export default function Dashboard() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const tasks = useCrmStore((s) => s.tasks)
  const agents = useCrmStore((s) => s.agents)
  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const total = joined.length
  const countByStatut = useMemo(() => {
    const m: Record<string, number> = {}
    for (const s of STATUTS) m[s] = 0
    for (const j of joined) m[j.crm.statut]++
    return m
  }, [joined])

  const clients = STATUTS.filter((s) => CLIENT_STATUTS.includes(s) && s !== 'client_inactif').reduce(
    (acc, s) => acc + countByStatut[s],
    0
  )
  const conversion = total ? ((clients / total) * 100).toFixed(1) : '0.0'
  const enCours = total - countByStatut['nouveau'] - countByStatut['refuse'] - countByStatut['client_inactif']

  const relancesRetard = joined.filter((j) => isLate(j.crm.prochaineRelance))
  const relancesAujourdhui = joined.filter((j) => isToday(j.crm.prochaineRelance))

  const taskList = Object.values(tasks)
  const tachesEnRetard = taskList.filter((t) => t.statut === 'a_faire' && isLate(t.dateEcheance))
  const inscritsNdugumi = joined.filter((j) => j.crm.ndugumi.inscrit).length

  const byZone = useMemo(() => {
    const m: Record<string, number> = {}
    for (const j of joined) m[j.zone] = (m[j.zone] ?? 0) + 1
    return m
  }, [joined])

  const byQuartier = useMemo(() => {
    const m: Record<string, { total: number; clients: number }> = {}
    for (const j of joined) {
      if (!m[j.quartier]) m[j.quartier] = { total: 0, clients: 0 }
      m[j.quartier].total++
      if (CLIENT_STATUTS.includes(j.crm.statut) && j.crm.statut !== 'client_inactif') m[j.quartier].clients++
    }
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total)
  }, [joined])

  const leaderboard = useMemo(() => {
    return agents
      .filter((a) => a !== 'Non assigné')
      .map((a) => {
        const mine = joined.filter((j) => (j.crm.agent || 'Non assigné') === a)
        const won = mine.filter((j) => CLIENT_STATUTS.includes(j.crm.statut) && j.crm.statut !== 'client_inactif')
        return {
          agent: a,
          assignes: mine.length,
          signes: won.length,
          taux: mine.length ? ((won.length / mine.length) * 100).toFixed(0) : '0',
        }
      })
      .sort((a, b) => b.signes - a.signes || b.assignes - a.assignes)
  }, [agents, joined])

  const funnelSteps: (typeof STATUTS)[number][] = ['nouveau', 'contacte', 'interesse', 'rdv', 'negociation', 'signe']
  const funnelMax = Math.max(1, ...funnelSteps.map((s) => countByStatut[s]))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">
            Vue d'ensemble de la relation client — prospection restaurants pour NDUGUMi
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{total}</div>
          <div className="kpi-label">Restaurants au total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{enCours}</div>
          <div className="kpi-label">En cours de prospection</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{clients}</div>
          <div className="kpi-label">Signés / clients actifs</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{conversion}%</div>
          <div className="kpi-label">Taux de conversion</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: relancesRetard.length ? 'var(--danger)' : undefined }}>
            {relancesRetard.length}
          </div>
          <div className="kpi-label">Relances en retard</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: tachesEnRetard.length ? 'var(--danger)' : undefined }}>
            {tachesEnRetard.length}
          </div>
          <div className="kpi-label">Tâches en retard</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{inscritsNdugumi}</div>
          <div className="kpi-label">Inscrits sur NDUGUMi</div>
        </div>
      </div>

      <div className="panel">
        <h3>Entonnoir de conversion</h3>
        {funnelSteps.map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 130, fontSize: 12, color: 'var(--text-dim)' }}>{STATUT_LABELS[s]}</div>
            <div style={{ flex: 1, background: '#efe9de', borderRadius: 5, overflow: 'hidden', height: 20 }}>
              <div
                style={{
                  width: `${(countByStatut[s] / funnelMax) * 100}%`,
                  background: STATUT_COLORS[s],
                  height: '100%',
                  minWidth: countByStatut[s] > 0 ? 4 : 0,
                }}
              />
            </div>
            <div style={{ width: 30, fontSize: 12.5, fontWeight: 700, textAlign: 'right' }}>
              {countByStatut[s]}
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>Répartition par statut</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {STATUTS.map((s) => (
            <div
              key={s}
              style={{
                flex: '1 1 140px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 12px',
                borderLeft: `4px solid ${STATUT_COLORS[s]}`,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700 }}>{countByStatut[s]}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{STATUT_LABELS[s]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Classement des agents</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Restaurants assignés</th>
              <th>Signés / clients actifs</th>
              <th>Taux de conversion</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((l) => (
              <tr key={l.agent}>
                <td>{l.agent}</td>
                <td>{l.assignes}</td>
                <td>{l.signes}</td>
                <td>{l.taux}%</td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  Aucun agent configuré. Rendez-vous dans « Équipe » pour en ajouter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Par zone</h3>
        <div style={{ display: 'flex', gap: 20 }}>
          {Object.entries(byZone).map(([zone, count]) => (
            <div key={zone}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{count}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{zone}</div>
            </div>
          ))}
        </div>
      </div>

      {(relancesRetard.length > 0 || relancesAujourdhui.length > 0) && (
        <div className="panel">
          <h3>Relances à traiter</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Établissement</th>
                <th>Quartier</th>
                <th>Statut</th>
                <th>Relance prévue</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...relancesRetard, ...relancesAujourdhui].map((j) => (
                <tr key={j.id}>
                  <td>{j.etablissement}</td>
                  <td>{j.quartier}</td>
                  <td>
                    <StatutBadge statut={j.crm.statut} />
                  </td>
                  <td style={{ color: isLate(j.crm.prochaineRelance) ? 'var(--danger)' : 'inherit' }}>
                    {j.crm.prochaineRelance}
                  </td>
                  <td>
                    <Link className="btn small secondary" to={`/prospects/${j.id}`}>
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel">
        <h3>Top quartiers / communes</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Quartier / commune</th>
              <th>Restaurants</th>
              <th>Clients</th>
            </tr>
          </thead>
          <tbody>
            {byQuartier.map(([q, v]) => (
              <tr key={q}>
                <td>{q}</td>
                <td>{v.total}</td>
                <td>{v.clients}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
