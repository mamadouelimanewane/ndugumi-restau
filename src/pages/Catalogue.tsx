import { useMemo, useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import type { Product } from '../types'
import ProductDetailModal from '../components/ProductDetailModal'

function emptyDraft(): Omit<Product, 'id'> {
  return { nom: '', categorie: '', prixUnitaire: 0, unite: '', description: '', origine: '', stockDispo: 0, minimumCommande: 1, fournisseur: '' }
}

export default function Catalogue() {
  const products = useCrmStore((s) => s.products)
  const addProduct = useCrmStore((s) => s.addProduct)
  const updateProduct = useCrmStore((s) => s.updateProduct)
  const removeProduct = useCrmStore((s) => s.removeProduct)

  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState(emptyDraft())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState(emptyDraft())
  const [categorieFilter, setCategorieFilter] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

  const list = useMemo(() => Object.values(products).sort((a, b) => a.nom.localeCompare(b.nom)), [products])

  const categories = useMemo(() => {
    const set = new Set(list.map((p) => p.categorie).filter(Boolean))
    return Array.from(set).sort()
  }, [list])

  const filtered = useMemo(
    () => (categorieFilter ? list.filter((p) => p.categorie === categorieFilter) : list),
    [list, categorieFilter]
  )

  function handleAdd() {
    if (!draft.nom.trim() || draft.prixUnitaire <= 0) return
    addProduct({
      nom: draft.nom.trim(),
      categorie: draft.categorie.trim() || 'Autre',
      prixUnitaire: draft.prixUnitaire,
      unite: draft.unite.trim() || 'unité',
      description: draft.description.trim(),
      origine: draft.origine?.trim(),
      stockDispo: draft.stockDispo ? Number(draft.stockDispo) : undefined,
      minimumCommande: draft.minimumCommande ? Number(draft.minimumCommande) : 1,
      fournisseur: draft.fournisseur?.trim(),
    })
    setDraft(emptyDraft())
    setShowAdd(false)
  }

  function startEdit(p: Product) {
    setEditingId(p.id)
    setEditDraft({
      nom: p.nom,
      categorie: p.categorie,
      prixUnitaire: p.prixUnitaire,
      unite: p.unite,
      description: p.description,
      origine: p.origine || '',
      stockDispo: p.stockDispo || 0,
      minimumCommande: p.minimumCommande || 1,
      fournisseur: p.fournisseur || '',
    })
  }

  function saveEdit() {
    if (!editingId) return
    updateProduct(editingId, editDraft)
    setEditingId(null)
  }

  function handleRemove(p: Product) {
    if (confirm(`Supprimer « ${p.nom} » du catalogue ?`)) removeProduct(p.id)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catalogue produits</h1>
          <p className="page-subtitle">
            {filtered.length} / {list.length} produits — avec fiches détaillées, upload et téléchargement d'images ou vidéos
          </p>
        </div>
        <button className="btn" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Fermer' : '+ Nouveau produit'}
        </button>
      </div>

      {showAdd && (
        <div className="panel">
          <h3>Nouveau produit</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field-row" style={{ minWidth: 180 }}>
              <label>Nom du produit</label>
              <input type="text" value={draft.nom} onChange={(e) => setDraft({ ...draft, nom: e.target.value })} placeholder="Ex : Riz brisé parfumé" />
            </div>
            <div className="field-row" style={{ minWidth: 140 }}>
              <label>Catégorie</label>
              <input type="text" value={draft.categorie} onChange={(e) => setDraft({ ...draft, categorie: e.target.value })} placeholder="Ex : Céréales" />
            </div>
            <div className="field-row" style={{ minWidth: 130 }}>
              <label>Prix unitaire (FCFA)</label>
              <input
                type="text"
                inputMode="numeric"
                value={draft.prixUnitaire || ''}
                onChange={(e) => setDraft({ ...draft, prixUnitaire: Number(e.target.value) || 0 })}
                placeholder="15000"
              />
            </div>
            <div className="field-row" style={{ minWidth: 120 }}>
              <label>Unité</label>
              <input type="text" value={draft.unite} onChange={(e) => setDraft({ ...draft, unite: e.target.value })} placeholder="Ex : sac 25kg" />
            </div>
            <div className="field-row" style={{ minWidth: 140 }}>
              <label>Origine / Provenance</label>
              <input type="text" value={draft.origine} onChange={(e) => setDraft({ ...draft, origine: e.target.value })} placeholder="Ex : Vallée du Fleuve" />
            </div>
            <div className="field-row">
              <button className="btn" onClick={handleAdd}>
                Ajouter au catalogue
              </button>
            </div>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className="filters-bar">
          <select value={categorieFilter} onChange={(e) => setCategorieFilter(e.target.value)}>
            <option value="">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 60, textAlign: 'center' }}>Visuel</th>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Unité</th>
              <th>Prix (FCFA)</th>
              <th style={{ textAlign: 'center', width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const mediaCount = p.medias?.length || 0
              const mainMedia = p.medias?.[0]

              return (
                <tr key={p.id}>
                  {editingId === p.id ? (
                    <>
                      <td style={{ textAlign: 'center' }}>🖼️</td>
                      <td>
                        <input type="text" value={editDraft.nom} onChange={(e) => setEditDraft({ ...editDraft, nom: e.target.value })} style={{ fontSize: 12 }} />
                      </td>
                      <td>
                        <input type="text" value={editDraft.categorie} onChange={(e) => setEditDraft({ ...editDraft, categorie: e.target.value })} style={{ fontSize: 12, width: 100 }} />
                      </td>
                      <td>
                        <input type="text" value={editDraft.unite} onChange={(e) => setEditDraft({ ...editDraft, unite: e.target.value })} style={{ fontSize: 12, width: 100 }} />
                      </td>
                      <td>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editDraft.prixUnitaire}
                          onChange={(e) => setEditDraft({ ...editDraft, prixUnitaire: Number(e.target.value) || 0 })}
                          style={{ fontSize: 12, width: 80 }}
                        />
                      </td>
                      <td style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button className="btn small" onClick={saveEdit}>
                          Enregistrer
                        </button>
                        <button className="btn secondary small" onClick={() => setEditingId(null)}>
                          Annuler
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td
                        style={{ textAlign: 'center', cursor: 'pointer' }}
                        onClick={() => setSelectedProductId(p.id)}
                        title="Ouvrir la fiche produit"
                      >
                        {mainMedia ? (
                          mainMedia.type === 'video' ? (
                            <div style={{ width: 38, height: 38, borderRadius: 6, background: '#1f2937', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 12 }}>
                              🎬 {mediaCount}
                            </div>
                          ) : (
                            <img
                              src={mainMedia.url}
                              alt={p.nom}
                              style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 6, margin: '0 auto', border: '1px solid var(--border)' }}
                            />
                          )
                        ) : (
                          <span style={{ opacity: 0.4, fontSize: 16 }}>📷</span>
                        )}
                      </td>
                      <td>
                        <strong
                          style={{ color: 'var(--primary, #7a1f1f)', cursor: 'pointer' }}
                          onClick={() => setSelectedProductId(p.id)}
                        >
                          {p.nom}
                        </strong>
                        {p.origine && (
                          <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>
                            ({p.origine})
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="zone-tag">{p.categorie}</span>
                      </td>
                      <td>{p.unite}</td>
                      <td style={{ fontWeight: 700 }}>{p.prixUnitaire.toLocaleString('fr-FR')}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn secondary small"
                          style={{ padding: '4px 8px', fontSize: 11, marginRight: 4, fontWeight: 600 }}
                          onClick={() => setSelectedProductId(p.id)}
                        >
                          👁️ Fiche produit {mediaCount > 0 && `(${mediaCount})`}
                        </button>
                        <button
                          className="btn secondary small"
                          style={{ padding: '4px 8px', fontSize: 11, marginRight: 4 }}
                          onClick={() => startEdit(p)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn secondary small"
                          style={{ padding: '4px 8px', fontSize: 11, color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}
                          onClick={() => handleRemove(p)}
                        >
                          🗑️
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  Aucun produit dans le catalogue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </div>
  )
}
