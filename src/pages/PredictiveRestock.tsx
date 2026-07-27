import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { waLinkWithText } from '../utils/phone'
import { CLIENT_STATUTS, type Order } from '../types'

// Déduit fréquence/dernier achat/produit phare RÉELS depuis l'historique de commandes NDUGUMi
// importé (voir utils/importOrders.ts) — au lieu d'un défaut fictif (7 jours, riz 25kg) appliqué
// à tout le monde. Nécessite au moins 2 commandes rapprochées à ce restaurant pour calculer une
// vraie fréquence (un intervalle a besoin de 2 points) ; sinon on retombe sur l'estimation
// manuelle existante (restock), clairement labellisée comme telle dans l'UI.
function computeRealPattern(clientOrders: Order[]): { frequenceJours: number; dernierAchatDate: string; produitPhare: string; nbCommandes: number } | null {
  if (clientOrders.length < 2) return null
  const sorted = [...clientOrders].sort((a, b) => new Date(a.creeLe).getTime() - new Date(b.creeLe).getTime())

  let totalDays = 0
  let intervals = 0
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i].creeLe).getTime() - new Date(sorted[i - 1].creeLe).getTime()) / (1000 * 3600 * 24)
    if (diff > 0) {
      totalDays += diff
      intervals++
    }
  }
  if (intervals === 0) return null
  const frequenceJours = Math.max(1, Math.round(totalDays / intervals))

  const produitCounts = new Map<string, number>()
  for (const o of sorted) {
    for (const p of o.produits) {
      produitCounts.set(p, (produitCounts.get(p) ?? 0) + 1)
    }
  }
  const produitPhare = Array.from(produitCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Produit non identifié'

  return {
    frequenceJours,
    dernierAchatDate: sorted[sorted.length - 1].creeLe,
    produitPhare,
    nbCommandes: sorted.length,
  }
}

export default function PredictiveRestock() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const orders = useCrmStore((s) => s.orders)
  const updateRestockInfo = useCrmStore((s) => s.updateRestockInfo)
  const navigate = useNavigate()

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const [filterQuarter, setFilterQuarter] = useState('')

  const clientList = useMemo(() => {
    return joined.filter((j) => CLIENT_STATUTS.includes(j.crm.statut))
  }, [joined])

  const ordersByRestaurant = useMemo(() => {
    const m = new Map<number, Order[]>()
    for (const o of Object.values(orders)) {
      if (o.restaurantId === null) continue
      const list = m.get(o.restaurantId) ?? []
      list.push(o)
      m.set(o.restaurantId, list)
    }
    return m
  }, [orders])

  const restockAlerts = useMemo(() => {
    const today = new Date()
    return clientList.map((client) => {
      const realPattern = computeRealPattern(ordersByRestaurant.get(client.id) ?? [])
      const manuel = client.crm.restock || {
        frequenceJours: 7,
        dernierAchatDate: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        produitPhare: '',
        quantiteHabituelle: 2,
        autoAlertActive: true,
      }

      const frequenceJours = realPattern?.frequenceJours ?? manuel.frequenceJours
      const dernierAchatDate = realPattern?.dernierAchatDate ?? manuel.dernierAchatDate
      const produitPhare = realPattern?.produitPhare || manuel.produitPhare || 'Produit non renseigné'

      const lastDate = dernierAchatDate ? new Date(dernierAchatDate) : today
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24))
      const daysUntilRestock = frequenceJours - diffDays
      const isDue = daysUntilRestock <= 1

      return {
        client,
        restock: { ...manuel, frequenceJours, dernierAchatDate, produitPhare },
        realPattern,
        diffDays,
        daysUntilRestock,
        isDue,
      }
    }).sort((a, b) => a.daysUntilRestock - b.daysUntilRestock)
  }, [clientList, ordersByRestaurant])

  const filtered = useMemo(() => {
    return restockAlerts.filter((item) => {
      if (filterQuarter && item.client.quartier !== filterQuarter) return false
      return true
    })
  }, [restockAlerts, filterQuarter])

  const urgentCount = useMemo(() => restockAlerts.filter((r) => r.isDue).length, [restockAlerts])
  const basedOnRealDataCount = useMemo(() => restockAlerts.filter((r) => r.realPattern !== null).length, [restockAlerts])

  function handleSendRestockMessage(item: typeof restockAlerts[0]) {
    const text = `Bonjour ${item.client.etablissement} ! 🚚\nSelon notre suivi, vos stocks de *${item.restock.produitPhare}* arrivent à épuisement.\n\nSouhaitez-vous que nous vous livrions ${item.restock.quantiteHabituelle} unité(s) d'ici demain ?\nRépondez OUI pour confirmer la livraison.`
    const link = waLinkWithText(item.client.telephone, text)
    if (link) window.open(link, '_blank')
    else alert("Aucun numéro de téléphone exploitable pour ce restaurant.")
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🔮 Réapprovisionnement Prédictif</h1>
          <p className="page-subtitle">
            Anticipation des ruptures de stock basée sur l'historique réel des commandes NDUGUMi (estimation manuelle en repli si pas assez de commandes)
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{clientList.length}</div>
          <div className="kpi-label">Restaurants clients suivis</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'var(--warn)' }}>
          <div className="kpi-value" style={{ color: 'var(--warn)' }}>{urgentCount}</div>
          <div className="kpi-label">Réapprovisionnements urgents (J-1 à J-0)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{basedOnRealDataCount} / {clientList.length}</div>
          <div className="kpi-label">Basés sur un vrai historique de commandes (≥ 2)</div>
        </div>
      </div>

      <div className="filters-bar">
        <select value={filterQuarter} onChange={(e) => setFilterQuarter(e.target.value)}>
          <option value="">Tous les quartiers</option>
          {Array.from(new Set(clientList.map((c) => c.quartier))).sort().map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Restaurant</th>
              <th>Quartier</th>
              <th>Produit Phare</th>
              <th>Fréquence</th>
              <th>Dernier Achat</th>
              <th>Échéance Réappro</th>
              <th>Action Urgente</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const c = item.client
              const r = item.restock
              return (
                <tr key={c.id}>
                  <td>
                    <strong style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/prospects/${c.id}`)}>
                      {c.etablissement}
                    </strong>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {c.telephone}
                      {item.realPattern ? (
                        <span style={{ color: '#16a34a', fontWeight: 700 }}> · 📊 {item.realPattern.nbCommandes} commande(s) réelle(s)</span>
                      ) : (
                        <span style={{ color: '#b45309', fontWeight: 700 }}> · ✏️ estimation manuelle</span>
                      )}
                    </div>
                  </td>
                  <td>{c.quartier}</td>
                  <td>
                    {item.realPattern ? (
                      <span title="Produit le plus fréquent dans les commandes réelles">{r.produitPhare}</span>
                    ) : (
                      <input
                        type="text"
                        value={r.produitPhare}
                        onChange={(e) => updateRestockInfo(c.id, { produitPhare: e.target.value })}
                        style={{ fontSize: 12, padding: 4 }}
                      />
                    )}
                  </td>
                  <td>
                    {item.realPattern ? (
                      <span title="Intervalle moyen réel entre les commandes de ce client">{item.realPattern.frequenceJours} j (réel)</span>
                    ) : (
                      <select
                        value={r.frequenceJours}
                        onChange={(e) => updateRestockInfo(c.id, { frequenceJours: Number(e.target.value) })}
                        style={{ fontSize: 12, padding: 4 }}
                      >
                        <option value={3}>Tous les 3 jours</option>
                        <option value={7}>Tous les 7 jours</option>
                        <option value={14}>Toutes les 2 semaines</option>
                        <option value={30}>Tous les mois</option>
                      </select>
                    )}
                  </td>
                  <td>{item.diffDays} jour(s)</td>
                  <td>
                    {item.isDue ? (
                      <span className="badge" style={{ background: '#fef2f2', color: '#991b1b' }}>
                        ⚠️ Urgent ({item.daysUntilRestock <= 0 ? 'Aujourd\'hui' : 'Demain'})
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#ecfdf5', color: '#047857' }}>
                        Dans {item.daysUntilRestock} jours
                      </span>
                    )}
                  </td>
                  <td>
                    <button className="btn small primary" style={{ background: '#128c7e', borderColor: '#128c7e' }} onClick={() => handleSendRestockMessage(item)}>
                      💬 Relancer sur WhatsApp
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-state">Aucun restaurant à afficher.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
