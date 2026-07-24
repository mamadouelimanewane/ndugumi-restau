import { useMemo, useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { waLinkWithText } from '../utils/phone'
import type { Statut } from '../types'

export default function PocketCommercial() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const addRestaurant = useCrmStore((s) => s.addRestaurant)
  const setStatut = useCrmStore((s) => s.setStatut)
  const addNote = useCrmStore((s) => s.addNote)
  const currentAgent = useCrmStore((s) => s.currentAgent)

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const [search, setSearch] = useState('')
  const [selectedRestauId, setSelectedRestauId] = useState<number | null>(joined[0]?.id || null)
  const [quickNote, setQuickNote] = useState('')
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  // Quick Add State
  const [newNom, setNewNom] = useState('')
  const [newQuartier, setNewQuartier] = useState('Almadies')
  const [newTelephone, setNewTelephone] = useState('')

  const selectedProspect = useMemo(() => {
    return joined.find((j) => j.id === selectedRestauId)
  }, [joined, selectedRestauId])

  const filteredList = useMemo(() => {
    if (!search.trim()) return joined.slice(0, 15)
    return joined.filter((j) => j.etablissement.toLowerCase().includes(search.toLowerCase()) || j.quartier.toLowerCase().includes(search.toLowerCase()))
  }, [joined, search])

  function handleAddQuickVisitNote() {
    if (!selectedProspect || !quickNote.trim()) return
    addNote(selectedProspect.id, 'appel', quickNote.trim(), currentAgent || 'Agent Pocket')
    setQuickNote('')
    alert(`📝 Note enregistrée pour ${selectedProspect.etablissement} !`)
  }

  function handleQuickAddRestaurant() {
    if (!newNom.trim()) return
    addRestaurant({
      etablissement: newNom.trim(),
      quartier: newQuartier,
      zone: newQuartier === 'Pikine' || newQuartier === 'Guédiawaye' || newQuartier === 'Parcelles' ? 'Banlieue' : 'Dakar intra-muros',
      telephone: newTelephone || '+221 77 000 00 00',
    })

    setNewNom('')
    setNewTelephone('')
    setShowQuickAdd(false)
    alert('⚡ Nouveau restaurant créé en 5 secondes !')
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Top Header Compact Pocket Mode */}
      <div style={{ background: '#7a1f1f', color: '#fff', padding: '16px', borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>⚡ MODE TERRAIN EXPRESS</div>
            <h2 style={{ color: '#fff', margin: 0, fontSize: 18 }}>Pocket Commercial PWA</h2>
          </div>
          <button
            className="btn"
            style={{ background: '#fff', color: '#7a1f1f', fontWeight: 800, fontSize: 12, padding: '6px 12px' }}
            onClick={() => setShowQuickAdd((v) => !v)}
          >
            {showQuickAdd ? '✕ Fermer' : '➕ Saisie Express (5s)'}
          </button>
        </div>
      </div>

      {/* Saisie Express Nouveau Prospect (5 secondes) */}
      {showQuickAdd && (
        <div className="panel" style={{ border: '2px solid #7a1f1f', marginBottom: 16, background: '#fff5f5' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14, color: '#7a1f1f' }}>⚡ Ajouter un Restaurant en 5 secondes</h3>
          <div className="field-row">
            <label style={{ fontSize: 11 }}>Nom de l'établissement *</label>
            <input type="text" placeholder="Ex: Restaurant Teranga" value={newNom} onChange={(e) => setNewNom(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field-row">
              <label style={{ fontSize: 11 }}>Quartier</label>
              <select value={newQuartier} onChange={(e) => setNewQuartier(e.target.value)}>
                <option value="Almadies">Almadies</option>
                <option value="Ngor">Ngor</option>
                <option value="Plateau">Plateau</option>
                <option value="Point E">Point E</option>
                <option value="Ouakam">Ouakam</option>
                <option value="Parcelles">Parcelles</option>
                <option value="Pikine">Pikine</option>
                <option value="Guédiawaye">Guédiawaye</option>
              </select>
            </div>
            <div className="field-row">
              <label style={{ fontSize: 11 }}>Téléphone WhatsApp</label>
              <input type="tel" placeholder="+221 77..." value={newTelephone} onChange={(e) => setNewTelephone(e.target.value)} />
            </div>
          </div>
          <button className="btn primary" style={{ width: '100%', marginTop: 8 }} onClick={handleQuickAddRestaurant}>
            ⚡ Enregistrer Immédiatement
          </button>
        </div>
      )}

      {/* Recherche Rapide */}
      <div className="panel" style={{ marginBottom: 16, padding: 12 }}>
        <input
          type="text"
          placeholder="🔎 Rechercher un restaurant à proximité..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: 10, fontSize: 14, borderRadius: 8, border: '1px solid var(--border)' }}
        />

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingTop: 10, paddingBottom: 4 }}>
          {filteredList.map((j) => (
            <button
              key={j.id}
              onClick={() => setSelectedRestauId(j.id)}
              className={selectedRestauId === j.id ? 'btn small' : 'btn secondary small'}
              style={{ whiteSpace: 'nowrap', fontSize: 11.5 }}
            >
              {selectedRestauId === j.id ? '📍 ' : ''}{j.etablissement}
            </button>
          ))}
        </div>
      </div>

      {/* Carte Fiche Express du Restaurant Sélectionné */}
      {selectedProspect && (
        <div className="panel" style={{ borderLeft: '4px solid #7a1f1f' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#7a1f1f' }}>{selectedProspect.etablissement}</h2>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                📍 {selectedProspect.quartier} ({selectedProspect.zone}) — {selectedProspect.telephone}
              </div>
            </div>
            <span className="zone-tag" style={{ fontWeight: 800 }}>{selectedProspect.crm.statut.toUpperCase()}</span>
          </div>

          {/* Boutons d'Action Directs 1-Tap */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
            <a
              href={`tel:${selectedProspect.telephone}`}
              className="btn secondary small"
              style={{ textAlign: 'center', display: 'block', padding: '8px 4px', fontSize: 12, fontWeight: 700 }}
            >
              📞 Appeler
            </a>
            <button
              className="btn secondary small"
              style={{ color: '#25d366', borderColor: '#25d366', fontWeight: 700, padding: '8px 4px', fontSize: 12 }}
              onClick={() => {
                const link = waLinkWithText(selectedProspect.telephone, `Bonjour ${selectedProspect.etablissement}, c'est ${currentAgent || 'NDUGUMi'} !`)
                if (link) window.open(link, '_blank')
              }}
            >
              💬 WhatsApp
            </button>
            <a
              href={`https://waze.com/ul?ll=${selectedProspect.exactLat || 14.7167},${selectedProspect.exactLng || -17.4677}&navigate=yes`}
              target="_blank"
              rel="noreferrer"
              className="btn secondary small"
              style={{ color: '#3b82f6', borderColor: '#3b82f6', fontWeight: 700, textAlign: 'center', display: 'block', padding: '8px 4px', fontSize: 12 }}
            >
              🧭 Waze GPS
            </a>
          </div>

          {/* Changement de Statut Rapide 1-Tap */}
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>CHANGER LE STATUT CRM</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['nouveau', 'contacte', 'interesse', 'signe', 'client_actif'] as Statut[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatut(selectedProspect.id, st)}
                  className={selectedProspect.crm.statut === st ? 'btn small' : 'btn secondary small'}
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Dictée / Saisie de Note Rapide */}
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>NOTE DE VISITE EXPRESSE</div>
            <textarea
              rows={2}
              placeholder="Ex: Le gérant est intéressé par le riz parfumé. Rappeler mardi à 14h."
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              style={{ width: '100%', padding: 8, fontSize: 12, borderRadius: 6 }}
            />
            <button className="btn primary small" style={{ width: '100%', marginTop: 6 }} onClick={handleAddQuickVisitNote}>
              📝 Enregistrer la visite dans l'historique
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
