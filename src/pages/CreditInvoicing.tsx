import { useMemo, useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { waLinkWithText } from '../utils/phone'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface CreditEntry {
  id: string
  restaurantId: number
  etablissement: string
  montant: number // FCFA
  dateEmission: string // yyyy-mm-dd
  dateEcheance: string // yyyy-mm-dd
  statut: 'en_attente' | 'en_retard' | 'regle'
  reference: string
  notes: string
}

const DEFAULT_CREDITS: CreditEntry[] = [
  {
    id: 'cred-101',
    restaurantId: 1,
    etablissement: 'Chez Katia',
    montant: 185000,
    dateEmission: '2026-07-15',
    dateEcheance: '2026-07-22',
    statut: 'en_retard',
    reference: 'FAC-2026-0715',
    notes: '5 sacs riz brisé + 3 bidons huile 20L',
  },
  {
    id: 'cred-102',
    restaurantId: 2,
    etablissement: 'Le Lagon 1',
    montant: 420000,
    dateEmission: '2026-07-18',
    dateEcheance: '2026-07-25',
    statut: 'en_attente',
    reference: 'FAC-2026-0718',
    notes: 'Commande hebdomadaire poisson & légumes de luxe',
  },
  {
    id: 'cred-103',
    restaurantId: 3,
    etablissement: 'Dibiterie Haoussa',
    montant: 95000,
    dateEmission: '2026-07-10',
    dateEcheance: '2026-07-17',
    statut: 'en_retard',
    reference: 'FAC-2026-0710',
    notes: 'Oignons 50kg + Oignon rouge local',
  },
  {
    id: 'cred-104',
    restaurantId: 4,
    etablissement: 'Restaurant La Pointe',
    montant: 150000,
    dateEmission: '2026-07-05',
    dateEcheance: '2026-07-12',
    statut: 'regle',
    reference: 'FAC-2026-0705',
    notes: 'Livraison hebdomadaire riz & condiments',
  },
]

export default function CreditInvoicing() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const agents = useCrmStore((s) => s.agents)
  const currentAgent = useCrmStore((s) => s.currentAgent)

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const [credits, setCredits] = useState<CreditEntry[]>(DEFAULT_CREDITS)
  const [statutFilter, setStatutFilter] = useState<'tous' | 'en_attente' | 'en_retard' | 'regle'>('tous')
  const [showAddModal, setShowAddModal] = useState(false)

  // Champs de création
  const [selectedRestauId, setSelectedRestauId] = useState<number>(joined[0]?.id || 1)
  const [montant, setMontant] = useState<number>(100000)
  const [dateEcheance, setDateEcheance] = useState<string>('2026-07-30')
  const [notes, setNotes] = useState<string>('')

  const filteredCredits = useMemo(() => {
    if (statutFilter === 'tous') return credits
    return credits.filter((c) => c.statut === statutFilter)
  }, [credits, statutFilter])

  const totalEnCours = useMemo(() => credits.filter((c) => c.statut !== 'regle').reduce((acc, c) => acc + c.montant, 0), [credits])
  const totalEnRetard = useMemo(() => credits.filter((c) => c.statut === 'en_retard').reduce((acc, c) => acc + c.montant, 0), [credits])
  const totalRegle = useMemo(() => credits.filter((c) => c.statut === 'regle').reduce((acc, c) => acc + c.montant, 0), [credits])

  function handleCreateCredit() {
    const restau = joined.find((j) => j.id === Number(selectedRestauId))
    if (!restau || montant <= 0) return

    const newEntry: CreditEntry = {
      id: `cred-${Date.now()}`,
      restaurantId: restau.id,
      etablissement: restau.etablissement,
      montant,
      dateEmission: new Date().toISOString().slice(0, 10),
      dateEcheance,
      statut: 'en_attente',
      reference: `FAC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      notes,
    }

    setCredits([newEntry, ...credits])
    setShowAddModal(false)
    setNotes('')
  }

  function handleMarkAsPaid(id: string) {
    setCredits((prev) => prev.map((c) => (c.id === id ? { ...c, statut: 'regle' } : c)))
  }

  function handleSendWhatsappReminder(c: CreditEntry) {
    const restau = joined.find((j) => j.id === c.restaurantId)
    const phone = restau?.telephone || ''

    const text = `RAPPEL DE PAIEMENT NDUGUMi 🧾
    
Bonjour ${c.etablissement},

Nous vous rappelons que la facture *${c.reference}* d'un montant de *${c.montant.toLocaleString('fr-FR')} FCFA* (Livraison: ${c.notes}) est arrivée à échéance.

👉 *Modes de règlement* :
• Wave : +221 77 000 00 00
• Orange Money : +221 78 000 00 00
• Espèces au livreur NDUGUMi

Merci pour votre confiance ! 🙏
— ${currentAgent || 'Équipe NDUGUMi'}`

    const link = waLinkWithText(phone, text)
    if (link) window.open(link, '_blank')
    else alert('Numéro de téléphone indisponible.')
  }

  function downloadPdfInvoice(c: CreditEntry) {
    const doc = new jsPDF()
    doc.setFillColor(122, 31, 31)
    doc.rect(0, 0, 210, 24, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text('NDUGUMi — FACTURE CLIENT', 14, 15)

    doc.setTextColor(40, 40, 40)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text(`Facture N° : ${c.reference}`, 14, 35)
    doc.setFont('helvetica', 'normal')
    doc.text(`Client : ${c.etablissement}`, 14, 42)
    doc.text(`Date d'émission : ${c.dateEmission}`, 14, 49)
    doc.text(`Date d'échéance : ${c.dateEcheance}`, 14, 56)

    autoTable(doc, {
      startY: 65,
      head: [['Désignation / Détails commande', 'Montant (FCFA)']],
      body: [[c.notes || 'Fourniture de marché', `${c.montant.toLocaleString('fr-FR')} FCFA`]],
      headStyles: { fillColor: [122, 31, 31] },
    })

    doc.text(`Statut : ${c.statut.toUpperCase()}`, 14, (doc as any).lastAutoTable.finalY + 15)
    doc.save(`Facture_${c.reference}.pdf`)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💳 Crédits, Factures & Impayés</h1>
          <p className="page-subtitle">
            Suivi des encours clients, échéances de paiement et relances automatiques Wave / Orange Money
          </p>
        </div>
        <button className="btn" onClick={() => setShowAddModal(true)}>
          + Nouvelle Facture / Crédit
        </button>
      </div>

      {/* Cartes d'indicateurs KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="panel" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>EN-COURS TOTAL</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0369a1', marginTop: 4 }}>
            {totalEnCours.toLocaleString('fr-FR')} FCFA
          </div>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>IMPAYÉS EN RETARD</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#b91c1c', marginTop: 4 }}>
            {totalEnRetard.toLocaleString('fr-FR')} FCFA
          </div>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>TOTAL RECOUVRÉ</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
            {totalRegle.toLocaleString('fr-FR')} FCFA
          </div>
        </div>
      </div>

      {/* Filtres de statut */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        {(['tous', 'en_retard', 'en_attente', 'regle'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatutFilter(st)}
            className={statutFilter === st ? 'btn' : 'btn secondary'}
            style={{ fontSize: 12 }}
          >
            {st === 'tous' ? 'Tous les comptes' : st === 'en_retard' ? '⚠️ En retard' : st === 'en_attente' ? '⏳ En attente' : '✅ Réglé'}
          </button>
        ))}
      </div>

      {/* Tableau des crédits & factures */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Établissement</th>
              <th>Échéance</th>
              <th>Montant (FCFA)</th>
              <th>Statut</th>
              <th>Détails</th>
              <th style={{ textAlign: 'center', width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCredits.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.reference}</strong></td>
                <td>{c.etablissement}</td>
                <td>{c.dateEcheance}</td>
                <td style={{ fontWeight: 800, color: c.statut === 'en_retard' ? '#dc2626' : 'var(--text)' }}>
                  {c.montant.toLocaleString('fr-FR')} FCFA
                </td>
                <td>
                  <span
                    className="zone-tag"
                    style={{
                      background: c.statut === 'en_retard' ? '#fef2f2' : c.statut === 'regle' ? '#f0fdf4' : '#fffbebb',
                      color: c.statut === 'en_retard' ? '#dc2626' : c.statut === 'regle' ? '#16a34a' : '#d97706',
                      fontWeight: 700,
                    }}
                  >
                    {c.statut === 'en_retard' ? '⚠️ EN RETARD' : c.statut === 'regle' ? '✅ RÉGLÉ' : '⏳ EN ATTENTE'}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{c.notes}</td>
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {c.statut !== 'regle' && (
                    <button
                      className="btn secondary small"
                      style={{ padding: '3px 8px', fontSize: 11, color: '#25d366', borderColor: '#25d366', marginRight: 4, fontWeight: 700 }}
                      onClick={() => handleSendWhatsappReminder(c)}
                      title="Envoyer rappel de paiement WhatsApp"
                    >
                      📲 Relancer
                    </button>
                  )}
                  {c.statut !== 'regle' && (
                    <button
                      className="btn small"
                      style={{ padding: '3px 8px', fontSize: 11, background: '#16a34a', marginRight: 4 }}
                      onClick={() => handleMarkAsPaid(c.id)}
                    >
                      ✅ Réglé
                    </button>
                  )}
                  <button
                    className="btn secondary small"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                    onClick={() => downloadPdfInvoice(c)}
                  >
                    📄 PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Création de Crédit / Facture */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3>➕ Ajouter une Facture / Crédit Client</h3>
            <div className="field-row">
              <label>Restaurant client</label>
              <select value={selectedRestauId} onChange={(e) => setSelectedRestauId(Number(e.target.value))}>
                {joined.map((j) => (
                  <option key={j.id} value={j.id}>{j.etablissement} ({j.quartier})</option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <label>Montant en FCFA</label>
              <input type="number" value={montant} onChange={(e) => setMontant(Number(e.target.value))} />
            </div>
            <div className="field-row">
              <label>Date d'échéance</label>
              <input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} />
            </div>
            <div className="field-row">
              <label>Détails / Produits livrés</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: 10 sacs de riz + 5 bidons d'huile" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button className="btn secondary" onClick={() => setShowAddModal(false)}>Annuler</button>
              <button className="btn primary" onClick={handleCreateCredit}>Créer la facture</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
