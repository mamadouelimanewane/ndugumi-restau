import { useState, useMemo } from 'react'
import { waLinkWithText } from '../utils/phone'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Ingredient {
  nom: string
  quantite: string
  prixNdugumi: number // FCFA
  prixMarche: number // FCFA
}

interface DishRecipe {
  id: string
  nom: string
  prixVentePortion: number // FCFA
  portionsCount: number
  ingredients: Ingredient[]
}

const PRESET_DISHES: DishRecipe[] = [
  {
    id: 'thieb',
    nom: 'Thiéboudienne Penda Mbaye (50 portions)',
    prixVentePortion: 2500,
    portionsCount: 50,
    ingredients: [
      { nom: 'Riz brisé parfumé', quantite: '10 kg', prixNdugumi: 6000, prixMarche: 6800 },
      { nom: 'Poisson Thiof & Yaboy', quantite: '8 kg', prixNdugumi: 24000, prixMarche: 28000 },
      { nom: 'Huile végétale', quantite: '4 L', prixNdugumi: 4400, prixMarche: 5000 },
      { nom: 'Légumes (Chou, carotte, manioc, aubergine)', quantite: '10 kg', prixNdugumi: 7500, prixMarche: 9000 },
      { nom: 'Concentré de tomate', quantite: '2 kg', prixNdugumi: 2200, prixMarche: 2600 },
      { nom: 'Condiments & épices (Ail, piment, guédji, nététou)', quantite: 'Divers', prixNdugumi: 3500, prixMarche: 4000 },
    ],
  },
  {
    id: 'yassa',
    nom: 'Yassa au Poulet (30 portions)',
    prixVentePortion: 3000,
    portionsCount: 30,
    ingredients: [
      { nom: 'Poulet entier découpé', quantite: '10 kg', prixNdugumi: 22000, prixMarche: 25000 },
      { nom: 'Oignon local Niayes', quantite: '8 kg', prixNdugumi: 3200, prixMarche: 4000 },
      { nom: 'Riz brisé', quantite: '6 kg', prixNdugumi: 3600, prixMarche: 4200 },
      { nom: 'Moutarde & Citron', quantite: 'Divers', prixNdugumi: 3000, prixMarche: 3500 },
      { nom: 'Huile végétale', quantite: '3 L', prixNdugumi: 3300, prixMarche: 3800 },
    ],
  },
  {
    id: 'dibi',
    nom: 'Dibiterie d\'Agneau Grillé (20 portions)',
    prixVentePortion: 4500,
    portionsCount: 20,
    ingredients: [
      { nom: 'Viande d\'agneau fraîche', quantite: '10 kg', prixNdugumi: 48000, prixMarche: 54000 },
      { nom: 'Oignons grillés', quantite: '5 kg', prixNdugumi: 2000, prixMarche: 2500 },
      { nom: 'Moutarde, piment & kankankan', quantite: 'Divers', prixNdugumi: 2500, prixMarche: 3000 },
    ],
  },
]

export default function Calculator() {
  const [selectedDishId, setSelectedDishId] = useState<string>('thieb')
  const [customSellingPrice, setCustomSellingPrice] = useState<number | null>(null)

  const dish = useMemo(() => PRESET_DISHES.find((d) => d.id === selectedDishId) || PRESET_DISHES[0], [selectedDishId])
  const sellingPricePortion = customSellingPrice !== null ? customSellingPrice : dish.prixVentePortion

  const totalCA = sellingPricePortion * dish.portionsCount

  const costNdugumi = useMemo(() => dish.ingredients.reduce((acc, i) => acc + i.prixNdugumi, 0), [dish])
  const costMarche = useMemo(() => dish.ingredients.reduce((acc, i) => acc + i.prixMarche, 0), [dish])

  const foodCostNdugumiPct = ((costNdugumi / totalCA) * 100).toFixed(1)
  const foodCostMarchePct = ((costMarche / totalCA) * 100).toFixed(1)

  const marginNdugumiPct = (100 - Number(foodCostNdugumiPct)).toFixed(1)
  const marginMarchePct = (100 - Number(foodCostMarchePct)).toFixed(1)

  const economyTotal = costMarche - costNdugumi

  function handleShareWhatsapp() {
    const text = `🍲 *FICHE RENTABILITÉ CUISINE NDUGUMi — ${dish.nom.toUpperCase()}*

💰 *Chiffre d'Affaires (${dish.portionsCount} portions)* : ${totalCA.toLocaleString('fr-FR')} FCFA (${sellingPricePortion.toLocaleString('fr-FR')} FCFA/portion)

📊 *Comparatif Approvisionnement* :
• *Coût Marché Traditionnel* : ${costMarche.toLocaleString('fr-FR')} FCFA (Food Cost : ${foodCostMarchePct}% | Marge : ${marginMarchePct}%)
• *Coût avec NDUGUMi* : ${costNdugumi.toLocaleString('fr-FR')} FCFA (Food Cost : ${foodCostNdugumiPct}% | Marge : ${marginNdugumiPct}%)

✨ *GAIN DE MARGE BRUTE* : +${economyTotal.toLocaleString('fr-FR')} FCFA économisés sur cette recette !

📲 Commandez vos ingrédients chez NDUGUMi pour augmenter la rentabilité de votre restaurant !`

    const link = waLinkWithText('', text)
    if (link) window.open(link, '_blank')
  }

  function downloadPdfReport() {
    const doc = new jsPDF()
    doc.setFillColor(122, 31, 31)
    doc.rect(0, 0, 210, 24, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text('NDUGUMi — CALCULATEUR DE MARGE ET RENTABILITÉ', 14, 15)

    doc.setTextColor(40, 40, 40)
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text(`Recette : ${dish.nom}`, 14, 35)
    doc.setFont('helvetica', 'normal')
    doc.text(`Prix de vente par portion : ${sellingPricePortion.toLocaleString('fr-FR')} FCFA`, 14, 42)
    doc.text(`Nombre de portions : ${dish.portionsCount}`, 14, 49)

    autoTable(doc, {
      startY: 55,
      head: [['Ingrédient', 'Quantité', 'Prix NDUGUMi (FCFA)', 'Prix Marché (FCFA)']],
      body: dish.ingredients.map((i) => [i.nom, i.quantite, `${i.prixNdugumi.toLocaleString('fr-FR')} FCFA`, `${i.prixMarche.toLocaleString('fr-FR')} FCFA`]),
      headStyles: { fillColor: [122, 31, 31] },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 15
    doc.setFont('helvetica', 'bold')
    doc.text(`Coût Total Ingrédients NDUGUMi : ${costNdugumi.toLocaleString('fr-FR')} FCFA`, 14, finalY)
    doc.text(`Marge Brute avec NDUGUMi : ${marginNdugumiPct}% (+${economyTotal.toLocaleString('fr-FR')} FCFA de gain)`, 14, finalY + 7)

    doc.save(`Rentabilite_${dish.id}.pdf`)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🍲 Calculateur de Marge Plat & Food Cost</h1>
          <p className="page-subtitle">
            Démontrez aux chefs et gérants la hausse directe de leur marge brute en s'approvisionnant chez NDUGUMi
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={handleShareWhatsapp}>📲 Partager WhatsApp</button>
          <button className="btn" onClick={downloadPdfReport}>📄 Télécharger PDF</button>
        </div>
      </div>

      {/* Sélection du Plat & Paramètres */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field-row" style={{ minWidth: 240, flex: 1 }}>
            <label>Choisir un Plat / Recette Type</label>
            <select value={selectedDishId} onChange={(e) => { setSelectedDishId(e.target.value); setCustomSellingPrice(null) }}>
              {PRESET_DISHES.map((d) => (
                <option key={d.id} value={d.id}>{d.nom}</option>
              ))}
            </select>
          </div>
          <div className="field-row" style={{ width: 180 }}>
            <label>Prix de vente portion (FCFA)</label>
            <input
              type="number"
              value={sellingPricePortion}
              onChange={(e) => setCustomSellingPrice(Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      {/* Cartes KPI Comparatives */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="panel" style={{ borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>APPRO MARCHÉ TRADITIONNEL</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#b91c1c', marginTop: 4 }}>
            {costMarche.toLocaleString('fr-FR')} FCFA
          </div>
          <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-dim)' }}>
            Food Cost : <strong>{foodCostMarchePct}%</strong> | Marge : <strong>{marginMarchePct}%</strong>
          </div>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>APPRO NDUGUMi DIRECT</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
            {costNdugumi.toLocaleString('fr-FR')} FCFA
          </div>
          <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-dim)' }}>
            Food Cost : <strong>{foodCostNdugumiPct}%</strong> | Marge : <strong>{marginNdugumiPct}%</strong>
          </div>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #0284c7', background: '#f0f9ff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>GAIN EN CASH SUR CETTE RECETTE</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0284c7', marginTop: 4 }}>
            +{economyTotal.toLocaleString('fr-FR')} FCFA
          </div>
          <div style={{ fontSize: 11.5, color: '#0369a1', marginTop: 4, fontWeight: 600 }}>
            Économie nette réalisée pour {dish.portionsCount} portions livrées
          </div>
        </div>
      </div>

      {/* Tableau des Ingrédients */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ingrédient</th>
              <th>Quantité nécessaire</th>
              <th>Coût NDUGUMi (FCFA)</th>
              <th>Coût Marché Traditionnel</th>
              <th>Économie</th>
            </tr>
          </thead>
          <tbody>
            {dish.ingredients.map((ing, idx) => {
              const diff = ing.prixMarche - ing.prixNdugumi
              return (
                <tr key={idx}>
                  <td><strong>{ing.nom}</strong></td>
                  <td>{ing.quantite}</td>
                  <td style={{ fontWeight: 700, color: '#16a34a' }}>{ing.prixNdugumi.toLocaleString('fr-FR')} FCFA</td>
                  <td style={{ fontSize: 12.5 }}>{ing.prixMarche.toLocaleString('fr-FR')} FCFA</td>
                  <td style={{ fontWeight: 800, color: '#0284c7' }}>+{diff.toLocaleString('fr-FR')} FCFA</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
