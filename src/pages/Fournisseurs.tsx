import { useState } from 'react'
import { waLinkWithText } from '../utils/phone'

interface Supplier {
  id: string
  nom: string
  region: string
  produitsFournis: string
  telephone: string
  qualiteNote: number // 1-5
  prixNegocie: string
  statut: 'agreé' | 'en_negociation' | 'inactif'
}

const SEED_SUPPLIERS: Supplier[] = [
  {
    id: 'fourn-1',
    nom: 'Coopérative Rizicole de Richard-Toll',
    region: 'Vallée du Fleuve Sénégal',
    produitsFournis: 'Riz brisé parfumé (Gambia & Sahel 108)',
    telephone: '+221 77 111 22 33',
    qualiteNote: 5,
    prixNegocie: '12 500 FCFA / sac 25kg',
    statut: 'agreé',
  },
  {
    id: 'fourn-2',
    nom: 'Groupement Maraîcher des Niayes (Notto Gouye Diama)',
    region: 'Niayes',
    produitsFournis: 'Oignons frais local, Pommes de terre & Carottes',
    telephone: '+221 77 222 33 44',
    qualiteNote: 4.8,
    prixNegocie: '7 000 FCFA / sac 25kg',
    statut: 'agreé',
  },
  {
    id: 'fourn-3',
    nom: 'Grands Importateurs de Dakar (Huileries & Épicerie)',
    region: 'Port Autonome de Dakar',
    produitsFournis: 'Huile végétale raffinée 20L & Concentré de tomate',
    telephone: '+221 77 333 44 55',
    qualiteNote: 4.5,
    prixNegocie: '15 200 FCFA / bidon 20L',
    statut: 'agreé',
  },
  {
    id: 'fourn-4',
    nom: 'Complexe Avicole de Mbour',
    region: 'Petite Côte / Mbour',
    produitsFournis: 'Poulet entier congelé & Œufs frais',
    telephone: '+221 77 444 55 66',
    qualiteNote: 4.6,
    prixNegocie: '26 000 FCFA / carton 10 poulets',
    statut: 'en_negociation',
  },
]

export default function Fournisseurs() {
  const [suppliers] = useState<Supplier[]>(SEED_SUPPLIERS)
  const [search, setSearch] = useState('')

  const filtered = suppliers.filter((s) => s.nom.toLowerCase().includes(search.toLowerCase()) || s.produitsFournis.toLowerCase().includes(search.toLowerCase()))

  function handleOrderWhatsapp(s: Supplier) {
    const text = `Bonjour ${s.nom}, c'est l'équipe d'Achats NDUGUMi Entrepôt. Nous souhaitons passer une commande pour la semaine prochaine sur les produits : ${s.produitsFournis}. Merci de nous confirmer la disponibilité et le délai de livraison.`
    const link = waLinkWithText(s.telephone, text)
    if (link) window.open(link, '_blank')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏢 Gestion des Fournisseurs & Achats Entrepôt NDUGUMi</h1>
          <p className="page-subtitle">
            Approvisionnement en amont auprès des producteurs locaux (Vallée du Fleuve, Niayes) et grands importateurs
          </p>
        </div>
      </div>

      {/* Baromètre Fournisseurs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="panel" style={{ borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>FOURNISSEURS AGRÉÉS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
            {suppliers.filter((s) => s.statut === 'agreé').length} partenaires directs
          </div>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>ORIGINE LOCALE (SÉNÉGAL)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0369a1', marginTop: 4 }}>
            75% approvisionnement local
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Rechercher un fournisseur ou un produit (Riz, Oignon, Poulet...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tableau des Fournisseurs */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fournisseur / Partner</th>
              <th>Région d'origine</th>
              <th>Produits fournis</th>
              <th>Tarif négocié (Grossiste)</th>
              <th>Note Qualité</th>
              <th>Statut</th>
              <th style={{ textAlign: 'center', width: 200 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.nom}</strong></td>
                <td>📍 {s.region}</td>
                <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.produitsFournis}</td>
                <td style={{ fontWeight: 700, color: '#16a34a' }}>{s.prixNegocie}</td>
                <td>⭐ {s.qualiteNote} / 5</td>
                <td>
                  <span
                    className="zone-tag"
                    style={{
                      background: s.statut === 'agreé' ? '#e8f5e9' : '#fffbe0',
                      color: s.statut === 'agreé' ? '#047857' : '#b45309',
                      fontWeight: 700,
                    }}
                  >
                    {s.statut === 'agreé' ? '✅ AGRÉÉ' : '⏳ NÉGOCIATION'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    className="btn secondary small"
                    style={{ padding: '4px 8px', fontSize: 11, color: '#25d366', borderColor: '#25d366', fontWeight: 700 }}
                    onClick={() => handleOrderWhatsapp(s)}
                  >
                    📲 Commander par WhatsApp
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
