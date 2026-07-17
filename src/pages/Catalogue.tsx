import { useMemo, useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import type { Product } from '../types'

function emptyDraft(): Omit<Product, 'id'> {
  return { nom: '', categorie: '', prixUnitaire: 0, unite: '', description: '' }
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
    })
    setDraft(emptyDraft())
    setShowAdd(false)
  }

  function startEdit(p: Product) {
    setEditingId(p.id)
    setEditDraft({ nom: p.nom, categorie: p.categorie, prixUnitaire: p.prixUnitaire, unite: p.unite, description: p.description })
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
            {filtered.length} / {list.length} produits — utilisés pour proposer un panier à un restaurant via WhatsApp
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
            <div className="field-row" style={{ minWidth: 200 }}>
              <label>Nom</label>
              <input type="text" value={draft.nom} onChange={(e) => setDraft({ ...draft, nom: e.target.value })} placeholder="Ex : Riz brisé parfumé" />
            </div>
            <div className="field-row" style={{ minWidth: 160 }}>
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
            <div className="field-row" style={{ minWidth: 140 }}>
              <label>Unité</label>
              <input type="text" value={draft.unite} onChange={(e) => setDraft({ ...draft, unite: e.target.value })} placeholder="Ex : sac 25kg" />
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
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Unité</th>
              <th>Prix (FCFA)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                {editingId === p.id ? (
                  <>
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
                    <td style={{ display: 'flex', gap: 6 }}>
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
                    <td>{p.nom}</td>
                    <td>
                      <span className="zone-tag">{p.categorie}</span>
                    </td>
                    <td>{p.unite}</td>
                    <td style={{ fontWeight: 700 }}>{p.prixUnitaire.toLocaleString('fr-FR')}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn secondary small" onClick={() => startEdit(p)}>
                        Modifier
                      </button>
                      <button className="btn secondary small" onClick={() => handleRemove(p)}>
                        Supprimer
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">
                  Aucun produit dans le catalogue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
