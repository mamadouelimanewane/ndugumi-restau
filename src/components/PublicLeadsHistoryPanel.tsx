import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

interface PublicLead {
  id: string
  etablissement: string
  telephone: string
  quartier: string | null
  created_at: string
  converted: boolean
  restaurant_id: number | null
}

export default function PublicLeadsHistoryPanel() {
  const [leads, setLeads] = useState<PublicLead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/lead?all=true')
      .then((res) => res.json())
      .then((data) => setLeads(data.leads ?? []))
      .catch((e) => console.error('Erreur chargement historique leads publics', e))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const total = leads.length
    const converted = leads.filter((l) => l.converted && l.restaurant_id != null).length
    const ignored = leads.filter((l) => l.converted && l.restaurant_id == null).length
    const pending = leads.filter((l) => !l.converted).length
    return { total, converted, ignored, pending }
  }, [leads])

  if (loading) return null

  return (
    <div className="panel" style={{ marginBottom: 24 }}>
      <h3 style={{ marginBottom: 4 }}>📥 Leads du formulaire public « Devenir partenaire »</h3>
      <p className="page-subtitle" style={{ margin: '0 0 14px' }}>
        Historique complet des demandes reçues via <code>/devenir-partenaire</code>
      </p>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: '1 1 140px', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.total}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Reçues au total</div>
        </div>
        <div style={{ flex: '1 1 140px', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.pending}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>En attente</div>
        </div>
        <div style={{ flex: '1 1 140px', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.converted}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Converties en prospect</div>
        </div>
        <div style={{ flex: '1 1 140px', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', borderLeft: '4px solid var(--text-dim)' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.ignored}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Ignorées</div>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="empty-state">Aucune demande reçue pour l'instant.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Établissement</th>
              <th>Téléphone</th>
              <th>Quartier</th>
              <th>Reçue le</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const statusLabel = !l.converted ? 'En attente' : l.restaurant_id != null ? 'Convertie' : 'Ignorée'
              const statusColor = !l.converted ? '#f59e0b' : l.restaurant_id != null ? '#16a34a' : 'var(--text-dim)'
              return (
                <tr key={l.id}>
                  <td>{l.etablissement}</td>
                  <td>{l.telephone}</td>
                  <td>{l.quartier || '—'}</td>
                  <td style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                  <td>
                    <span className="badge" style={{ background: statusColor, color: '#fff' }}>
                      {statusLabel}
                    </span>
                    {l.restaurant_id != null && (
                      <Link to={`/prospects/${l.restaurant_id}`} style={{ marginLeft: 6, fontSize: 11.5 }}>
                        Voir la fiche →
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
