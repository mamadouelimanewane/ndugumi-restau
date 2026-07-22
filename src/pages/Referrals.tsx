import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { CLIENT_STATUTS } from '../types'

export default function Referrals() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const setParrain = useCrmStore((s) => s.setParrain)
  const navigate = useNavigate()

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const clientList = useMemo(() => joined.filter((j) => CLIENT_STATUTS.includes(j.crm.statut)), [joined])

  const [selectedFilleulId, setSelectedFilleulId] = useState('')
  const [selectedParrainId, setSelectedParrainId] = useState('')

  function handleAssignParrain() {
    const filleulId = Number(selectedFilleulId)
    const parrainId = Number(selectedParrainId)
    if (!filleulId || !parrainId || filleulId === parrainId) {
      alert("Veuillez sélectionner un filleul et un parrain distincts.")
      return
    }
    setParrain(filleulId, parrainId)
    setSelectedFilleulId('')
    setSelectedParrainId('')
    alert("Parrainage associé avec succès !")
  }

  const referralTree = useMemo(() => {
    return joined.map((j) => {
      const parrainId = j.crm.referral?.parrainId
      const parrainObj = parrainId ? joined.find((p) => p.id === parrainId) : null
      const filleuls = joined.filter((p) => p.crm.referral?.parrainId === j.id)

      return {
        restaurant: j,
        parrainObj,
        filleuls,
      }
    })
  }, [joined])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🎁 Programme de Parrainage B2B</h1>
          <p className="page-subtitle">Réseau de recommandation inter-restaurants & attribution des remises</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3>Association de Parrainage</h3>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
          Lorsqu'un restaurant client recommande un établissement confrère dans son quartier, associez-les pour leur attribuer un bon d'achat NDUGUMi.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Restaurant Filleul (Nouveau)</label>
            <select value={selectedFilleulId} onChange={(e) => setSelectedFilleulId(e.target.value)} style={{ padding: 8, borderRadius: 6, minWidth: 220 }}>
              <option value="">Choisir le filleul...</option>
              {joined.map((j) => (
                <option key={j.id} value={j.id}>{j.etablissement} ({j.quartier})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Restaurant Parrain (Recommandeur)</label>
            <select value={selectedParrainId} onChange={(e) => setSelectedParrainId(e.target.value)} style={{ padding: 8, borderRadius: 6, minWidth: 220 }}>
              <option value="">Choisir le parrain...</option>
              {clientList.map((c) => (
                <option key={c.id} value={c.id}>{c.etablissement} ({c.quartier})</option>
              ))}
            </select>
          </div>

          <button className="btn primary" onClick={handleAssignParrain} disabled={!selectedFilleulId || !selectedParrainId}>
            🎁 Valider le Parrainage (2 000 FCFA Offerts)
          </button>
        </div>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Restaurant</th>
              <th>Quartier</th>
              <th>Code Parrainage</th>
              <th>Parrain (Qui l'a recommandé ?)</th>
              <th>Filleuls (Combien a-t-il recommandé ?)</th>
            </tr>
          </thead>
          <tbody>
            {referralTree.map((item) => {
              const j = item.restaurant
              const code = j.crm.referral?.referralCode || `NDUG-${j.id}`
              return (
                <tr key={j.id}>
                  <td>
                    <strong style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/prospects/${j.id}`)}>
                      {j.etablissement}
                    </strong>
                  </td>
                  <td>{j.quartier}</td>
                  <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{code}</code></td>
                  <td>
                    {item.parrainObj ? (
                      <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                        🤝 Parrainé par {item.parrainObj.etablissement}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {item.filleuls.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {item.filleuls.map((f) => (
                          <span key={f.id} className="badge" style={{ background: '#ecfdf5', color: '#047857' }}>
                            🎉 {f.etablissement}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '0 filleul'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
