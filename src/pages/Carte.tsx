import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { jitteredCoords, DAKAR_CENTER } from '../data/quartierCoords'
import { STATUTS, STATUT_LABELS, STATUT_COLORS, type Statut } from '../types'

export default function Carte() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const navigate = useNavigate()

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const [zoneFilter, setZoneFilter] = useState('')
  const [quartierFilter, setQuartierFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState<Statut | ''>('')
  const [ndugumiFilter, setNdugumiFilter] = useState<'' | 'oui' | 'non'>('')

  const quartiers = useMemo(() => {
    const set = new Set(joined.map((j) => j.quartier))
    return Array.from(set).sort()
  }, [joined])

  const filtered = useMemo(() => {
    return joined.filter((j) => {
      if (zoneFilter && j.zone !== zoneFilter) return false
      if (quartierFilter && j.quartier !== quartierFilter) return false
      if (statutFilter && j.crm.statut !== statutFilter) return false
      if (ndugumiFilter === 'oui' && !j.crm.ndugumi.inscrit) return false
      if (ndugumiFilter === 'non' && j.crm.ndugumi.inscrit) return false
      return true
    })
  }, [joined, zoneFilter, quartierFilter, statutFilter, ndugumiFilter])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Carte des restaurants</h1>
          <p className="page-subtitle">
            {filtered.length} / {joined.length} restaurants affichés · positions approximatives par quartier
          </p>
        </div>
      </div>

      <div className="filters-bar">
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
        <select value={ndugumiFilter} onChange={(e) => setNdugumiFilter(e.target.value as '' | 'oui' | 'non')}>
          <option value="">NDUGUMi (tous)</option>
          <option value="oui">Inscrits NDUGUMi</option>
          <option value="non">Non inscrits NDUGUMi</option>
        </select>
      </div>

      <div className="panel" style={{ padding: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8, fontSize: 11.5 }}>
          {STATUTS.map((s) => (
            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: STATUT_COLORS[s],
                  display: 'inline-block',
                }}
              />
              {STATUT_LABELS[s]}
            </span>
          ))}
        </div>

        <div style={{ height: '65vh', borderRadius: 8, overflow: 'hidden' }}>
          <MapContainer
            center={DAKAR_CENTER}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtered.map((j) => {
              const [lat, lng] = jitteredCoords(j.quartier, j.id)
              return (
                <CircleMarker
                  key={j.id}
                  center={[lat, lng]}
                  radius={6}
                  pathOptions={{
                    color: STATUT_COLORS[j.crm.statut],
                    fillColor: STATUT_COLORS[j.crm.statut],
                    fillOpacity: 0.85,
                    weight: 1,
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <strong>{j.etablissement}</strong>
                      <div style={{ fontSize: 12, margin: '4px 0' }}>
                        {j.quartier} · {j.telephone}
                      </div>
                      <div style={{ fontSize: 12, marginBottom: 6 }}>{STATUT_LABELS[j.crm.statut]}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn small" onClick={() => navigate(`/prospects/${j.id}`)}>
                          Voir la fiche
                        </button>
                        <button
                          className="btn secondary small"
                          onClick={() => navigate(`/prospects?quartier=${encodeURIComponent(j.quartier)}`)}
                        >
                          Tout le quartier
                        </button>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>
        Note : la plupart des adresses collectées ne sont pas assez précises pour un géocodage exact. Chaque
        restaurant est donc positionné près du centre géographique connu de son quartier, avec un léger écart pour
        éviter que les points se superposent — ce n'est pas son adresse réelle exacte sur la carte.
      </div>
    </div>
  )
}
