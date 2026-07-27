import { useEffect, useMemo, useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { waLinkWithText } from '../utils/phone'
import { brandedHeaderMm } from '../utils/pdf'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface RecipeLine {
  id: string
  productId: string
  quantite: number // multiplicateur de l'unité du produit (ex: 2 = 2x l'unité catalogue)
}

function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export default function Calculator() {
  const products = useCrmStore((s) => s.products)
  const productList = useMemo(() => Object.values(products).sort((a, b) => a.nom.localeCompare(b.nom)), [products])

  const [marketEntries, setMarketEntries] = useState<{ produit: string; prix: number; unite: string; created_at: string }[] | null>(null)
  useEffect(() => {
    fetch('/api/market-prices')
      .then((res) => res.json())
      .then((data) => setMarketEntries(data.entries ?? []))
      .catch(() => setMarketEntries([]))
  }, [])

  function marketPriceFor(productId: string): number | null {
    if (!marketEntries) return null
    const p = products[productId]
    if (!p) return null
    const nomNorm = normalizeText(p.nom)
    const uniteNorm = normalizeText(p.unite)
    const candidats = marketEntries.filter((e) => normalizeText(e.produit) === nomNorm && normalizeText(e.unite) === uniteNorm)
    if (candidats.length === 0) return null
    return candidats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].prix
  }

  const [nomRecette, setNomRecette] = useState('Nouvelle recette')
  const [portionsCount, setPortionsCount] = useState(10)
  const [sellingPricePortion, setSellingPricePortion] = useState(2500)
  const [lignes, setLignes] = useState<RecipeLine[]>([])

  function handleAddLine() {
    const first = productList[0]
    if (!first) return
    setLignes((prev) => [...prev, { id: `l-${Date.now()}-${Math.random()}`, productId: first.id, quantite: 1 }])
  }

  function handleUpdateLine(id: string, patch: Partial<RecipeLine>) {
    setLignes((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function handleRemoveLine(id: string) {
    setLignes((prev) => prev.filter((l) => l.id !== id))
  }

  const lignesDetail = useMemo(
    () =>
      lignes.map((l) => {
        const product = products[l.productId]
        const marketPrice = marketPriceFor(l.productId)
        return {
          ...l,
          product,
          coutNdugumi: product ? product.prixUnitaire * l.quantite : 0,
          coutMarche: marketPrice !== null ? marketPrice * l.quantite : null,
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lignes, products, marketEntries]
  )

  const totalCA = sellingPricePortion * portionsCount
  const costNdugumi = lignesDetail.reduce((sum, l) => sum + l.coutNdugumi, 0)
  const lignesAvecMarche = lignesDetail.filter((l) => l.coutMarche !== null)
  const costMarche = lignesAvecMarche.reduce((sum, l) => sum + (l.coutMarche ?? 0), 0)
  const comparaisonComplete = lignes.length > 0 && lignesAvecMarche.length === lignes.length

  const foodCostNdugumiPct = totalCA > 0 ? (costNdugumi / totalCA) * 100 : 0
  const foodCostMarchePct = totalCA > 0 ? (costMarche / totalCA) * 100 : 0
  const marginNdugumiPct = 100 - foodCostNdugumiPct
  const marginMarchePct = 100 - foodCostMarchePct
  const economyTotal = costMarche - costNdugumi

  function handleShareWhatsapp() {
    if (lignes.length === 0) {
      alert('Ajoutez au moins un ingrédient avant de partager.')
      return
    }
    const marcheLigne = comparaisonComplete
      ? `• *Coût Marché Traditionnel* : ${costMarche.toLocaleString('fr-FR')} FCFA (Food Cost : ${foodCostMarchePct.toFixed(1)}% | Marge : ${marginMarchePct.toFixed(1)}%)\n`
      : lignesAvecMarche.length > 0
        ? `• *Coût Marché Traditionnel (partiel, ${lignesAvecMarche.length}/${lignes.length} ingrédients)* : ${costMarche.toLocaleString('fr-FR')} FCFA\n`
        : ''
    const text = `🍲 *FICHE RENTABILITÉ CUISINE NDUGUMi — ${nomRecette.toUpperCase()}*

💰 *Chiffre d'Affaires (${portionsCount} portions)* : ${totalCA.toLocaleString('fr-FR')} FCFA (${sellingPricePortion.toLocaleString('fr-FR')} FCFA/portion)

📊 *Comparatif Approvisionnement* :
${marcheLigne}• *Coût avec NDUGUMi* : ${costNdugumi.toLocaleString('fr-FR')} FCFA (Food Cost : ${foodCostNdugumiPct.toFixed(1)}% | Marge : ${marginNdugumiPct.toFixed(1)}%)
${comparaisonComplete ? `\n✨ *GAIN DE MARGE BRUTE* : +${economyTotal.toLocaleString('fr-FR')} FCFA économisés sur cette recette !` : ''}

📲 Commandez vos ingrédients chez NDUGUMi pour augmenter la rentabilité de votre restaurant !`

    const link = waLinkWithText('', text)
    if (link) window.open(link, '_blank')
  }

  function downloadPdfReport() {
    if (lignes.length === 0) {
      alert('Ajoutez au moins un ingrédient avant de générer le PDF.')
      return
    }
    const doc = new jsPDF()
    brandedHeaderMm(doc, 'NDUGUMi — CALCULATEUR DE MARGE ET RENTABILITÉ')

    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text(`Recette : ${nomRecette}`, 14, 35)
    doc.setFont('helvetica', 'normal')
    doc.text(`Prix de vente par portion : ${sellingPricePortion.toLocaleString('fr-FR')} FCFA`, 14, 42)
    doc.text(`Nombre de portions : ${portionsCount}`, 14, 49)

    autoTable(doc, {
      startY: 55,
      head: [['Ingrédient (catalogue)', 'Quantité', 'Coût NDUGUMi (FCFA)', 'Coût Marché (FCFA)']],
      body: lignesDetail.map((l) => [
        l.product?.nom || '—',
        `${l.quantite} x ${l.product?.unite || ''}`,
        `${l.coutNdugumi.toLocaleString('fr-FR')} FCFA`,
        l.coutMarche !== null ? `${l.coutMarche.toLocaleString('fr-FR')} FCFA` : 'Non disponible',
      ]),
      headStyles: { fillColor: [122, 31, 31] },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 15
    doc.setFont('helvetica', 'bold')
    doc.text(`Coût Total Ingrédients NDUGUMi : ${costNdugumi.toLocaleString('fr-FR')} FCFA`, 14, finalY)
    if (comparaisonComplete) {
      doc.text(`Marge Brute avec NDUGUMi : ${marginNdugumiPct.toFixed(1)}% (+${economyTotal.toLocaleString('fr-FR')} FCFA de gain)`, 14, finalY + 7)
    } else if (lignesAvecMarche.length > 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`Comparaison marché partielle : prix marché disponible pour ${lignesAvecMarche.length}/${lignes.length} ingrédients seulement.`, 14, finalY + 7)
    }

    doc.save(`Rentabilite_${nomRecette.replace(/\s+/g, '_')}.pdf`)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🍲 Calculateur de Marge Plat & Food Cost</h1>
          <p className="page-subtitle">
            Composez une recette avec les vrais produits et prix du Catalogue ({productList.length} produits) pour démontrer la marge réelle
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={handleShareWhatsapp}>📲 Partager WhatsApp</button>
          <button className="btn" onClick={downloadPdfReport}>📄 Télécharger PDF</button>
        </div>
      </div>

      {/* Paramètres de la recette */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field-row" style={{ minWidth: 220, flex: 1 }}>
            <label>Nom de la recette</label>
            <input type="text" value={nomRecette} onChange={(e) => setNomRecette(e.target.value)} />
          </div>
          <div className="field-row" style={{ width: 160 }}>
            <label>Nombre de portions</label>
            <input type="number" value={portionsCount} onChange={(e) => setPortionsCount(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div className="field-row" style={{ width: 180 }}>
            <label>Prix de vente / portion (FCFA)</label>
            <input type="number" value={sellingPricePortion} onChange={(e) => setSellingPricePortion(Number(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      {/* Ingrédients réels du catalogue */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Ingrédients (produits réels du catalogue)</h3>
          <button className="btn secondary small" onClick={handleAddLine} disabled={productList.length === 0}>+ Ajouter un ingrédient</button>
        </div>
        {lignes.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Aucun ingrédient — cliquez sur "+ Ajouter un ingrédient" pour composer la recette.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lignes.map((l) => {
              const detail = lignesDetail.find((d) => d.id === l.id)
              return (
                <div key={l.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={l.productId}
                    onChange={(e) => handleUpdateLine(l.id, { productId: e.target.value })}
                    style={{ flex: '1 1 260px' }}
                  >
                    {productList.map((p) => (
                      <option key={p.id} value={p.id}>{p.nom} ({p.unite}, {p.prixUnitaire.toLocaleString('fr-FR')} FCFA)</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={l.quantite}
                    min={0.1}
                    step={0.1}
                    onChange={(e) => handleUpdateLine(l.id, { quantite: Number(e.target.value) || 0 })}
                    style={{ width: 90 }}
                    title="Multiplicateur de l'unité catalogue"
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', minWidth: 90 }}>
                    x {detail?.product?.unite}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', minWidth: 100 }}>
                    {detail?.coutNdugumi.toLocaleString('fr-FR')} FCFA
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', minWidth: 110 }}>
                    marché : {detail?.coutMarche !== null && detail?.coutMarche !== undefined ? `${detail.coutMarche.toLocaleString('fr-FR')} FCFA` : '— non dispo'}
                  </span>
                  <button className="btn secondary small" onClick={() => handleRemoveLine(l.id)}>✕</button>
                </div>
              )
            })}
          </div>
        )}
        {lignes.length > 0 && !comparaisonComplete && (
          <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 10 }}>
            ⚠️ Comparaison marché disponible pour {lignesAvecMarche.length}/{lignes.length} ingrédient(s) seulement (les autres n'ont pas encore de relevé
            correspondant dans le Baromètre Prix — utilisez la recherche internet du Catalogue ou du Baromètre pour en ajouter).
          </p>
        )}
      </div>

      {/* Cartes KPI Comparatives */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="panel" style={{ borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>APPRO MARCHÉ TRADITIONNEL</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#b91c1c', marginTop: 4 }}>
            {comparaisonComplete || lignesAvecMarche.length > 0 ? `${costMarche.toLocaleString('fr-FR')} FCFA` : '—'}
          </div>
          <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-dim)' }}>
            {totalCA > 0 && lignesAvecMarche.length > 0 ? (
              <>Food Cost : <strong>{foodCostMarchePct.toFixed(1)}%</strong> | Marge : <strong>{marginMarchePct.toFixed(1)}%</strong></>
            ) : (
              'En attente de données'
            )}
          </div>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>APPRO NDUGUMi DIRECT</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
            {costNdugumi.toLocaleString('fr-FR')} FCFA
          </div>
          <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-dim)' }}>
            {totalCA > 0 ? (
              <>Food Cost : <strong>{foodCostNdugumiPct.toFixed(1)}%</strong> | Marge : <strong>{marginNdugumiPct.toFixed(1)}%</strong></>
            ) : (
              'En attente de données'
            )}
          </div>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #0284c7', background: '#f0f9ff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>GAIN EN CASH SUR CETTE RECETTE</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0284c7', marginTop: 4 }}>
            {comparaisonComplete ? `+${economyTotal.toLocaleString('fr-FR')} FCFA` : lignesAvecMarche.length > 0 ? `~${economyTotal.toLocaleString('fr-FR')} FCFA` : '—'}
          </div>
          <div style={{ fontSize: 11.5, color: '#0369a1', marginTop: 4, fontWeight: 600 }}>
            {comparaisonComplete
              ? `Économie nette réalisée pour ${portionsCount} portions livrées`
              : lignesAvecMarche.length > 0
                ? 'Estimation partielle — certains ingrédients sans prix marché'
                : 'Ajoutez des ingrédients pour voir le gain'}
          </div>
        </div>
      </div>
    </div>
  )
}
