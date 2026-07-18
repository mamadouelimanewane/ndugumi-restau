import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { findDuplicates } from '../utils/duplicates'
import { STATUT_LABELS } from '../types'

export default function Doublons() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const deleteRestaurant = useCrmStore((s) => s.deleteRestaurant)

  const restaurantList = useMemo(() => Object.values(restaurants), [restaurants])
  const groups = useMemo(() => findDuplicates(restaurantList), [restaurantList])

  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const visibleGroups = groups.filter((g) => !dismissed.has(g.key))

  function handleDelete(id: number, nom: string) {
    if (confirm(`Supprimer définitivement « ${nom} » du CRM ?`)) {
      deleteRestaurant(id)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Doublons potentiels</h1>
          <p className="page-subtitle">
            {visibleGroups.length} groupe{visibleGroups.length > 1 ? 's' : ''} à vérifier — détection heuristique
            (même téléphone, ou nom très similaire dans le même quartier), rien n'est fusionné ni supprimé
            automatiquement
          </p>
        </div>
      </div>

      {visibleGroups.length === 0 ? (
        <div className="empty-state">Aucun doublon potentiel détecté pour l'instant.</div>
      ) : (
        visibleGroups.map((g) => (
          <div className="panel" key={g.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>
                {g.reason === 'telephone' ? '📞 Même numéro de téléphone' : '🔤 Noms très similaires, même quartier'}
              </strong>
              <button className="btn secondary small" onClick={() => setDismissed((prev) => new Set(prev).add(g.key))}>
                Ignorer ce groupe
              </button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Établissement</th>
                  <th>Téléphone</th>
                  <th>Quartier</th>
                  <th>Statut</th>
                  <th>Créé le</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {g.restaurantIds.map((id) => {
                  const r = restaurants[id]
                  const crm = prospects[id]
                  if (!r || !crm) return null
                  return (
                    <tr key={id}>
                      <td>{r.etablissement}</td>
                      <td>{r.telephone}</td>
                      <td>{r.quartier}</td>
                      <td>{STATUT_LABELS[crm.statut]}</td>
                      <td>{new Date(crm.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <Link className="btn small secondary" to={`/prospects/${id}`}>
                          Ouvrir
                        </Link>
                        <button className="btn small secondary" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(id, r.etablissement)}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  )
}
