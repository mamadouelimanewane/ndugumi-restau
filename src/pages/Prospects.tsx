import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects, isLate } from '../utils/joined'
import { exportProspectsCsv } from '../utils/csv'
import { exportProspectsPdf } from '../utils/pdf'
import { exportProspectsXlsx } from '../utils/excel'
import { computeQuartierDensity, priorityScore } from '../utils/priority'
import { parseRestaurantsFile } from '../utils/importRestaurants'
import { fetchAiMessage } from '../utils/ai'
import { STATUTS, STATUT_LABELS, type Statut, type Zone } from '../types'

type SortKey = '' | 'score' | 'statut' | 'quartier' | 'relance'

export default function Prospects() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const tasks = useCrmStore((s) => s.tasks)
  const agents = useCrmStore((s) => s.agents)
  const setStatut = useCrmStore((s) => s.setStatut)
  const setAgent = useCrmStore((s) => s.setAgent)
  const addRestaurant = useCrmStore((s) => s.addRestaurant)
  const segments = useCrmStore((s) => s.segments)
  const addSegment = useCrmStore((s) => s.addSegment)
  const removeSegment = useCrmStore((s) => s.removeSegment)
  const addNote = useCrmStore((s) => s.addNote)
  const currentAgent = useCrmStore((s) => s.currentAgent)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState('')
  const [quartierFilter, setQuartierFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState<Statut | ''>('')
  const [tagFilter, setTagFilter] = useState('')
  const [ndugumiFilter, setNdugumiFilter] = useState<'' | 'oui' | 'non'>('')
  const [agentFilter, setAgentFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('')
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    const q = searchParams.get('quartier')
    if (q) setQuartierFilter(q)
    const s = searchParams.get('statut')
    if (s) setStatutFilter(s as Statut)
  }, [searchParams])

  const [newNom, setNewNom] = useState('')
  const [newTelephone, setNewTelephone] = useState('')
  const [newQuartier, setNewQuartier] = useState('')
  const [newZone, setNewZone] = useState<Zone>('Dakar intra-muros')

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkAgent, setBulkAgent] = useState(agents[0])
  const importInputRef = useRef<HTMLInputElement>(null)

  const [showBulkAiModal, setShowBulkAiModal] = useState(false)
  const [aiObjectif, setAiObjectif] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMessages, setGeneratedMessages] = useState<Record<number, string>>({})

  const segmentList = useMemo(() => Object.values(segments).sort((a, b) => a.nom.localeCompare(b.nom)), [segments])
  const [selectedSegmentId, setSelectedSegmentId] = useState('')
  const [newSegmentName, setNewSegmentName] = useState('')

  function handleLoadSegment(id: string) {
    setSelectedSegmentId(id)
    const seg = segments[id]
    if (!seg) return
    setZoneFilter(seg.filtre.zone)
    setQuartierFilter(seg.filtre.quartier)
    setStatutFilter(seg.filtre.statut)
    setNdugumiFilter(seg.filtre.ndugumi)
    setTagFilter(seg.filtre.tag)
  }

  function handleSaveSegment() {
    const nom = newSegmentName.trim()
    if (!nom) return
    addSegment(nom, {
      zone: zoneFilter as Zone | '',
      quartier: quartierFilter,
      statut: statutFilter,
      ndugumi: ndugumiFilter,
      tag: tagFilter,
    })
    setNewSegmentName('')
  }

  function handleDeleteSegment() {
    if (!selectedSegmentId) return
    removeSegment(selectedSegmentId)
    setSelectedSegmentId('')
  }

  const quartiers = useMemo(() => {
    const set = new Set(joined.map((j) => j.quartier))
    return Array.from(set).sort()
  }, [joined])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const j of joined) for (const t of j.crm.tags) set.add(t)
    return Array.from(set).sort()
  }, [joined])

  const quartierDensity = useMemo(() => computeQuartierDensity(joined), [joined])
  const overdueTaskRestaurantIds = useMemo(() => {
    const set = new Set<number>()
    for (const t of Object.values(tasks)) {
      if (t.statut === 'a_faire' && isLate(t.dateEcheance)) set.add(t.restaurantId)
    }
    return set
  }, [tasks])

  const scores = useMemo(() => {
    const m = new Map<number, number>()
    for (const j of joined) {
      m.set(j.id, priorityScore(j, quartierDensity, overdueTaskRestaurantIds.has(j.id)))
    }
    return m
  }, [joined, quartierDensity, overdueTaskRestaurantIds])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = joined.filter((j) => {
      if (q && !j.etablissement.toLowerCase().includes(q) && !j.telephone.toLowerCase().includes(q)) {
        return false
      }
      if (zoneFilter && j.zone !== zoneFilter) return false
      if (quartierFilter && j.quartier !== quartierFilter) return false
      if (statutFilter && j.crm.statut !== statutFilter) return false
      if (tagFilter && !j.crm.tags.includes(tagFilter)) return false
      if (ndugumiFilter === 'oui' && !j.crm.ndugumi.inscrit) return false
      if (ndugumiFilter === 'non' && j.crm.ndugumi.inscrit) return false
      if (agentFilter && (j.crm.agent || 'Non assigné') !== agentFilter) return false
      return true
    })
    if (sortBy === 'score') list.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    else if (sortBy === 'statut') list.sort((a, b) => a.crm.statut.localeCompare(b.crm.statut))
    else if (sortBy === 'quartier') list.sort((a, b) => a.quartier.localeCompare(b.quartier))
    else if (sortBy === 'relance')
      list.sort((a, b) => (a.crm.prochaineRelance ?? '9999').localeCompare(b.crm.prochaineRelance ?? '9999'))
    return list
  }, [joined, search, zoneFilter, quartierFilter, statutFilter, tagFilter, ndugumiFilter, agentFilter, sortBy, scores])

  const allFilteredSelected = filtered.length > 0 && filtered.every((j) => selected.has(j.id))

  function toggleSelectAll() {
    setSelected((prev) => {
      if (allFilteredSelected) return new Set()
      return new Set(filtered.map((j) => j.id))
    })
  }

  function toggleSelectOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkAssign() {
    for (const id of selected) setAgent(id, bulkAgent)
    setSelected(new Set())
  }

  async function handleGenerateAi() {
    if (!aiObjectif.trim()) {
      alert("Veuillez définir un objectif (ex: 'Inviter à commander')")
      return
    }
    setIsGenerating(true)
    const newMessages = { ...generatedMessages }
    
    for (const id of selected) {
      const prospect = joined.find(j => j.id === id)
      if (!prospect) continue
      
      try {
        const recentNotes = prospect.crm.notes.slice(0, 3).map(n => ({ date: n.date, texte: n.texte }))
        const res = await fetchAiMessage({
          etablissement: prospect.etablissement,
          quartier: prospect.quartier,
          statut: prospect.crm.statut,
          tags: prospect.crm.tags,
          canal: 'whatsapp',
          objectif: aiObjectif,
          recentNotes
        })
        newMessages[id] = res.corps
        setGeneratedMessages({ ...newMessages })
      } catch (err) {
        newMessages[id] = "[Erreur de génération IA]"
        setGeneratedMessages({ ...newMessages })
      }
    }
    setIsGenerating(false)
  }

  function handleSaveDrafts() {
    for (const id of selected) {
      const msg = generatedMessages[id]
      if (msg && msg !== "[Erreur de génération IA]") {
        addNote(id, 'whatsapp', `[Brouillon IA] ${msg}`, currentAgent || 'Système')
      }
    }
    setShowBulkAiModal(false)
    setSelected(new Set())
    setGeneratedMessages({})
    alert("Brouillons enregistrés avec succès dans l'historique des prospects.")
  }

  function handleAddRestaurant() {
    if (!newNom.trim() || !newQuartier.trim()) return
    const id = addRestaurant({
      etablissement: newNom.trim(),
      telephone: newTelephone.trim() || 'Non communiqué',
      quartier: newQuartier.trim(),
      zone: newZone,
    })
    setNewNom('')
    setNewTelephone('')
    setNewQuartier('')
    setShowAdd(false)
    navigate(`/prospects/${id}`)
  }

  function handleImportClick() {
    importInputRef.current?.click()
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const isCsv = file.name.toLowerCase().endsWith('.csv')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = parseRestaurantsFile(reader.result as ArrayBuffer | string)
        if (result.rows.length === 0) {
          alert(
            "Aucune ligne exploitable trouvée. Le fichier doit avoir des colonnes 'Établissement' et 'Quartier' (Téléphone et Zone facultatifs)."
          )
          return
        }
        if (
          !confirm(
            `Importer ${result.rows.length} restaurant(s) ? ${result.skipped > 0 ? `(${result.skipped} ligne(s) ignorée(s) car incomplètes)` : ''}`
          )
        )
          return
        for (const row of result.rows) addRestaurant(row)
        alert(`${result.rows.length} restaurant(s) importé(s) avec succès.`)
      } catch (err) {
        alert("Impossible de lire ce fichier. Formats acceptés : .csv, .xlsx.")
      } finally {
        e.target.value = ''
      }
    }
    // Un CSV doit être lu comme texte UTF-8 (les accents se corrompent si on le lit en binaire brut).
    if (isCsv) reader.readAsText(file, 'utf-8')
    else reader.readAsArrayBuffer(file)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Prospects</h1>
          <p className="page-subtitle">
            {filtered.length} / {joined.length} restaurants affichés
            {selected.size > 0 ? ` · ${selected.size} sélectionné(s)` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn secondary" onClick={handleImportClick}>
            Importer
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <button className="btn secondary" onClick={() => exportProspectsCsv(filtered)}>
            Exporter CSV
          </button>
          <button className="btn secondary" onClick={() => exportProspectsXlsx(filtered)}>
            Exporter Excel
          </button>
          <button className="btn secondary" onClick={() => exportProspectsPdf(filtered)}>
            Exporter PDF
          </button>
          <button className="btn" onClick={() => setShowAdd((v) => !v)}>
            + Ajouter un restaurant
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong style={{ fontSize: 13 }}>{selected.size} restaurant(s) sélectionné(s)</strong>
          <span style={{ fontSize: 13 }}>Assigner à</span>
          <select value={bulkAgent} onChange={(e) => setBulkAgent(e.target.value)}>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button className="btn small" onClick={handleBulkAssign}>
            Assigner
          </button>
          <button className="btn secondary small" onClick={() => setShowBulkAiModal(true)}>
            🪄 Générer messages IA
          </button>
          <button className="btn secondary small" onClick={() => setSelected(new Set())}>
            Annuler la sélection
          </button>
        </div>
      )}

      {showAdd && (
        <div className="panel">
          <h3>Nouveau restaurant</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field-row" style={{ minWidth: 220 }}>
              <label>Nom / adresse</label>
              <input type="text" value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Ex : Chez Fatou, Rue 12 Médina" />
            </div>
            <div className="field-row" style={{ minWidth: 160 }}>
              <label>Téléphone</label>
              <input type="text" value={newTelephone} onChange={(e) => setNewTelephone(e.target.value)} placeholder="77 000 00 00" />
            </div>
            <div className="field-row" style={{ minWidth: 180 }}>
              <label>Quartier / commune</label>
              <input type="text" value={newQuartier} onChange={(e) => setNewQuartier(e.target.value)} placeholder="Ex : Médina" />
            </div>
            <div className="field-row" style={{ minWidth: 160 }}>
              <label>Zone</label>
              <select value={newZone} onChange={(e) => setNewZone(e.target.value as Zone)}>
                <option value="Dakar intra-muros">Dakar intra-muros</option>
                <option value="Banlieue">Banlieue</option>
              </select>
            </div>
            <div className="field-row">
              <button className="btn" onClick={handleAddRestaurant}>
                Créer la fiche
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="filters-bar">
        <select value={selectedSegmentId} onChange={(e) => handleLoadSegment(e.target.value)}>
          <option value="">Charger un segment…</option>
          {segmentList.map((seg) => (
            <option key={seg.id} value={seg.id}>
              {seg.nom}
            </option>
          ))}
        </select>
        {selectedSegmentId && (
          <button className="btn secondary small" onClick={handleDeleteSegment}>
            Supprimer ce segment
          </button>
        )}
        <input
          type="text"
          placeholder="Nom du segment à sauvegarder…"
          value={newSegmentName}
          onChange={(e) => setNewSegmentName(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <button className="btn secondary small" onClick={handleSaveSegment} disabled={!newSegmentName.trim()}>
          Sauvegarder les filtres actuels
        </button>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          placeholder="Rechercher un nom, une adresse, un téléphone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
          <option value="">Toutes zones</option>
          <option value="Dakar intra-muros">Dakar intra-muros</option>
          <option value="Banlieue">Banlieue</option>
        </select>
        <select value={quartierFilter} onChange={(e) => setQuartierFilter(e.target.value)}>
          <option value="">Tous quartiers</option>
          {quartiers.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
        <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value as Statut | '')}>
          <option value="">Tous statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {STATUT_LABELS[s]}
            </option>
          ))}
        </select>
        <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
          <option value="">Tous les agents</option>
          {agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        {allTags.length > 0 && (
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="">Tous tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <select value={ndugumiFilter} onChange={(e) => setNdugumiFilter(e.target.value as '' | 'oui' | 'non')}>
          <option value="">NDUGUMi (tous)</option>
          <option value="oui">Inscrits NDUGUMi</option>
          <option value="non">Non inscrits NDUGUMi</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
          <option value="">Trier par…</option>
          <option value="score">Score de priorité</option>
          <option value="statut">Statut</option>
          <option value="quartier">Quartier</option>
          <option value="relance">Relance (plus urgente)</option>
        </select>
        {(search || zoneFilter || quartierFilter || statutFilter || tagFilter || ndugumiFilter || agentFilter || sortBy) && (
          <button
            className="btn secondary small"
            onClick={() => {
              setSearch('')
              setZoneFilter('')
              setQuartierFilter('')
              setStatutFilter('')
              setTagFilter('')
              setNdugumiFilter('')
              setAgentFilter('')
              setSortBy('')
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}>
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} />
              </th>
              <th>Établissement</th>
              <th>Téléphone</th>
              <th>Quartier</th>
              <th>Zone</th>
              <th>Statut</th>
              <th>Agent</th>
              <th>Relance</th>
              <th>NDUGUMi</th>
              <th title="Score de priorité : plus c'est haut, plus il faut agir vite">Score</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((j) => (
              <tr key={j.id} onClick={() => navigate(`/prospects/${j.id}`)}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(j.id)} onChange={() => toggleSelectOne(j.id)} />
                </td>
                <td>
                  {j.etablissement}
                  {j.crm.tags.length > 0 && (
                    <div style={{ marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {j.crm.tags.map((t) => (
                        <span key={t} className="zone-tag" style={{ fontSize: 10 }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>{j.telephone}</td>
                <td>{j.quartier}</td>
                <td>
                  <span className="zone-tag">{j.zone === 'Dakar intra-muros' ? 'Dakar' : 'Banlieue'}</span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    value={j.crm.statut}
                    onChange={(e) => setStatut(j.id, e.target.value as Statut)}
                    style={{ fontSize: 12 }}
                  >
                    {STATUTS.map((s) => (
                      <option key={s} value={s}>
                        {STATUT_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    value={j.crm.agent || agents[0]}
                    onChange={(e) => setAgent(j.id, e.target.value)}
                    style={{ fontSize: 12 }}
                  >
                    {agents.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{j.crm.prochaineRelance || '—'}</td>
                <td>
                  {j.crm.ndugumi.inscrit ? (
                    <span className="badge" style={{ background: 'var(--ok)' }}>
                      Inscrit
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={{ fontWeight: 700, textAlign: 'center' }}>{scores.get(j.id) ?? 0}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="empty-state">
                  Aucun restaurant ne correspond à ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showBulkAiModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}>
          <div className="panel" style={{ width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2>🪄 Génération IA en masse</h2>
            <p>Générer un message personnalisé pour {selected.size} restaurant(s).</p>
            
            <div className="field-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <label>Objectif de la campagne</label>
              <input 
                type="text" 
                value={aiObjectif} 
                onChange={e => setAiObjectif(e.target.value)} 
                placeholder="Ex: Proposer 10% de réduction pour leur première commande de riz" 
              />
            </div>
            
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={handleGenerateAi} disabled={isGenerating || !aiObjectif.trim()}>
                {isGenerating ? 'Génération en cours...' : 'Lancer la génération'}
              </button>
              <button className="btn secondary" onClick={() => setShowBulkAiModal(false)}>Annuler</button>
            </div>

            {Object.keys(generatedMessages).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Établissement</th>
                      <th>Message généré</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(selected).map(id => {
                      const prospect = joined.find(j => j.id === id)
                      if (!prospect) return null
                      return (
                        <tr key={id}>
                          <td style={{ width: 150 }}>{prospect.etablissement}</td>
                          <td>
                            <textarea 
                              style={{ width: '100%', minHeight: 80, padding: 8, fontFamily: 'inherit', resize: 'vertical' }}
                              value={generatedMessages[id] || ''}
                              onChange={e => setGeneratedMessages(prev => ({ ...prev, [id]: e.target.value }))}
                              placeholder={isGenerating && !generatedMessages[id] ? 'Génération...' : ''}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn primary" onClick={handleSaveDrafts} disabled={isGenerating}>
                    Enregistrer comme brouillons
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
