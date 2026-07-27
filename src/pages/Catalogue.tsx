import { useEffect, useMemo, useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import type { Product } from '../types'
import ProductDetailModal from '../components/ProductDetailModal'

const RUPTURE_LOOKBACK_DAYS = 21
const MAX_WEB_SEARCH_PRODUCTS = 5

interface DuplicateGroup {
  ids: string[]
  raison: string
}

interface WebSearchLine {
  source: string
  libelle: string
  prix: number | null
  unite: string
  disponibilite: 'disponible' | 'rupture' | 'non précisé'
}

interface WebSearchResult {
  produit: string
  lignes: WebSearchLine[]
  error: string | null
}

// Recherche approximative : insensible à la casse et aux accents, tolère un ordre de mots
// différent et une saisie partielle (ex. "riz brise" retrouve "Riz brisé parfumé").
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const [ruptureNames, setRuptureNames] = useState<Set<string>>(new Set())
  const [scanningDuplicates, setScanningDuplicates] = useState(false)
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[] | null>(null)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)

  const [showWebSearch, setShowWebSearch] = useState(false)
  const [webSearchInput, setWebSearchInput] = useState('')
  const [webSearching, setWebSearching] = useState(false)
  const [webSearchResults, setWebSearchResults] = useState<WebSearchResult[] | null>(null)
  const [webSearchError, setWebSearchError] = useState<string | null>(null)

  useEffect(() => {
    async function loadRuptures() {
      try {
        const res = await fetch('/api/market-prices')
        const data = await res.json()
        const entries = (data.entries ?? []) as { produit: string; disponibilite?: string | null; created_at: string }[]
        const cutoff = Date.now() - RUPTURE_LOOKBACK_DAYS * 86400000
        const names = new Set<string>()
        for (const e of entries) {
          if (e.disponibilite === 'rupture' && new Date(e.created_at).getTime() >= cutoff) {
            names.add(e.produit.toLowerCase())
          }
        }
        setRuptureNames(names)
      } catch (e) {
        console.error('Erreur chargement disponibilité', e)
      }
    }
    loadRuptures()
  }, [])

  const list = useMemo(() => Object.values(products).sort((a, b) => a.nom.localeCompare(b.nom)), [products])

  const categories = useMemo(() => {
    const set = new Set(list.map((p) => p.categorie).filter(Boolean))
    return Array.from(set).sort()
  }, [list])

  const filtered = useMemo(() => {
    let result = categorieFilter ? list.filter((p) => p.categorie === categorieFilter) : list
    const q = normalize(searchQuery)
    if (q) {
      const words = q.split(/\s+/).filter(Boolean)
      result = result.filter((p) => {
        const haystack = normalize(`${p.nom} ${p.categorie} ${p.fournisseur || ''}`)
        return words.every((w) => haystack.includes(w))
      })
    }
    return result
  }, [list, categorieFilter, searchQuery])

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

  function isRupture(p: Product): boolean {
    return ruptureNames.has(p.nom.toLowerCase())
  }

  async function handleScanDuplicates() {
    setScanningDuplicates(true)
    setDuplicateError(null)
    setDuplicateGroups(null)
    try {
      // Envoyer les 210 produits en un seul appel dépasse trop souvent le temps de génération de
      // DeepSeek (constaté aussi sur l'analyse de tendances du Baromètre Prix) : on découpe par
      // lots, chaque lot ratant les doublons potentiels avec un produit d'un autre lot — compromis
      // accepté ailleurs dans ce projet pour la même contrainte.
      const CHUNK_SIZE = 35
      const allGroups: DuplicateGroup[] = []
      let failedChunks = 0
      for (let i = 0; i < list.length; i += CHUNK_SIZE) {
        const chunk = list.slice(i, i + CHUNK_SIZE)
        try {
          const res = await fetch('/api/ai-price-compare?action=duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              produits: chunk.map((p) => ({ id: p.id, nom: p.nom, categorie: p.categorie, unite: p.unite })),
            }),
          })
          const data = await res.json()
          if (!res.ok) {
            failedChunks++
          } else {
            allGroups.push(...(data.groupes ?? []))
          }
        } catch {
          failedChunks++
        }
        setDuplicateGroups([...allGroups])
      }
      if (failedChunks > 0) {
        setDuplicateError(`${failedChunks} lot(s) sur ${Math.ceil(list.length / CHUNK_SIZE)} ont échoué (réponse IA vide) — relancez le scan pour réessayer sur l'ensemble du catalogue.`)
      }
    } finally {
      setScanningDuplicates(false)
    }
  }

  function handleDismissDuplicateGroup(idx: number) {
    setDuplicateGroups((prev) => (prev ? prev.filter((_, i) => i !== idx) : prev))
  }

  async function handleWebSearch() {
    const produits = webSearchInput
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, MAX_WEB_SEARCH_PRODUCTS)

    if (produits.length === 0) {
      setWebSearchError('Indiquez au moins un nom de produit.')
      return
    }

    setWebSearching(true)
    setWebSearchError(null)
    setWebSearchResults(null)
    try {
      const res = await fetch('/api/market-prices?action=compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produits }),
      })
      const data = await res.json()
      if (!res.ok) {
        setWebSearchError(data.error || 'Erreur lors de la recherche.')
        return
      }
      setWebSearchResults(data.results ?? [])
    } catch (e: any) {
      setWebSearchError(e?.message || 'Impossible de contacter le serveur.')
    } finally {
      setWebSearching(false)
    }
  }

  function handleAddFromWebResult(produit: string, l: WebSearchLine) {
    if (l.prix === null) return
    const nom = l.libelle.trim() || produit
    addProduct({
      nom,
      categorie: '',
      prixUnitaire: l.prix,
      unite: l.unite || 'unité',
      description: '',
      fournisseur: l.source,
    })
    alert(`« ${nom} » ajouté au catalogue (${l.prix.toLocaleString('fr-FR')} FCFA / ${l.unite || 'unité'}, source : ${l.source}). Complétez la catégorie si besoin.`)
  }

  // Reload forcé de la page pour purger le cache PWA si l'utilisateur ne voyait pas les changements
  function handleForceReload() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister()
        }
        window.location.reload()
      })
    } else {
      window.location.reload()
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catalogue produits</h1>
          <p className="page-subtitle">
            {filtered.length} / {list.length} produits — Fiches détaillées, upload & téléchargement d'images et vidéos
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn secondary" onClick={handleForceReload} title="Purger le cache et forcer la mise à jour">
            🔄 Rafraîchir l'application
          </button>
          <button className="btn secondary" onClick={handleScanDuplicates} disabled={scanningDuplicates} title="Analyse le catalogue par IA pour repérer les doublons probables">
            {scanningDuplicates ? '🤖 Scan en cours…' : '🤖 Scanner les doublons (IA)'}
          </button>
          <button className="btn secondary" onClick={() => setShowWebSearch((v) => !v)} title="Rechercher un produit et son prix sur internet via Perplexity">
            🌐 Rechercher sur internet (veille IA)
          </button>
          <button className="btn" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? 'Fermer' : '+ Nouveau produit'}
          </button>
        </div>
      </div>

      {showWebSearch && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 4px' }}>🌐 Rechercher un produit et son prix sur internet</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 12px' }}>
            Tapez un ou plusieurs produits (séparés par une virgule ou une nouvelle ligne, {MAX_WEB_SEARCH_PRODUCTS} max) —
            Perplexity cherche le prix et la disponibilité sur le web (Auchan.sn, autres sites, marchés de Dakar).
            Chaque résultat trouvé peut être ajouté directement au catalogue.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <textarea
              value={webSearchInput}
              onChange={(e) => setWebSearchInput(e.target.value)}
              placeholder={'Ex : Lait concentré sucré\nou un produit par ligne'}
              rows={2}
              style={{ flex: '1 1 320px', minWidth: 240, resize: 'vertical' }}
            />
            <button className="btn primary" onClick={handleWebSearch} disabled={webSearching}>
              {webSearching ? 'Recherche en cours…' : '🌐 Rechercher'}
            </button>
          </div>

          {webSearchError && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--danger, #c0392b)' }}>{webSearchError}</div>
          )}

          {webSearchResults && webSearchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              {webSearchResults.map((r) => (
                <div key={r.produit} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <strong>{r.produit}</strong>
                  {r.error ? (
                    <p style={{ fontSize: 12.5, color: 'var(--danger, #c0392b)', margin: '8px 0 0' }}>{r.error}</p>
                  ) : r.lignes.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '8px 0 0' }}>
                      Aucune information fiable trouvée pour ce produit.
                    </p>
                  ) : (
                    <table className="data-table" style={{ marginTop: 8 }}>
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Libellé produit</th>
                          <th>Prix</th>
                          <th>Disponibilité</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.lignes.map((l, i) => (
                          <tr key={i}>
                            <td>{l.source}</td>
                            <td style={{ fontSize: 12.5, color: l.libelle ? 'var(--text)' : 'var(--text-dim)' }}>
                              {l.libelle || '— Non précisé'}
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              {l.prix !== null ? `${l.prix.toLocaleString('fr-FR')} FCFA${l.unite ? ` / ${l.unite}` : ''}` : '—'}
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {l.disponibilite === 'disponible' ? '✅ Disponible' : l.disponibilite === 'rupture' ? '❌ Rupture' : '— Non précisé'}
                            </td>
                            <td>
                              {l.prix !== null && (
                                <button className="btn secondary small" onClick={() => handleAddFromWebResult(r.produit, l)}>
                                  + Ajouter au catalogue
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {duplicateError && (
        <div className="panel" style={{ borderLeft: '4px solid var(--danger, #c0392b)', marginBottom: 16 }}>
          {duplicateError}
        </div>
      )}

      {duplicateGroups && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 4px' }}>🤖 Doublons probables détectés</h3>
          {duplicateGroups.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Aucun doublon probable détecté sur les {list.length} produits.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {duplicateGroups.map((g, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 8px' }}>{g.raison}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {g.ids.map((id) => {
                      const p = products[id]
                      if (!p) return null
                      return (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}>
                          <span>{p.nom} <span style={{ color: 'var(--text-dim)' }}>({p.prixUnitaire.toLocaleString('fr-FR')} FCFA / {p.unite})</span></span>
                          <button className="btn secondary small" onClick={() => handleRemove(p)} style={{ padding: '2px 6px', fontSize: 11 }}>
                            🗑️
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <button className="btn secondary small" style={{ marginTop: 8 }} onClick={() => handleDismissDuplicateGroup(i)}>
                    Ignorer ce groupe
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Barre de filtres et bascule de vue Grille / Tableau */}
      <div className="filters-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Rechercher un produit (nom, catégorie, fournisseur)…"
            style={{ minWidth: 260 }}
          />
          {categories.length > 0 && (
            <select value={categorieFilter} onChange={(e) => setCategorieFilter(e.target.value)}>
              <option value="">Toutes catégories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={viewMode === 'grid' ? 'btn small' : 'btn secondary small'}
            onClick={() => setViewMode('grid')}
          >
            🔲 Vue Grille Cartes
          </button>
          <button
            className={viewMode === 'table' ? 'btn small' : 'btn secondary small'}
            onClick={() => setViewMode('table')}
          >
            📋 Vue Tableau
          </button>
        </div>
      </div>

      {/* ── MODE 1 : VUE GRILLE DE CARTES VISUELLES ── */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map((p) => {
            const mediaCount = p.medias?.length || 0
            const mainMedia = p.medias?.[0]

            return (
              <div
                key={p.id}
                className="panel"
                style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden' }}
              >
                {/* Zone visuelle principale */}
                <div
                  style={{
                    height: 160,
                    borderRadius: 6,
                    background: '#111827',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onClick={() => setSelectedProductId(p.id)}
                >
                  {mainMedia ? (
                    mainMedia.type === 'video' ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 32 }}>
                        🎬
                      </div>
                    ) : (
                      <img src={mainMedia.url} alt={p.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )
                  ) : (
                    <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                      <div style={{ fontSize: 32 }}>📷</div>
                      <div style={{ fontSize: 11, marginTop: 4 }}>Cliquez pour ajouter des images/vidéos</div>
                    </div>
                  )}

                  {mediaCount > 0 && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
                      🖼️ {mediaCount} média(s)
                    </div>
                  )}
                  {isRupture(p) && (
                    <div style={{ position: 'absolute', top: 8, left: 8, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
                      ⚠️ Rupture signalée
                    </div>
                  )}
                </div>

                {/* Infos produit */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: 15, color: 'var(--primary, #7a1f1f)', cursor: 'pointer' }} onClick={() => setSelectedProductId(p.id)}>
                      {p.nom}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                      <span className="zone-tag">{p.categorie}</span>
                      {isRupture(p) && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#dc2626' }}>⚠️ Rupture récente</span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                    {p.prixUnitaire.toLocaleString('fr-FR')} FCFA <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-dim)' }}>/ {p.unite}</span>
                  </div>

                  {p.origine && (
                    <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
                      📍 Provenance : <strong>{p.origine}</strong>
                    </div>
                  )}
                </div>

                {/* Boutons d'action sur la carte */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <button
                    className="btn primary small"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onClick={() => setSelectedProductId(p.id)}
                  >
                    👁️ Ouvrir la Fiche & Médias {mediaCount > 0 && `(${mediaCount})`}
                  </button>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn secondary small"
                      style={{ flex: 1, padding: '4px 8px', fontSize: 11 }}
                      onClick={() => startEdit(p)}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      className="btn secondary small"
                      style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2', padding: '4px 8px', fontSize: 11 }}
                      onClick={() => handleRemove(p)}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="panel empty-state" style={{ gridColumn: '1 / -1' }}>
              Aucun produit dans le catalogue.
            </div>
          )}
        </div>
      )}

      {/* ── MODE 2 : VUE TABLEAU DÉTAILLÉ ── */}
      {viewMode === 'table' && (
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
                          {isRupture(p) && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#dc2626', marginLeft: 6 }}>⚠️ Rupture</span>
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
      )}

      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </div>
  )
}
