import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { waLinkWithText } from '../utils/phone'
import { CLIENT_STATUTS } from '../types'

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

  const restockAlerts = useMemo(() => {
    const today = new Date()
    return clientList.map((client) => {
      const restock = client.crm.restock || {
        frequenceJours: 7,
        dernierAchatDate: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        produitPhare: 'Riz brisé parfumé 25kg',
        quantiteHabituelle: 2,
        autoAlertActive: true,
      }

      const lastDate = restock.dernierAchatDate ? new Date(restock.dernierAchatDate) : new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24))
      const daysUntilRestock = restock.frequenceJours - diffDays
      const isDue = daysUntilRestock <= 1

      return {
        client,
        restock,
        diffDays,
        daysUntilRestock,
        isDue,
      }
    }).sort((a, b) => a.daysUntilRestock - b.daysUntilRestock)
  }, [clientList])

  const filtered = useMemo(() => {
    return restockAlerts.filter((item) => {
      if (filterQuarter && item.client.quartier !== filterQuarter) return false
      return true
    })
  }, [restockAlerts, filterQuarter])

  const urgentCount = useMemo(() => restockAlerts.filter((r) => r.isDue).length, [restockAlerts])

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
          <h1 className="page-title">🔮 Réapprovisionnement Prédictif IA</h1>
          <p className="page-subtitle">Algorithme d'anticipation des ruptures de stock pour les restaurants clients</p>
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
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c.telephone}</div>
                  </td>
                  <td>{c.quartier}</td>
                  <td>
                    <input
                      type="text"
                      value={r.produitPhare}
                      onChange={(e) => updateRestockInfo(c.id, { produitPhare: e.target.value })}
                      style={{ fontSize: 12, padding: 4 }}
                    />
                  </td>
                  <td>
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
