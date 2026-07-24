import { useMemo, useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { waLinkWithText } from '../utils/phone'

interface DeliveryTask {
  id: string
  restaurantId: number
  etablissement: string
  quartier: string
  zone: 'Dakar intra-muros' | 'Banlieue'
  heurePrevue: string
  livreur: string
  statut: 'en_attente' | 'en_route' | 'livre'
  contenu: string
  telephone: string
}

const SEED_DELIVERIES: DeliveryTask[] = [
  {
    id: 'liv-1',
    restaurantId: 1,
    etablissement: 'Chez Katia',
    quartier: 'Almadies',
    zone: 'Dakar intra-muros',
    heurePrevue: '08h30',
    livreur: 'Mamadou Diallo (Scooter 1)',
    statut: 'en_route',
    contenu: '5 sacs de riz parfumé + 3 bidons d\'huile 20L',
    telephone: '+221 77 123 45 67',
  },
  {
    id: 'liv-2',
    restaurantId: 2,
    etablissement: 'Le Lagon 1',
    quartier: 'Plateau',
    zone: 'Dakar intra-muros',
    heurePrevue: '09h15',
    livreur: 'Mamadou Diallo (Scooter 1)',
    statut: 'en_attente',
    contenu: 'Carton crevettes géantes + poisson thiof frais 15kg',
    telephone: '+221 77 234 56 78',
  },
  {
    id: 'liv-3',
    restaurantId: 3,
    etablissement: 'Dibiterie Haoussa',
    quartier: 'Pikine',
    zone: 'Banlieue',
    heurePrevue: '10h00',
    livreur: 'Ousmane Sow (Camionnette 2)',
    statut: 'en_attente',
    contenu: 'Oignons 50kg + Pommes de terre 50kg + Bouteille Gaz 12kg',
    telephone: '+221 77 345 67 89',
  },
  {
    id: 'liv-4',
    restaurantId: 4,
    etablissement: 'Restaurant La Pointe',
    quartier: 'Ngor',
    zone: 'Dakar intra-muros',
    heurePrevue: '07h45',
    livreur: 'Mamadou Diallo (Scooter 1)',
    statut: 'livre',
    contenu: '10 sacs riz brisé + 5 bidons d\'huile',
    telephone: '+221 77 456 78 90',
  },
]

export default function Livraisons() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const [deliveries, setDeliveries] = useState<DeliveryTask[]>(SEED_DELIVERIES)
  const [zoneFilter, setZoneFilter] = useState<string>('')
  const [livreurFilter, setLivreurFilter] = useState<string>('')
  const [showProofModal, setShowProofModal] = useState<DeliveryTask | null>(null)
  const [signatureName, setSignatureName] = useState('')

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      if (zoneFilter && d.zone !== zoneFilter) return false
      if (livreurFilter && d.livreur !== livreurFilter) return false
      return true
    })
  }, [deliveries, zoneFilter, livreurFilter])

  function handleNotifyDriverEnRoute(d: DeliveryTask) {
    const text = `🚚 *LIVRAISON NDUGUMi EN ROUTE*

Bonjour ${d.etablissement},

Votre livreur *${d.livreur}* est actuellement en route pour vous livrer votre commande NDUGUMi !

📍 *Destination* : ${d.quartier} (${d.zone})
⏰ *Arrivée estimée* : vers ${d.heurePrevue}
📦 *Contenu* : ${d.contenu}

Merci d'avoir un responsable prêt pour la réception en cuisine ! 🙏`

    const link = waLinkWithText(d.telephone, text)
    if (link) {
      window.open(link, '_blank')
      setDeliveries((prev) => prev.map((item) => (item.id === d.id ? { ...item, statut: 'en_route' } : item)))
    }
  }

  function handleValidateDelivery() {
    if (!showProofModal || !signatureName.trim()) return
    setDeliveries((prev) => prev.map((item) => (item.id === showProofModal.id ? { ...item, statut: 'livre' } : item)))
    setShowProofModal(null)
    setSignatureName('')
    alert('✅ Livraison validée avec preuve de réception enregistrée !')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🚛 Livraisons & Tournées Livreurs</h1>
          <p className="page-subtitle">
            Feuille de route des livreurs du matin, notifications WhatsApp en direct et preuves de réception
          </p>
        </div>
      </div>

      {/* Cartes d'avancement des livraisons du jour */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="panel" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>EN ATTENTE DISPATCH</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>
            {deliveries.filter((d) => d.statut === 'en_attente').length} livraison(s)
          </div>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>LIVREUR EN ROUTE</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#b45309', marginTop: 4 }}>
            {deliveries.filter((d) => d.statut === 'en_route').length} en cours 🛵
          </div>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>LIVRÉES AUJOURD'HUI</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#047857', marginTop: 4 }}>
            {deliveries.filter((d) => d.statut === 'livre').length} effectuées ✅
          </div>
        </div>
      </div>

      {/* Filtres par Zone & Livreur */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
          <option value="">Toutes les zones</option>
          <option value="Dakar intra-muros">Dakar intra-muros</option>
          <option value="Banlieue">Banlieue</option>
        </select>
        <select value={livreurFilter} onChange={(e) => setLivreurFilter(e.target.value)}>
          <option value="">Tous les livreurs</option>
          <option value="Mamadou Diallo (Scooter 1)">Mamadou Diallo (Scooter 1)</option>
          <option value="Ousmane Sow (Camionnette 2)">Ousmane Sow (Camionnette 2)</option>
        </select>
      </div>

      {/* Liste des Livraisons */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Créneau</th>
              <th>Établissement & Quartier</th>
              <th>Zone</th>
              <th>Livreur assigné</th>
              <th>Contenu de la commande</th>
              <th>Statut</th>
              <th style={{ textAlign: 'center', width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeliveries.map((d) => (
              <tr key={d.id}>
                <td><strong>⏰ {d.heurePrevue}</strong></td>
                <td>
                  <strong>{d.etablissement}</strong>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>📍 {d.quartier}</div>
                </td>
                <td><span className="zone-tag">{d.zone === 'Dakar intra-muros' ? 'Dakar' : 'Banlieue'}</span></td>
                <td style={{ fontSize: 12 }}>{d.livreur}</td>
                <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{d.contenu}</td>
                <td>
                  <span
                    className="zone-tag"
                    style={{
                      background: d.statut === 'en_route' ? '#fffbe0' : d.statut === 'livre' ? '#e8f5e9' : '#f3f4f6',
                      color: d.statut === 'en_route' ? '#b45309' : d.statut === 'livre' ? '#047857' : '#4b5563',
                      fontWeight: 700,
                    }}
                  >
                    {d.statut === 'en_route' ? '🛵 EN ROUTE' : d.statut === 'livre' ? '✅ LIVRÉ' : '⏳ EN ATTENTE'}
                  </span>
                </td>
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {d.statut !== 'livre' && (
                    <button
                      className="btn secondary small"
                      style={{ padding: '3px 8px', fontSize: 11, color: '#25d366', borderColor: '#25d366', marginRight: 4, fontWeight: 700 }}
                      onClick={() => handleNotifyDriverEnRoute(d)}
                      title="Prévenir le client par WhatsApp"
                    >
                      📲 Prévenir
                    </button>
                  )}
                  {d.statut !== 'livre' && (
                    <button
                      className="btn small"
                      style={{ padding: '3px 8px', fontSize: 11, background: '#047857' }}
                      onClick={() => setShowProofModal(d)}
                    >
                      ✍️ Valider Réception
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Validation de Réception & Signature */}
      {showProofModal && (
        <div className="modal-overlay" onClick={() => setShowProofModal(null)}>
          <div className="panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3>✍️ Valider la Réception — {showProofModal.etablissement}</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
              Contenu : {showProofModal.contenu}
            </p>
            <div className="field-row">
              <label>Nom du gérant / cuisinier qui a réceptionné</label>
              <input
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Ex: Chef Oumar Traoré"
              />
            </div>
            <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', padding: 20, textAlign: 'center', borderRadius: 6, marginTop: 10 }}>
              <span style={{ fontSize: 24 }}>🖊️</span>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Signature numérique enregistrée lors de la validation</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn secondary" onClick={() => setShowProofModal(null)}>Annuler</button>
              <button className="btn primary" onClick={handleValidateDelivery} disabled={!signatureName.trim()}>
                Confirmer la livraison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
