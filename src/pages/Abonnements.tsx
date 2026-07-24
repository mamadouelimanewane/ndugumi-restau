import { useMemo, useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { waLinkWithText } from '../utils/phone'

interface SubscriptionPlan {
  id: string
  restaurantId: number
  etablissement: string
  quartier: string
  frequence: 'Chaque Lundi' | 'Lundi & Jeudi' | 'Chaque Mercredi' | 'Bimensuel'
  produitsRecurrents: string
  montantEstimeHebdo: number // FCFA
  prochaineLivraison: string // yyyy-mm-dd
  statut: 'actif' | 'pause' | 'annule'
}

const SEED_SUBSCRIPTIONS: SubscriptionPlan[] = [
  {
    id: 'sub-1',
    restaurantId: 1,
    etablissement: 'Chez Katia',
    quartier: 'Almadies',
    frequence: 'Chaque Lundi',
    produitsRecurrents: '10 sacs riz brisé + 5 bidons huile 20L + 2 sacs oignons',
    montantEstimeHebdo: 320000,
    prochaineLivraison: '2026-07-27',
    statut: 'actif',
  },
  {
    id: 'sub-2',
    restaurantId: 2,
    etablissement: 'Le Lagon 1',
    quartier: 'Plateau',
    frequence: 'Lundi & Jeudi',
    produitsRecurrents: 'Poissons thiof & yaboy 30kg + fruits & légumes frais',
    montantEstimeHebdo: 450000,
    prochaineLivraison: '2026-07-27',
    statut: 'actif',
  },
  {
    id: 'sub-3',
    restaurantId: 3,
    etablissement: 'Dibiterie Haoussa',
    quartier: 'Pikine',
    frequence: 'Chaque Mercredi',
    produitsRecurrents: 'Oignons 50kg + Pommes de terre 50kg + Épices',
    montantEstimeHebdo: 120000,
    prochaineLivraison: '2026-07-29',
    statut: 'actif',
  },
]

export default function Abonnements() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const [subscriptions, setSubscriptions] = useState<SubscriptionPlan[]>(SEED_SUBSCRIPTIONS)
  const [showAddModal, setShowAddModal] = useState(false)

  // Création
  const [selectedRestauId, setSelectedRestauId] = useState<number>(joined[0]?.id || 1)
  const [frequence, setFrequence] = useState<SubscriptionPlan['frequence']>('Chaque Lundi')
  const [produitsRecurrents, setProduitsRecurrents] = useState('')
  const [montantEstimeHebdo, setMontantEstimeHebdo] = useState<number>(150000)
  const [prochaineLivraison, setProchaineLivraison] = useState('2026-07-27')

  const totalMonthlyRecurring = useMemo(() => {
    return subscriptions
      .filter((s) => s.statut === 'actif')
      .reduce((acc, s) => acc + s.montantEstimeHebdo * 4, 0)
  }, [subscriptions])

  function handleCreateSubscription() {
    const restau = joined.find((j) => j.id === Number(selectedRestauId))
    if (!restau || !produitsRecurrents.trim()) return

    const newSub: SubscriptionPlan = {
      id: `sub-${Date.now()}`,
      restaurantId: restau.id,
      etablissement: restau.etablissement,
      quartier: restau.quartier,
      frequence,
      produitsRecurrents: produitsRecurrents.trim(),
      montantEstimeHebdo,
      prochaineLivraison,
      statut: 'actif',
    }

    setSubscriptions([newSub, ...subscriptions])
    setShowAddModal(false)
    setProduitsRecurrents('')
  }

  function handleSendJMinus1Reminder(sub: SubscriptionPlan) {
    const restau = joined.find((j) => j.id === sub.restaurantId)
    const phone = restau?.telephone || ''

    const text = `🔄 *RAPPEL COMMANDE RÉCURRENTE NDUGUMi*

Bonjour ${sub.etablissement},

Votre livraison récurrente programmée (*${sub.frequence}*) aura lieu le *${sub.prochaineLivraison}*.

🛒 *Contenu prévu* :
${sub.produitsRecurrents}

💰 *Montant estimé* : ${sub.montantEstimeHebdo.toLocaleString('fr-FR')} FCFA

Souhaitez-vous modifier des quantités ou valider l'envoi tel quel ? Répondez *VALIDER* pour confirmer ! 🙏`

    const link = waLinkWithText(phone, text)
    if (link) window.open(link, '_blank')
    else alert('Numéro de téléphone indisponible.')
  }

  function toggleStatus(id: string) {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, statut: s.statut === 'actif' ? 'pause' : 'actif' } : s))
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🔄 Abonnements & Commandes Récurrentes Automatiques</h1>
          <p className="page-subtitle">
            Gestion des livraisons récurrentes hebdomadaires des restaurants et rappels WhatsApp J-1
          </p>
        </div>
        <button className="btn" onClick={() => setShowAddModal(true)}>
          + Nouvel Abonnement Récurrent
        </button>
      </div>

      {/* Cartes KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="panel" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>ABONNEMENTS ACTIFS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#047857', marginTop: 4 }}>
            {subscriptions.filter((s) => s.statut === 'actif').length} contrat(s) récurrents
          </div>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>REVENU RÉCURRENT MENSUEL (MRR)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0369a1', marginTop: 4 }}>
            {totalMonthlyRecurring.toLocaleString('fr-FR')} FCFA / mois
          </div>
        </div>
      </div>

      {/* Tableau des abonnements */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Établissement & Quartier</th>
              <th>Fréquence</th>
              <th>Prochaine livraison</th>
              <th>Panier récurrent</th>
              <th>Montant / Semaine</th>
              <th>Statut</th>
              <th style={{ textAlign: 'center', width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.etablissement}</strong>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>📍 {s.quartier}</div>
                </td>
                <td><span className="zone-tag">{s.frequence}</span></td>
                <td><strong>📅 {s.prochaineLivraison}</strong></td>
                <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.produitsRecurrents}</td>
                <td style={{ fontWeight: 800 }}>{s.montantEstimeHebdo.toLocaleString('fr-FR')} FCFA</td>
                <td>
                  <span
                    className="zone-tag"
                    style={{
                      background: s.statut === 'actif' ? '#e8f5e9' : '#fffbe0',
                      color: s.statut === 'actif' ? '#047857' : '#b45309',
                      fontWeight: 700,
                    }}
                  >
                    {s.statut === 'actif' ? '✅ ACTIF' : '⏸️ EN PAUSE'}
                  </span>
                </td>
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <button
                    className="btn secondary small"
                    style={{ padding: '3px 8px', fontSize: 11, color: '#25d366', borderColor: '#25d366', marginRight: 4, fontWeight: 700 }}
                    onClick={() => handleSendJMinus1Reminder(s)}
                    title="Envoyer rappel WhatsApp J-1"
                  >
                    📲 Rappel J-1
                  </button>
                  <button
                    className="btn secondary small"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                    onClick={() => toggleStatus(s.id)}
                  >
                    {s.statut === 'actif' ? 'Pause' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Création d'Abonnement */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3>🔄 Créer un Abonnement Récurrent</h3>
            <div className="field-row">
              <label>Restaurant client</label>
              <select value={selectedRestauId} onChange={(e) => setSelectedRestauId(Number(e.target.value))}>
                {joined.map((j) => (
                  <option key={j.id} value={j.id}>{j.etablissement} ({j.quartier})</option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <label>Fréquence de livraison</label>
              <select value={frequence} onChange={(e) => setFrequence(e.target.value as any)}>
                <option value="Chaque Lundi">Chaque Lundi</option>
                <option value="Lundi & Jeudi">Lundi & Jeudi</option>
                <option value="Chaque Mercredi">Chaque Mercredi</option>
                <option value="Bimensuel">Bimensuel (Tous les 15 jours)</option>
              </select>
            </div>
            <div className="field-row">
              <label>Contenu du panier récurrent</label>
              <textarea
                rows={3}
                value={produitsRecurrents}
                onChange={(e) => setProduitsRecurrents(e.target.value)}
                placeholder="Ex: 10 sacs de riz brisé + 5 bidons d'huile 20L + 2 sacs d'oignons"
                style={{ width: '100%', padding: 8 }}
              />
            </div>
            <div className="field-row">
              <label>Montant estimé par livraison (FCFA)</label>
              <input type="number" value={montantEstimeHebdo} onChange={(e) => setMontantEstimeHebdo(Number(e.target.value))} />
            </div>
            <div className="field-row">
              <label>Date de 1ère / prochaine livraison</label>
              <input type="date" value={prochaineLivraison} onChange={(e) => setProchaineLivraison(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button className="btn secondary" onClick={() => setShowAddModal(false)}>Annuler</button>
              <button className="btn primary" onClick={handleCreateSubscription}>Enregistrer l'abonnement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
