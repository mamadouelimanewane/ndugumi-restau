import { useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { STATUTS, STATUT_LABELS, type Statut, type Zone } from '../types'

interface EditRestaurantModalProps {
  restaurantId: number
  onClose: () => void
  onSaved?: () => void
  onDeleted?: () => void
}

export default function EditRestaurantModal({ restaurantId, onClose, onSaved, onDeleted }: EditRestaurantModalProps) {
  const restaurant = useCrmStore((s) => s.restaurants[restaurantId])
  const prospect = useCrmStore((s) => s.prospects[restaurantId])
  const agents = useCrmStore((s) => s.agents)
  
  const updateRestaurant = useCrmStore((s) => s.updateRestaurant)
  const setStatut = useCrmStore((s) => s.setStatut)
  const setAgent = useCrmStore((s) => s.setAgent)
  const setConcurrent = useCrmStore((s) => s.setConcurrent)
  const setTags = useCrmStore((s) => s.setTags)
  const updateGpsCoords = useCrmStore((s) => s.updateGpsCoords)
  const deleteRestaurant = useCrmStore((s) => s.deleteRestaurant)

  const [etablissement, setEtablissement] = useState(restaurant?.etablissement || '')
  const [telephone, setTelephone] = useState(restaurant?.telephone || '')
  const [quartier, setQuartier] = useState(restaurant?.quartier || '')
  const [zone, setZone] = useState<Zone>(restaurant?.zone || 'Dakar intra-muros')
  const [statut, setStatutState] = useState<Statut>(prospect?.statut || 'nouveau')
  const [agent, setAgentState] = useState(prospect?.agent || agents[0] || 'Non assigné')
  const [concurrentActuel, setConcurrentActuel] = useState(prospect?.concurrentActuel || '')
  const [tagsInput, setTagsInput] = useState(prospect?.tags ? prospect.tags.join(', ') : '')
  const [exactLat, setExactLat] = useState<string>(restaurant?.exactLat ? String(restaurant.exactLat) : '')
  const [exactLng, setExactLng] = useState<string>(restaurant?.exactLng ? String(restaurant.exactLng) : '')

  if (!restaurant) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!etablissement.trim() || !quartier.trim()) {
      alert('Veuillez remplir au moins le nom du restaurant et le quartier.')
      return
    }

    const latNum = exactLat.trim() ? parseFloat(exactLat.trim()) : undefined
    const lngNum = exactLng.trim() ? parseFloat(exactLng.trim()) : undefined

    updateRestaurant(restaurantId, {
      etablissement: etablissement.trim(),
      telephone: telephone.trim() || 'Non communiqué',
      quartier: quartier.trim(),
      zone,
      ...(latNum !== undefined && lngNum !== undefined ? { exactLat: latNum, exactLng: lngNum } : {}),
    })

    if (latNum !== undefined && lngNum !== undefined && !isNaN(latNum) && !isNaN(lngNum)) {
      updateGpsCoords(restaurantId, latNum, lngNum)
    }

    setStatut(restaurantId, statut)
    setAgent(restaurantId, agent)
    setConcurrent(restaurantId, concurrentActuel.trim())

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
    setTags(restaurantId, parsedTags)

    alert('✅ Restaurant mis à jour avec succès !')
    if (onSaved) onSaved()
    onClose()
  }

  function handleDelete() {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${restaurant.etablissement}" ?\nCette action est irréversible.`)) {
      deleteRestaurant(restaurantId)
      alert('🗑️ Restaurant supprimé avec succès.')
      if (onDeleted) onDeleted()
      onClose()
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 650, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>✏️ Éditer le Restaurant</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer la fenêtre">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>Nom / Adresse de l'établissement *</label>
              <input
                type="text"
                value={etablissement}
                onChange={(e) => setEtablissement(e.target.value)}
                placeholder="Ex : Chez Fatou, Rue 12 Médina"
                required
                style={{ width: '100%', padding: 8, fontSize: 13, marginTop: 4 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>Téléphone</label>
              <input
                type="text"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Ex : 77 123 45 67"
                style={{ width: '100%', padding: 8, fontSize: 13, marginTop: 4 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>Quartier / Commune *</label>
              <input
                type="text"
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
                placeholder="Ex : Médina, Almadies..."
                required
                style={{ width: '100%', padding: 8, fontSize: 13, marginTop: 4 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>Zone géographique</label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value as Zone)}
                style={{ width: '100%', padding: 8, fontSize: 13, marginTop: 4 }}
              >
                <option value="Dakar intra-muros">Dakar intra-muros</option>
                <option value="Banlieue">Banlieue</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>Statut commercial</label>
              <select
                value={statut}
                onChange={(e) => setStatutState(e.target.value as Statut)}
                style={{ width: '100%', padding: 8, fontSize: 13, marginTop: 4 }}
              >
                {STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {STATUT_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>Agent commercial assigné</label>
              <select
                value={agent}
                onChange={(e) => setAgentState(e.target.value)}
                style={{ width: '100%', padding: 8, fontSize: 13, marginTop: 4 }}
              >
                {agents.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>Concurrent actuel</label>
              <input
                type="text"
                value={concurrentActuel}
                onChange={(e) => setConcurrentActuel(e.target.value)}
                placeholder="Ex : Grossiste local, Auchan..."
                style={{ width: '100%', padding: 8, fontSize: 13, marginTop: 4 }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>Tags (séparés par des virgules)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ex : Thiéboudiène, Poisson, Fast-food, Grosse commande"
                style={{ width: '100%', padding: 8, fontSize: 13, marginTop: 4 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>Latitude GPS (optionnel)</label>
              <input
                type="text"
                value={exactLat}
                onChange={(e) => setExactLat(e.target.value)}
                placeholder="Ex : 14.6789"
                style={{ width: '100%', padding: 8, fontSize: 13, marginTop: 4 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>Longitude GPS (optionnel)</label>
              <input
                type="text"
                value={exactLng}
                onChange={(e) => setExactLng(e.target.value)}
                placeholder="Ex : -17.4467"
                style={{ width: '100%', padding: 8, fontSize: 13, marginTop: 4 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button type="button" className="btn secondary" style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }} onClick={handleDelete}>
              🗑️ Supprimer le restaurant
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn secondary" onClick={onClose}>
                Annuler / Fermer
              </button>
              <button type="submit" className="btn primary">
                💾 Enregistrer les modifications
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
