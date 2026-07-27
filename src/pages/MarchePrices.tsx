import { useEffect, useMemo, useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { waLinkWithText } from '../utils/phone'
import { extractTextFromImage } from '../utils/ocr'

function normalizeSourceName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

// Les citations renvoyées par Perplexity sont au niveau du produit (pas une par ligne) — on
// retrouve la plus probable pour une source donnée en comparant son nom de domaine au libellé
// de la source. Si aucune ne correspond, on retombe sur une recherche Google (toujours cliquable,
// "au cas où" la citation directe manque). Même logique que Catalogue.tsx.
function findSourceLink(source: string, citations: string[], fallbackQuery: string): string {
  const normalizedSource = normalizeSourceName(source)
  for (const url of citations) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '')
      const domainWord = host.split('.')[0]
      if (domainWord.length >= 3 && normalizedSource.includes(normalizeSourceName(domainWord))) {
        return url
      }
    } catch {
      // URL invalide, ignorée
    }
  }
  return `https://www.google.com/search?q=${encodeURIComponent(fallbackQuery)}`
}

const CATEGORIES = [
  'Céréales',
  'Huiles',
  'Légumes',
  'Fruits',
  'Viandes',
  'Poissons',
  'Fruits de mer',
  'Fromagerie',
  'Épicerie',
  'Boissons',
  'Combustible',
  'Produits locaux',
  'Autre',
]

const SOURCES_COURANTES = ['Marché Tilène', 'Marché Castors', 'Marché Sandaga', 'Marché Thiaroye', 'Auchan.sn', 'Autre']

interface MarketPriceEntry {
  id: string
  produit: string
  categorie: string | null
  prix: number
  unite: string
  source: string
  methode: 'manuel' | 'photo_ocr' | 'web'
  releve_par: string | null
  created_at: string
}

interface ProductAnalysis {
  produit: string
  tendance: 'hausse' | 'baisse' | 'stable'
  variationApprox: string
  recoupement: string
  conseil: string
}

interface CompareLine {
  source: string
  libelle: string
  prix: number | null
  unite: string
  disponibilite: 'disponible' | 'rupture' | 'non précisé'
}

interface CompareResult {
  produit: string
  lignes: CompareLine[]
  citations: string[]
  error: string | null
}

const METHODE_LABELS: Record<string, string> = {
  manuel: '✍️ Saisie manuelle',
  photo_ocr: '📷 Photo/OCR',
  web: '🌐 Veille web',
}

export default function MarchePrices() {
  const products = useCrmStore((s) => s.products)
  const currentAgent = useCrmStore((s) => s.currentAgent)

  const [entries, setEntries] = useState<MarketPriceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categorieFilter, setCategorieFilter] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [draftProduit, setDraftProduit] = useState('')
  const [draftCategorie, setDraftCategorie] = useState('')
  const [draftPrix, setDraftPrix] = useState('')
  const [draftUnite, setDraftUnite] = useState('')
  const [draftSource, setDraftSource] = useState('')
  const [saving, setSaving] = useState(false)

  const [isScanning, setIsScanning] = useState(false)
  const [webWatching, setWebWatching] = useState(false)
  const [webWatchMessage, setWebWatchMessage] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanLines, setScanLines] = useState<{ produit: string; prix: string; unite: string; categorie: string }[] | null>(null)
  const [scanSource, setScanSource] = useState('')

  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<ProductAnalysis[] | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const [compareInput, setCompareInput] = useState('')
  const [comparing, setComparing] = useState(false)
  const [compareResults, setCompareResults] = useState<CompareResult[] | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)

  async function loadEntries() {
    try {
      const res = await fetch('/api/market-prices')
      const data = await res.json()
      setEntries(data.entries ?? [])
    } catch (e) {
      console.error('Erreur chargement relevés de prix', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  const ndugumiProductNames = useMemo(() => Object.values(products).map((p) => p.nom), [products])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (search && !e.produit.toLowerCase().includes(search.toLowerCase())) return false
      if (categorieFilter && e.categorie !== categorieFilter) return false
      return true
    })
  }, [entries, search, categorieFilter])

  async function handleAddEntry() {
    const prix = Number(draftPrix)
    if (!draftProduit.trim() || !draftUnite.trim() || !draftSource.trim() || !Number.isFinite(prix) || prix <= 0) {
      alert('Produit, prix (> 0), unité et source sont obligatoires.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/market-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produit: draftProduit.trim(),
          categorie: draftCategorie || null,
          prix,
          unite: draftUnite.trim(),
          source: draftSource.trim(),
          methode: 'manuel',
          relevePar: currentAgent || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Erreur lors de l'enregistrement.")
        return
      }
      setDraftProduit('')
      setDraftCategorie('')
      setDraftPrix('')
      setDraftUnite('')
      setDraftSource('')
      setShowForm(false)
      await loadEntries()
    } finally {
      setSaving(false)
    }
  }

  async function handleScanFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsScanning(true)
    setScanError(null)
    setScanLines(null)
    try {
      const ocrText = await extractTextFromImage(file)
      const res = await fetch('/api/market-prices?action=ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrText }),
      })
      const data = await res.json()
      if (!res.ok) {
        setScanError(data.error || "Erreur lors de l'analyse de la photo.")
        return
      }
      if (!data.lignes || data.lignes.length === 0) {
        setScanError("Aucun prix n'a pu être identifié sur cette photo. Essayez une photo plus nette.")
        return
      }
      setScanLines(
        data.lignes.map((l: any) => ({
          produit: l.produit,
          prix: String(l.prix),
          unite: l.unite,
          categorie: CATEGORIES.includes(l.categorie) ? l.categorie : '',
        }))
      )
      setScanSource(data.sourceProbable || '')
    } catch (err: any) {
      setScanError(err?.message || 'Impossible de lire cette photo.')
    } finally {
      setIsScanning(false)
    }
  }

  async function handleSaveScanLines() {
    if (!scanLines || !scanSource.trim()) {
      alert('Indiquez la source (marché/enseigne) avant d\'enregistrer.')
      return
    }
    setSaving(true)
    try {
      let count = 0
      for (const line of scanLines) {
        const prix = Number(line.prix)
        if (!line.produit.trim() || !Number.isFinite(prix) || prix <= 0) continue
        const res = await fetch('/api/market-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            produit: line.produit.trim(),
            categorie: line.categorie || null,
            prix,
            unite: line.unite || 'unité',
            source: scanSource.trim(),
            methode: 'photo_ocr',
            relevePar: currentAgent || '',
          }),
        })
        if (res.ok) count++
      }
      setScanLines(null)
      setScanSource('')
      await loadEntries()
      alert(`${count} relevé(s) enregistré(s).`)
    } finally {
      setSaving(false)
    }
  }

  async function handleWebWatch() {
    setWebWatching(true)
    setWebWatchMessage(null)
    const BATCH_SIZE = 16
    let offset = 0
    let total = 0
    let found = 0
    let processed = 0
    try {
      do {
        setWebWatchMessage(`Recherche en cours… (${processed}${total ? `/${total}` : ''} produits traités)`)
        const res = await fetch(`/api/market-prices?action=webwatch&offset=${offset}&limit=${BATCH_SIZE}`)
        const data = await res.json()
        if (!res.ok) {
          setWebWatchMessage(data.error || 'Erreur lors de la veille web.')
          return
        }
        total = data.total ?? 0
        found += (data.results || []).filter((r: any) => r.ok).length
        processed += data.processed ?? 0
        offset += BATCH_SIZE
      } while (offset < total)

      setWebWatchMessage(`${found}/${total} prix trouvés et enregistrés via la veille web (Auchan.sn + sources fiables).`)
      await loadEntries()
    } catch (e: any) {
      setWebWatchMessage(e?.message || 'Impossible de contacter le serveur.')
    } finally {
      setWebWatching(false)
    }
  }

  async function handleCompare() {
    const produits = compareInput
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 5)

    if (produits.length === 0) {
      setCompareError('Indiquez au moins un nom de produit (séparés par une virgule ou une nouvelle ligne).')
      return
    }

    setComparing(true)
    setCompareError(null)
    setCompareResults(null)
    try {
      const res = await fetch('/api/market-prices?action=compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produits }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCompareError(data.error || 'Erreur lors de la comparaison.')
        return
      }
      setCompareResults(data.results ?? [])
      await loadEntries()
    } catch (e: any) {
      setCompareError(e?.message || 'Impossible de contacter le serveur.')
    } finally {
      setComparing(false)
    }
  }

  async function handleDeleteEntry(id: string) {
    if (!confirm('Supprimer ce relevé ?')) return
    try {
      const res = await fetch(`/api/market-prices?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) {
        alert('Erreur lors de la suppression.')
        return
      }
      await loadEntries()
    } catch {
      alert('Impossible de contacter le serveur.')
    }
  }

  async function handleAnalyze() {
    if (filtered.length === 0) {
      alert('Aucun relevé à analyser pour ces filtres.')
      return
    }
    setAnalyzing(true)
    setAnalysisError(null)
    setAnalysis(null)
    try {
      // Regroupe par produit distinct puis découpe par lots : analyser des centaines de relevés
      // en un seul appel dépasse la durée que DeepSeek met à générer la réponse (constaté avec
      // seulement 36 relevés déjà). Chaque lot ne contient qu'un sous-ensemble de produits
      // distincts (toutes leurs entrées historiques), pour rester rapide et fiable.
      const distinctProducts = Array.from(new Set(filtered.map((e) => e.produit)))
      const CHUNK_SIZE = 8
      const allResults: ProductAnalysis[] = []
      let failedChunks = 0
      for (let i = 0; i < distinctProducts.length; i += CHUNK_SIZE) {
        const productsChunk = new Set(distinctProducts.slice(i, i + CHUNK_SIZE))
        const entriesChunk = filtered.filter((e) => productsChunk.has(e.produit))
        try {
          const res = await fetch('/api/market-prices?action=analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entries: entriesChunk }),
          })
          const data = await res.json()
          if (!res.ok) {
            failedChunks++
          } else {
            allResults.push(...(data.produits || []))
          }
        } catch {
          failedChunks++
        }
        setAnalysis([...allResults])
        setAnalysisError(
          `Analyse en cours… ${allResults.length}/${distinctProducts.length} produits traités${failedChunks > 0 ? ` (${failedChunks} lot(s) échoué(s), ignorés)` : ''}`
        )
      }
      setAnalysisError(
        failedChunks > 0
          ? `Terminé : ${allResults.length}/${distinctProducts.length} produits analysés (${failedChunks} lot(s) ont échoué et ont été ignorés — relancez l'analyse pour réessayer).`
          : null
      )
    } catch (e: any) {
      setAnalysisError(e?.message || 'Impossible de contacter le serveur.')
    } finally {
      setAnalyzing(false)
    }
  }

  function handleShareAnalysis(a: ProductAnalysis) {
    const text = `📊 *BAROMÈTRE PRIX MARCHÉ DAKAR — ${a.produit.toUpperCase()}*

📈 Tendance : ${a.tendance} ${a.variationApprox ? `(${a.variationApprox})` : ''}
🔍 ${a.recoupement}
💡 ${a.conseil}

Données basées sur les relevés terrain réels de l'équipe NDUGUMi.`
    const link = waLinkWithText('', text)
    if (link) window.open(link, '_blank')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Baromètre des Prix — Marchés & Supermarchés Dakar</h1>
          <p className="page-subtitle">
            Relevés réels du terrain (saisie manuelle + photo/OCR) et analyse de tendances par IA
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={handleWebWatch} disabled={webWatching} title="Recherche les prix actuels sur Auchan.sn et le web via IA (Perplexity)">
            {webWatching ? '🌐 Recherche en cours...' : '🌐 Lancer la veille web IA'}
          </button>
          <label className="btn secondary" style={{ cursor: 'pointer', margin: 0 }}>
            {isScanning ? '🔍 Lecture en cours...' : '📷 Scanner une étiquette/ticket'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScanFile} disabled={isScanning} />
          </label>
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Fermer' : '+ Ajouter un relevé'}
          </button>
        </div>
      </div>

      {webWatchMessage && (
        <div className="panel" style={{ marginBottom: 16, fontSize: 13 }}>
          {webWatchMessage}
        </div>
      )}

      {scanError && (
        <div className="panel" style={{ borderLeft: '4px solid var(--danger, #c0392b)', marginBottom: 16 }}>
          {scanError}
        </div>
      )}

      {scanLines && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Relevés détectés sur la photo — vérifiez avant d'enregistrer</h3>
          <p style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
            Suggestions générées par IA (OCR + DeepSeek) à partir de la photo — corrigez si besoin.
          </p>
          <div className="field-row">
            <label>Source (marché / enseigne)</label>
            <select value={SOURCES_COURANTES.includes(scanSource) ? scanSource : 'Autre'} onChange={(e) => setScanSource(e.target.value === 'Autre' ? '' : e.target.value)}>
              {SOURCES_COURANTES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {!SOURCES_COURANTES.includes(scanSource) && (
              <input type="text" placeholder="Préciser la source" value={scanSource} onChange={(e) => setScanSource(e.target.value)} style={{ marginTop: 6 }} />
            )}
          </div>
          {scanLines.map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={line.produit}
                onChange={(e) => setScanLines((prev) => prev!.map((l, j) => (j === i ? { ...l, produit: e.target.value } : l)))}
                style={{ flex: '1 1 180px' }}
                placeholder="Produit"
              />
              <input
                type="number"
                value={line.prix}
                onChange={(e) => setScanLines((prev) => prev!.map((l, j) => (j === i ? { ...l, prix: e.target.value } : l)))}
                style={{ width: 110 }}
                placeholder="Prix"
              />
              <input
                type="text"
                value={line.unite}
                onChange={(e) => setScanLines((prev) => prev!.map((l, j) => (j === i ? { ...l, unite: e.target.value } : l)))}
                style={{ width: 110 }}
                placeholder="Unité"
              />
              <select
                value={line.categorie}
                onChange={(e) => setScanLines((prev) => prev!.map((l, j) => (j === i ? { ...l, categorie: e.target.value } : l)))}
                style={{ width: 140 }}
              >
                <option value="">Catégorie…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                className="btn secondary small"
                onClick={() => setScanLines((prev) => prev!.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn" onClick={handleSaveScanLines} disabled={saving}>
              {saving ? 'Enregistrement…' : `Enregistrer ces ${scanLines.length} relevé(s)`}
            </button>
            <button className="btn secondary" onClick={() => setScanLines(null)}>Annuler</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Nouveau relevé de prix</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div className="field-row" style={{ flex: '1 1 200px' }}>
              <label>Produit</label>
              <input type="text" list="ndugumi-products" value={draftProduit} onChange={(e) => setDraftProduit(e.target.value)} placeholder="Ex : Riz brisé parfumé" />
              <datalist id="ndugumi-products">
                {ndugumiProductNames.map((n) => <option key={n} value={n} />)}
              </datalist>
            </div>
            <div className="field-row" style={{ flex: '1 1 140px' }}>
              <label>Catégorie</label>
              <select value={draftCategorie} onChange={(e) => setDraftCategorie(e.target.value)}>
                <option value="">Choisir…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field-row" style={{ flex: '1 1 100px' }}>
              <label>Prix (FCFA)</label>
              <input type="number" value={draftPrix} onChange={(e) => setDraftPrix(e.target.value)} placeholder="Ex : 15000" />
            </div>
            <div className="field-row" style={{ flex: '1 1 120px' }}>
              <label>Unité</label>
              <input type="text" value={draftUnite} onChange={(e) => setDraftUnite(e.target.value)} placeholder="Ex : sac 25kg" />
            </div>
            <div className="field-row" style={{ flex: '1 1 160px' }}>
              <label>Source</label>
              <input type="text" list="sources-courantes" value={draftSource} onChange={(e) => setDraftSource(e.target.value)} placeholder="Ex : Marché Tilène" />
              <datalist id="sources-courantes">
                {SOURCES_COURANTES.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
          <button className="btn" style={{ marginTop: 10 }} onClick={handleAddEntry} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer le relevé'}
          </button>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 4px' }}>🔍 Comparer un ou plusieurs produits (IA)</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 12px' }}>
          Tapez un ou plusieurs produits (séparés par une virgule ou une nouvelle ligne, 5 max) — Perplexity
          cherche le prix et la disponibilité sur plusieurs sources (Auchan.sn, autres sites, marchés de Dakar)
          et affiche un comparatif. Chaque prix trouvé est aussi enregistré dans l'historique ci-dessous.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <textarea
            value={compareInput}
            onChange={(e) => setCompareInput(e.target.value)}
            placeholder={'Ex : Riz brisé parfumé, Huile végétale\nou un produit par ligne'}
            rows={2}
            style={{ flex: '1 1 320px', minWidth: 240, resize: 'vertical' }}
          />
          <button className="btn primary" onClick={handleCompare} disabled={comparing}>
            {comparing ? 'Recherche en cours…' : '🌐 Comparer les prix'}
          </button>
        </div>

        {compareError && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--danger, #c0392b)' }}>{compareError}</div>
        )}

        {compareResults && compareResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            {compareResults.map((r) => {
              const prixValides = r.lignes.filter((l) => l.prix !== null)
              const minPrix = prixValides.length > 0 ? Math.min(...prixValides.map((l) => l.prix!)) : null
              return (
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
                        </tr>
                      </thead>
                      <tbody>
                        {r.lignes.map((l, i) => {
                          const sourceUrl = findSourceLink(l.source, r.citations, `${l.source} ${l.libelle || r.produit}`)
                          return (
                          <tr key={i}>
                            <td>
                              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent, #c0793a)', textDecoration: 'underline' }} title="Ouvrir le site de l'entreprise (ou une recherche Google si le lien direct est incertain)">
                                {l.source} 🔗
                              </a>
                            </td>
                            <td style={{ fontSize: 12.5, fontWeight: l.libelle ? 700 : 400, color: l.libelle ? 'var(--primary, #7a1f1f)' : 'var(--text-dim)' }}>
                              {l.libelle || '— Non précisé'}
                            </td>
                            <td style={{ fontWeight: 700, color: l.prix === minPrix ? 'var(--success, #1e8e3e)' : undefined }}>
                              {l.prix !== null ? `${l.prix.toLocaleString('fr-FR')} FCFA${l.unite ? ` / ${l.unite}` : ''}` : '—'}
                              {l.prix === minPrix && prixValides.length > 1 ? ' 🏆' : ''}
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {l.disponibilite === 'disponible' ? '✅ Disponible' : l.disponibilite === 'rupture' ? '❌ Rupture' : '— Non précisé'}
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="panel" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ fontSize: 32 }}>🤖</span>
            <div>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 15 }}>Analyse & tendances IA</h3>
              <p style={{ fontSize: 12.5, color: '#94a3b8', margin: '4px 0 0 0' }}>
                Basée uniquement sur les {filtered.length} relevé(s) réel(s) ci-dessous (jamais de données inventées).
              </p>
            </div>
          </div>
          <button className="btn primary" onClick={handleAnalyze} disabled={analyzing || filtered.length === 0}>
            {analyzing ? 'Analyse en cours…' : '✨ Analyser les tendances'}
          </button>
        </div>
      </div>

      {analysisError && (
        <div className="panel" style={{ borderLeft: '4px solid var(--danger, #c0392b)', marginBottom: 16 }}>
          {analysisError}
        </div>
      )}

      {analysis && analysis.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
          {analysis.map((a) => (
            <div key={a.produit} className="panel" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{a.produit}</strong>
                <span>{a.tendance === 'hausse' ? '📈' : a.tendance === 'baisse' ? '📉' : '➡️'} {a.variationApprox}</span>
              </div>
              <p style={{ fontSize: 12.5, marginTop: 8 }}>{a.recoupement}</p>
              <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>💡 {a.conseil}</p>
              <button
                className="btn secondary small"
                style={{ color: '#25d366', borderColor: '#25d366', fontWeight: 700 }}
                onClick={() => handleShareAnalysis(a)}
              >
                📲 Partager WhatsApp
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Rechercher un produit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={categorieFilter} onChange={(e) => setCategorieFilter(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Prix</th>
              <th>Source</th>
              <th>Méthode</th>
              <th>Relevé par</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="empty-state">Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="empty-state">Aucun relevé pour l'instant. Ajoutez-en un ci-dessus ou scannez une photo.</td></tr>
            ) : (
              filtered.slice(0, 200).map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.produit}</strong></td>
                  <td>{e.categorie || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{e.prix.toLocaleString('fr-FR')} FCFA <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-dim)' }}>/ {e.unite}</span></td>
                  <td>{e.source}</td>
                  <td style={{ fontSize: 11.5 }}>{METHODE_LABELS[e.methode] || e.methode}</td>
                  <td>{e.releve_par || '—'}</td>
                  <td style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{new Date(e.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <button className="btn secondary small" onClick={() => handleDeleteEntry(e.id)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
