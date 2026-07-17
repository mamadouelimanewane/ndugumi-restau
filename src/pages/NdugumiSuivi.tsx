import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { CLIENT_STATUTS, SANTE_LABELS, SANTE_COLORS, STATUT_LABELS, type SanteCompte } from '../types'

export default function NdugumiSuivi() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const merchantPortalUrl = useCrmStore((s) => s.merchantPortalUrl)
  const navigate = useNavigate()

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const [inscritFilter, setInscritFilter] = useState<'' | 'oui' | 'non'>('')
  const [santeFilter, setSanteFilter] = useState<SanteCompte | ''>('')

  const clients = useMemo(
    () => joined.filter((j) => CLIENT_STATUTS.includes(j.crm.statut) && j.crm.statut !== 'client_inactif'),
    [joined]
  )
  const inscrits = joined.filter((j) => j.crm.ndugumi.inscrit)
  const clientsNonInscrits = clients.filter((j) => !j.crm.ndugumi.inscrit)
  const aRisque = clients.filter((j) => j.crm.deal.santeCompte === 'a_risque')
  const churn = joined.filter((j) => j.crm.deal.santeCompte === 'churn')

  const filtered = useMemo(() => {
    return joined.filter((j) => {
      if (!j.crm.ndugumi.inscrit && !CLIENT_STATUTS.includes(j.crm.statut)) return false
      if (inscritFilter === 'oui' && !j.crm.ndugumi.inscrit) return false
      if (inscritFilter === 'non' && j.crm.ndugumi.inscrit) return false
      if (santeFilter && j.crm.deal.santeCompte !== santeFilter) return false
      return true
    })
  }, [joined, inscritFilter, santeFilter])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Suivi NDUGUMi</h1>
          <p className="page-subtitle">Adoption de l'application par les restaurants clients</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{inscrits.length}</div>
          <div className="kpi-label">Inscrits sur l'appli</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: clientsNonInscrits.length ? 'var(--danger)' : undefined }}>
            {clientsNonInscrits.length}
          </div>
          <div className="kpi-label">Clients signés mais pas encore inscrits</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: aRisque.length ? 'var(--warn)' : undefined }}>
            {aRisque.length}
          </div>
          <div className="kpi-label">Comptes clients à risque</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: churn.length ? 'var(--danger)' : undefined }}>
            {churn.length}
          </div>
          <div className="kpi-label">Comptes perdus (churn)</div>
        </div>
      </div>

      {clientsNonInscrits.length > 0 && (
        <div className="panel" style={{ borderLeft: '4px solid var(--danger)' }}>
          <h3>⚠️ Clients signés mais pas encore inscrits sur l'appli</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 0 }}>
            Ces restaurants ont accepté de devenir clients mais n'utilisent pas encore l'application — à
            accompagner en priorité pour finaliser l'inscription.
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Établissement</th>
                <th>Quartier</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientsNonInscrits.map((j) => (
                <tr key={j.id} onClick={() => navigate(`/prospects/${j.id}`)} style={{ cursor: 'pointer' }}>
                  <td>{j.etablissement}</td>
                  <td>{j.quartier}</td>
                  <td>{STATUT_LABELS[j.crm.statut]}</td>
                  <td>
                    <button className="btn secondary small" onClick={(e) => { e.stopPropagation(); navigate(`/prospects/${j.id}`) }}>
                      Ouvrir la fiche
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel">
        <h3>Tous les comptes (clients ou inscrits)</h3>
        <div className="filters-bar">
          <select value={inscritFilter} onChange={(e) => setInscritFilter(e.target.value as '' | 'oui' | 'non')}>
            <option value="">Inscription (tous)</option>
            <option value="oui">Inscrits</option>
            <option value="non">Non inscrits</option>
          </select>
          <select value={santeFilter} onChange={(e) => setSanteFilter(e.target.value as SanteCompte | '')}>
            <option value="">Santé (tous)</option>
            {(Object.keys(SANTE_LABELS) as SanteCompte[]).map((s) => (
              <option key={s} value={s}>
                {SANTE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Établissement</th>
              <th>Quartier</th>
              <th>Inscrit NDUGUMi</th>
              <th>Date d'inscription</th>
              <th>Commandes / mois</th>
              <th>Volume mensuel</th>
              <th>Santé</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((j) => (
              <tr key={j.id}>
                <td>{j.etablissement}</td>
                <td>{j.quartier}</td>
                <td>
                  {j.crm.ndugumi.inscrit ? (
                    <span className="badge" style={{ background: 'var(--ok)' }}>
                      Inscrit
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{j.crm.ndugumi.dateInscription ?? '—'}</td>
                <td>{j.crm.deal.nombreCommandesMensuel ?? '—'}</td>
                <td>{j.crm.deal.volumeEstimeMensuel ? j.crm.deal.volumeEstimeMensuel.toLocaleString('fr-FR') + ' FCFA' : '—'}</td>
                <td>
                  <span className="badge" style={{ background: SANTE_COLORS[j.crm.deal.santeCompte] }}>
                    {SANTE_LABELS[j.crm.deal.santeCompte]}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn secondary small" onClick={() => navigate(`/prospects/${j.id}`)}>
                    Fiche
                  </button>
                  <a href={merchantPortalUrl} target="_blank" rel="noopener noreferrer">
                    <button className="btn secondary small">Commandes ↗</button>
                  </a>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-state">
                  Aucun compte ne correspond à ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
