import { useState } from 'react'
import { waLinkWithText } from '../utils/phone'

interface MarketProductPrice {
  id: string
  nom: string
  categorie: string
  unite: string
  prixNdugumi: number // FCFA
  prixTilene: number // FCFA
  prixCastors: number // FCFA
  prixSandaga: number // FCFA
  tendance: 'hausse' | 'baisse' | 'stable'
  variation: string // ex: "-5%", "+8%"
  conseilIa: string
}

const MARKET_PRICES: MarketProductPrice[] = [
  {
    id: 'mp-1',
    nom: 'Riz Brisé Parfumé (Sac 50kg)',
    categorie: 'Céréales',
    unite: 'sac 50kg',
    prixNdugumi: 21500,
    prixTilene: 23000,
    prixCastors: 22800,
    prixSandaga: 23500,
    tendance: 'stable',
    variation: '0%',
    conseilIa: 'Prix stable — Acheter selon les besoins hebdomadaires normaux.',
  },
  {
    id: 'mp-2',
    nom: 'Huile Végétale Raffinée (Bidon 20L)',
    categorie: 'Huiles',
    unite: 'bidon 20L',
    prixNdugumi: 18000,
    prixTilene: 19500,
    prixCastors: 19200,
    prixSandaga: 20000,
    tendance: 'baisse',
    variation: '-4.5%',
    conseilIa: '🔥 opportunité : Prix au plus bas cette semaine à Tilène & Castors ! Profitez-en pour recommander aux clients de constituer des réserves.',
  },
  {
    id: 'mp-3',
    nom: 'Oignon Local Niayes (Sac 25kg)',
    categorie: 'Légumes',
    unite: 'sac 25kg',
    prixNdugumi: 9000,
    prixTilene: 10500,
    prixCastors: 10200,
    prixSandaga: 11000,
    tendance: 'hausse',
    variation: '+12%',
    conseilIa: '⚠️ Alerte hausse : Forte demande sur le marché de Thiaroye. Le prix va augmenter la semaine prochaine.',
  },
  {
    id: 'mp-4',
    nom: 'Pomme de terre locale (Sac 25kg)',
    categorie: 'Légumes',
    unite: 'sac 25kg',
    prixNdugumi: 9500,
    prixTilene: 10800,
    prixCastors: 10500,
    prixSandaga: 11200,
    tendance: 'stable',
    variation: '+1%',
    conseilIa: 'Prix très compétitif chez NDUGUMi par rapport aux grossistes de Castors.',
  },
  {
    id: 'mp-5',
    nom: 'Concentré de Tomate (Carton 100boîtes)',
    categorie: 'Épicerie',
    unite: 'carton',
    prixNdugumi: 14500,
    prixTilene: 16000,
    prixCastors: 15800,
    prixSandaga: 16500,
    tendance: 'baisse',
    variation: '-3%',
    conseilIa: 'Offre promotionnelle NDUGUMi imbattable par rapport aux détaillants de Sandaga.',
  },
]

export default function MarchePrices() {
  const [prices] = useState<MarketProductPrice[]>(MARKET_PRICES)
  const [search, setSearch] = useState('')
  const [categorieFilter, setCategorieFilter] = useState('')

  const filtered = prices.filter((p) => {
    if (search && !p.nom.toLowerCase().includes(search.toLowerCase())) return false
    if (categorieFilter && p.categorie !== categorieFilter) return false
    return true
  })

  function handleSharePriceReport(p: MarketProductPrice) {
    const text = `📊 *BAROMÈTRE PRIX MARCHÉ DAKAR — ${p.nom.toUpperCase()}*

📍 *Comparatif de cette semaine* :
• *NDUGUMi Direct* : ${p.prixNdugumi.toLocaleString('fr-FR')} FCFA / ${p.unite} 💰
• Marché Tilène : ${p.prixTilene.toLocaleString('fr-FR')} FCFA
• Marché Castors : ${p.prixCastors.toLocaleString('fr-FR')} FCFA
• Marché Sandaga : ${p.prixSandaga.toLocaleString('fr-FR')} FCFA

💡 *Économie NDUGUMi* : Économisez jusqu'à ${(p.prixSandaga - p.prixNdugumi).toLocaleString('fr-FR')} FCFA par ${p.unite} + livraison offerte !

💡 *Conseil de nos experts* : ${p.conseilIa}

📲 Commandez directement via NDUGUMi pour verrouiller vos prix !`

    const link = waLinkWithText('', text)
    if (link) window.open(link, '_blank')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Baromètre des Prix des Marchés de Dakar</h1>
          <p className="page-subtitle">
            Relevés hebdomadaires des cours aux marchés Tilène, Castors, Sandaga et conseils d'achat IA
          </p>
        </div>
      </div>

      {/* Bannière de conseils IA */}
      <div className="panel" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 32 }}>💡</span>
          <div>
            <h3 style={{ color: '#fff', margin: 0, fontSize: 15 }}>Intelligence Marché Dakar NDUGUMi</h3>
            <p style={{ fontSize: 12.5, color: '#94a3b8', margin: '4px 0 0 0' }}>
              Nos agents effectuent des relevés chaque lundi matin à Tilène, Castors et Sandaga. Utilisez ces données pour conseiller vos clients restaurateurs sur le meilleur moment pour passer commande.
            </p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Rechercher un produit (ex: Riz, Huile, Oignon...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={categorieFilter} onChange={(e) => setCategorieFilter(e.target.value)}>
          <option value="">Toutes les catégories</option>
          <option value="Céréales">Céréales</option>
          <option value="Huiles">Huiles</option>
          <option value="Légumes">Légumes</option>
          <option value="Épicerie">Épicerie</option>
        </select>
      </div>

      {/* Tableau comparatif des prix */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Produit & Catégorie</th>
              <th>Prix NDUGUMi (Livré)</th>
              <th>Marché Tilène</th>
              <th>Marché Castors</th>
              <th>Marché Sandaga</th>
              <th>Tendance & Économie</th>
              <th style={{ textAlign: 'center', width: 180 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const maxMarche = Math.max(p.prixTilene, p.prixCastors, p.prixSandaga)
              const economie = maxMarche - p.prixNdugumi

              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.nom}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Unité : {p.unite}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#16a34a', background: '#f0fdf4', padding: '2px 6px', borderRadius: 4 }}>
                      {p.prixNdugumi.toLocaleString('fr-FR')} FCFA
                    </span>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{p.prixTilene.toLocaleString('fr-FR')} FCFA</td>
                  <td style={{ fontSize: 12.5 }}>{p.prixCastors.toLocaleString('fr-FR')} FCFA</td>
                  <td style={{ fontSize: 12.5 }}>{p.prixSandaga.toLocaleString('fr-FR')} FCFA</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{p.tendance === 'hausse' ? '📈' : p.tendance === 'baisse' ? '📉' : '➡️'}</span>
                      <strong style={{ color: '#047857', fontSize: 12 }}>
                        -{economie.toLocaleString('fr-FR')} FCFA/unité
                      </strong>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn secondary small"
                      style={{ padding: '4px 8px', fontSize: 11, color: '#25d366', borderColor: '#25d366', fontWeight: 700 }}
                      onClick={() => handleSharePriceReport(p)}
                    >
                      📲 Partager rapport WhatsApp
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
