import { useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { waLinkWithText } from '../utils/phone'
import type { Supplier, SupplierStatut } from '../types'

function emptyDraft(): Omit<Supplier, 'id'> {
  return { nom: '', region: '', produitsFournis: '', telephone: '', qualiteNote: 4, prixNegocie: '', statut: 'en_negociation' }
}

interface FoundSupplier {
  nom: string
  region: string
  produitsFournis: string
  telephone: string
}

export default function Fournisseurs() {
  const suppliers = useCrmStore((s) => s.suppliers)
  const addSupplier = useCrmStore((s) => s.addSupplier)
  const updateSupplier = useCrmStore((s) => s.updateSupplier)
  const removeSupplier = useCrmStore((s) => s.removeSupplier)

  const supplierList = Object.values(suppliers)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState(emptyDraft())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState(emptyDraft())

  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [foundSuppliers, setFoundSuppliers] = useState<FoundSupplier[] | null>(null)

  const filtered = supplierList.filter(
    (s) => s.nom.toLowerCase().includes(search.toLowerCase()) || s.produitsFournis.toLowerCase().includes(search.toLowerCase())
  )

  // Note qualité moyenne réelle — remplace un ancien stat "75% approvisionnement local" qui
  // n'était calculé sur aucune donnée réelle (region est un texte libre, pas un booléen local/import).
  const noteMoyenne = supplierList.length > 0 ? supplierList.reduce((sum, s) => sum + s.qualiteNote, 0) / supplierList.length : 0

  function handleOrderWhatsapp(s: Supplier) {
    const text = `Bonjour ${s.nom}, c'est l'équipe d'Achats NDUGUMi Entrepôt. Nous souhaitons passer une commande pour la semaine prochaine sur les produits : ${s.produitsFournis}. Merci de nous confirmer la disponibilité et le délai de livraison.`
    const link = waLinkWithText(s.telephone, text)
    if (link) window.open(link, '_blank')
  }

  function handleAdd() {
    if (!draft.nom.trim()) return
    addSupplier({ ...draft, nom: draft.nom.trim() })
    setDraft(emptyDraft())
    setShowAdd(false)
  }

  function startEdit(s: Supplier) {
    setEditingId(s.id)
    setEditDraft({ nom: s.nom, region: s.region, produitsFournis: s.produitsFournis, telephone: s.telephone, qualiteNote: s.qualiteNote, prixNegocie: s.prixNegocie, statut: s.statut })
  }

  function saveEdit() {
    if (!editingId) return
    updateSupplier(editingId, editDraft)
    setEditingId(null)
  }

  function handleRemove(s: Supplier) {
    if (confirm(`Supprimer « ${s.nom} » de la liste des fournisseurs ?`)) removeSupplier(s.id)
  }

  async function handleSearchSuppliers() {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchError(null)
    setFoundSuppliers(null)
    try {
      const res = await fetch('/api/market-prices?action=find-suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produit: searchQuery.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSearchError(data.error || 'Erreur lors de la recherche.')
        return
      }
      setFoundSuppliers(data.fournisseurs ?? [])
    } catch (e: any) {
      setSearchError(e?.message || 'Impossible de contacter le serveur.')
    } finally {
      setSearching(false)
    }
  }

  function handleAddFoundSupplier(f: FoundSupplier) {
    addSupplier({
      nom: f.nom,
      region: f.region,
      produitsFournis: f.produitsFournis,
      telephone: f.telephone,
      qualiteNote: 0,
      prixNegocie: 'À négocier',
      statut: 'en_negociation',
    })
    alert(`« ${f.nom} » ajouté à la liste des fournisseurs. Complétez la note qualité et le tarif négocié une fois le contact établi.`)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏢 Gestion des Fournisseurs & Achats Entrepôt NDUGUMi</h1>
          <p className="page-subtitle">
            Approvisionnement en amont auprès des producteurs locaux et grands importateurs
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn secondary" onClick={() => setShowSearch((v) => !v)}>
            🌐 Rechercher des fournisseurs (IA)
          </button>
          <button className="btn" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? 'Fermer' : '+ Nouveau fournisseur'}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 4px' }}>🌐 Rechercher des fournisseurs réels via Perplexity</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 12px' }}>
            Tapez un produit ou une catégorie (ex : "riz", "oignon", "poulet") — l'IA cherche des coopératives,
            producteurs ou importateurs réels au Sénégal susceptibles de fournir ce produit en gros.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex : riz, oignon, poulet, huile végétale..."
              style={{ flex: '1 1 260px' }}
            />
            <button className="btn primary" onClick={handleSearchSuppliers} disabled={searching || !searchQuery.trim()}>
              {searching ? 'Recherche en cours…' : '🌐 Rechercher'}
            </button>
          </div>

          {searchError && <p style={{ fontSize: 12.5, color: 'var(--danger, #c0392b)', marginTop: 10 }}>{searchError}</p>}

          {foundSuppliers && foundSuppliers.length === 0 && !searchError && (
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 10 }}>Aucun fournisseur clairement identifiable trouvé pour cette recherche.</p>
          )}

          {foundSuppliers && foundSuppliers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {foundSuppliers.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                  <div style={{ flex: '1 1 260px' }}>
                    <strong>{f.nom}</strong>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {f.region && `📍 ${f.region} — `}{f.produitsFournis}
                      {f.telephone && ` — 📞 ${f.telephone}`}
                    </div>
                  </div>
                  <button className="btn secondary small" onClick={() => handleAddFoundSupplier(f)}>
                    + Ajouter à ma liste
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Nouveau fournisseur</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field-row" style={{ minWidth: 200 }}>
              <label>Nom du fournisseur</label>
              <input type="text" value={draft.nom} onChange={(e) => setDraft({ ...draft, nom: e.target.value })} />
            </div>
            <div className="field-row" style={{ minWidth: 160 }}>
              <label>Région</label>
              <input type="text" value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} />
            </div>
            <div className="field-row" style={{ minWidth: 200 }}>
              <label>Produits fournis</label>
              <input type="text" value={draft.produitsFournis} onChange={(e) => setDraft({ ...draft, produitsFournis: e.target.value })} />
            </div>
            <div className="field-row" style={{ minWidth: 150 }}>
              <label>Téléphone</label>
              <input type="text" value={draft.telephone} onChange={(e) => setDraft({ ...draft, telephone: e.target.value })} />
            </div>
            <div className="field-row" style={{ minWidth: 150 }}>
              <label>Tarif négocié</label>
              <input type="text" value={draft.prixNegocie} onChange={(e) => setDraft({ ...draft, prixNegocie: e.target.value })} />
            </div>
            <div className="field-row" style={{ width: 100 }}>
              <label>Note qualité</label>
              <input type="number" min={0} max={5} step={0.1} value={draft.qualiteNote} onChange={(e) => setDraft({ ...draft, qualiteNote: Number(e.target.value) || 0 })} />
            </div>
            <div className="field-row" style={{ width: 160 }}>
              <label>Statut</label>
              <select value={draft.statut} onChange={(e) => setDraft({ ...draft, statut: e.target.value as SupplierStatut })}>
                <option value="agreé">Agréé</option>
                <option value="en_negociation">En négociation</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
            <div className="field-row">
              <button className="btn" onClick={handleAdd}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* Baromètre Fournisseurs (calculé sur les vraies données) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="panel" style={{ borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>FOURNISSEURS AGRÉÉS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
            {supplierList.filter((s) => s.statut === 'agreé').length} / {supplierList.length} partenaires
          </div>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>NOTE QUALITÉ MOYENNE</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0369a1', marginTop: 4 }}>
            {supplierList.length > 0 ? `⭐ ${noteMoyenne.toFixed(1)} / 5` : '—'}
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
              <th style={{ textAlign: 'center', width: 260 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="empty-state">Aucun fournisseur pour l'instant. Ajoutez-en un ou lancez une recherche IA.</td></tr>
            ) : (
              filtered.map((s) =>
                editingId === s.id ? (
                  <tr key={s.id}>
                    <td><input type="text" value={editDraft.nom} onChange={(e) => setEditDraft({ ...editDraft, nom: e.target.value })} style={{ fontSize: 12 }} /></td>
                    <td><input type="text" value={editDraft.region} onChange={(e) => setEditDraft({ ...editDraft, region: e.target.value })} style={{ fontSize: 12 }} /></td>
                    <td><input type="text" value={editDraft.produitsFournis} onChange={(e) => setEditDraft({ ...editDraft, produitsFournis: e.target.value })} style={{ fontSize: 12 }} /></td>
                    <td><input type="text" value={editDraft.prixNegocie} onChange={(e) => setEditDraft({ ...editDraft, prixNegocie: e.target.value })} style={{ fontSize: 12 }} /></td>
                    <td><input type="number" min={0} max={5} step={0.1} value={editDraft.qualiteNote} onChange={(e) => setEditDraft({ ...editDraft, qualiteNote: Number(e.target.value) || 0 })} style={{ fontSize: 12, width: 60 }} /></td>
                    <td>
                      <select value={editDraft.statut} onChange={(e) => setEditDraft({ ...editDraft, statut: e.target.value as SupplierStatut })} style={{ fontSize: 12 }}>
                        <option value="agreé">Agréé</option>
                        <option value="en_negociation">En négociation</option>
                        <option value="inactif">Inactif</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn small" onClick={saveEdit}>Enregistrer</button>
                      <button className="btn secondary small" onClick={() => setEditingId(null)}>Annuler</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id}>
                    <td><strong>{s.nom}</strong></td>
                    <td>📍 {s.region}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.produitsFournis}</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>{s.prixNegocie}</td>
                    <td>{s.qualiteNote > 0 ? `⭐ ${s.qualiteNote} / 5` : '—'}</td>
                    <td>
                      <span
                        className="zone-tag"
                        style={{
                          background: s.statut === 'agreé' ? '#e8f5e9' : s.statut === 'inactif' ? '#f3f4f6' : '#fffbe0',
                          color: s.statut === 'agreé' ? '#047857' : s.statut === 'inactif' ? '#6b7280' : '#b45309',
                          fontWeight: 700,
                        }}
                      >
                        {s.statut === 'agreé' ? '✅ AGRÉÉ' : s.statut === 'inactif' ? '⏸️ INACTIF' : '⏳ NÉGOCIATION'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn secondary small"
                        style={{ padding: '4px 8px', fontSize: 11, color: '#25d366', borderColor: '#25d366', fontWeight: 700, marginRight: 4 }}
                        onClick={() => handleOrderWhatsapp(s)}
                      >
                        📲 Commander
                      </button>
                      <button className="btn secondary small" style={{ padding: '4px 8px', fontSize: 11, marginRight: 4 }} onClick={() => startEdit(s)}>✏️</button>
                      <button className="btn secondary small" style={{ padding: '4px 8px', fontSize: 11, color: '#dc2626' }} onClick={() => handleRemove(s)}>🗑️</button>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
