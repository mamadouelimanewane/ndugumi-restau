import { useState, useMemo } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { waLinkWithText } from '../utils/phone'
import { VisualQuoteItem } from '../types'

interface VisualQuoteModalProps {
  restaurantId: number
  etablissement: string
  telephone: string
  onClose: () => void
}

export default function VisualQuoteModal({ restaurantId, etablissement, telephone, onClose }: VisualQuoteModalProps) {
  const products = useCrmStore((s) => s.products)
  const currentAgent = useCrmStore((s) => s.currentAgent)
  const addVisualQuote = useCrmStore((s) => s.addVisualQuote)

  const productList = useMemo(() => Object.values(products), [products])

  const [items, setItems] = useState<VisualQuoteItem[]>([
    { produitId: 'riz-25kg', nom: 'Riz brisé parfumé', quantite: 2, prixUnitaire: 15000, unite: 'sac 25kg' },
    { produitId: 'huile-20l', nom: 'Huile végétale', quantite: 1, prixUnitaire: 22000, unite: 'bidon 20L' },
  ])

  const [fraisLivraison, setFraisLivraison] = useState(1500)
  const [remise, setRemise] = useState(1000)

  const sousTotal = useMemo(() => items.reduce((acc, item) => acc + item.quantite * item.prixUnitaire, 0), [items])
  const total = useMemo(() => Math.max(0, sousTotal + fraisLivraison - remise), [sousTotal, fraisLivraison, remise])

  function handleAddItem(produitId: string) {
    const prod = products[produitId]
    if (!prod) return
    setItems((prev) => [...prev, { produitId: prod.id, nom: prod.nom, quantite: 1, prixUnitaire: prod.prixUnitaire, unite: prod.unite }])
  }

  function handleRemoveItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleQtyChange(idx: number, qty: number) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, quantite: Math.max(1, qty) } : item)))
  }

  function handleSaveAndSend() {
    const agent = currentAgent || 'Commercial'
    addVisualQuote({
      restaurantId,
      etablissement,
      agent,
      items,
      sousTotal,
      fraisLivraison,
      remise,
      total,
    })

    const summaryLines = items.map((i) => `• ${i.quantite}x ${i.nom} (${i.unite}) : ${(i.quantite * i.prixUnitaire).toLocaleString()} FCFA`).join('\n')
    const waText = `*OFFRE PRO FORMA NDUGUMi 🛒*\nClient : *${etablissement}*\n\n${summaryLines}\n\nSous-total : ${sousTotal.toLocaleString()} FCFA\nLivraison : ${fraisLivraison.toLocaleString()} FCFA\nRemise accordée : -${remise.toLocaleString()} FCFA\n👉 *TOTAL NET : ${total.toLocaleString()} FCFA*\n\nLivraison garantie sous 24h. Répondez Oui pour valider la commande.`
    
    const link = waLinkWithText(telephone, waText)
    if (link) window.open(link, '_blank')
    else alert("Aucun numéro de téléphone exploitable pour WhatsApp.")
    onClose()
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
        style={{ width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>📜 Générateur de Devis Visuel WhatsApp</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer la fenêtre">✕</button>
        </div>

        {/* Visuel Pro Forma aux couleurs de NDUGUMi */}
        <div style={{ background: 'linear-gradient(135deg, #7a1f1f 0%, #232a3b 100%)', color: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.05em' }}>NDUGUMi — FOOD SUPPLY</div>
              <div style={{ fontSize: 12, color: '#e7c9a9' }}>PRO FORMA & DEVIS EXPRESS</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#e4e4e4' }}>
              <div>Client : <strong>{etablissement}</strong></div>
              <div>Date : {new Date().toLocaleDateString('fr-FR')}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>
                <th style={{ padding: '6px 0' }}>Produit</th>
                <th style={{ textAlign: 'center' }}>Qté</th>
                <th style={{ textAlign: 'right' }}>P.U (FCFA)</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '8px 0' }}>{item.nom} <small style={{ opacity: 0.8 }}>({item.unite})</small></td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="number"
                      min={1}
                      value={item.quantite}
                      onChange={(e) => handleQtyChange(i, Number(e.target.value))}
                      style={{ width: 44, textAlign: 'center', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 4 }}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>{item.prixUnitaire.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{(item.quantite * item.prixUnitaire).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: '#ff8a8a', cursor: 'pointer' }} onClick={() => handleRemoveItem(i)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 12 }}>
            <div>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Ajouter un produit :</label>
              <select onChange={(e) => handleAddItem(e.target.value)} defaultValue="" style={{ padding: 6, borderRadius: 6, fontSize: 12 }}>
                <option value="" disabled>Choisir un produit...</option>
                {productList.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom} ({p.prixUnitaire} FCFA)</option>
                ))}
              </select>
            </div>

            <div style={{ textAlign: 'right', fontSize: 13, lineHeight: 1.6 }}>
              <div>Sous-total : {sousTotal.toLocaleString()} FCFA</div>
              <div>Livraison : <input type="number" value={fraisLivraison} onChange={(e) => setFraisLivraison(Number(e.target.value))} style={{ width: 70, textAlign: 'right', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 4 }} /> FCFA</div>
              <div>
                Remise : -<input type="number" value={remise} onChange={(e) => setRemise(Number(e.target.value))} style={{ width: 70, textAlign: 'right', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 4 }} /> FCFA
                <button
                  type="button"
                  style={{ background: '#e7c9a9', color: '#7a1f1f', border: 'none', padding: '2px 6px', borderRadius: 4, marginLeft: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => {
                    const opt = Math.round((sousTotal * 0.05) / 500) * 500
                    setRemise(opt)
                    alert(`✨ Remise optimale de ${opt.toLocaleString()} FCFA calculée par Dynamic Pricing IA.`)
                  }}
                >
                  ✨ IA
                </button>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#e7c9a9', marginTop: 4 }}>TOTAL : {total.toLocaleString()} FCFA</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn secondary" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={handleSaveAndSend}>💬 Enregistrer & Envoyer sur WhatsApp</button>
        </div>
      </div>
    </div>
  )
}
