import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { STATUTS, STATUT_LABELS, STATUT_COLORS, type Statut } from '../types'

export default function Pipeline() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const setStatut = useCrmStore((s) => s.setStatut)
  const navigate = useNavigate()

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const byStatut = useMemo(() => {
    const m: Record<Statut, typeof joined> = {} as Record<Statut, typeof joined>
    for (const s of STATUTS) m[s] = []
    for (const j of joined) m[j.crm.statut].push(j)
    return m
  }, [joined])

  function advance(id: number, current: Statut) {
    const idx = STATUTS.indexOf(current)
    if (idx < STATUTS.length - 1) {
      setStatut(id, STATUTS[idx + 1])
    }
  }

  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverCol, setDragOverCol] = useState<Statut | null>(null)

  function handleDragStart(e: React.DragEvent, id: number) {
    setDraggedId(id)
    e.dataTransfer.setData('text/plain', String(id))
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e: React.DragEvent, target: Statut) {
    e.preventDefault()
    setDragOverCol(null)
    const idStr = e.dataTransfer.getData('text/plain')
    const id = idStr ? Number(idStr) : draggedId
    if (id !== null && !Number.isNaN(id)) setStatut(id, target)
    setDraggedId(null)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pipeline de prospection</h1>
          <p className="page-subtitle">Vue par étape — cliquez sur une carte pour ouvrir la fiche</p>
        </div>
      </div>

      <div className="kanban">
        {STATUTS.map((s) => (
          <div
            className={'kanban-col' + (dragOverCol === s ? ' drag-over' : '')}
            key={s}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (dragOverCol !== s) setDragOverCol(s)
            }}
            onDragLeave={() => setDragOverCol((prev) => (prev === s ? null : prev))}
            onDrop={(e) => handleDrop(e, s)}
          >
            <div className="kanban-col-header">
              <span style={{ color: STATUT_COLORS[s] }}>{STATUT_LABELS[s]}</span>
              <span>{byStatut[s].length}</span>
            </div>
            {byStatut[s].map((j) => (
              <div
                className="kanban-card"
                key={j.id}
                draggable
                onDragStart={(e) => handleDragStart(e, j.id)}
                onDragEnd={() => {
                  setDraggedId(null)
                  setDragOverCol(null)
                }}
                onClick={() => navigate(`/prospects/${j.id}`)}
                style={{ opacity: draggedId === j.id ? 0.4 : 1, cursor: 'grab' }}
              >
                <span className="etab">{j.etablissement}</span>
                <span className="quartier">{j.quartier}</span>
                {j.crm.tags.length > 0 && (
                  <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {j.crm.tags.map((t) => (
                      <span key={t} className="zone-tag" style={{ fontSize: 10 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {j.crm.aiScore !== undefined && (
                  <div style={{ marginTop: 6 }}>
                    <span className="badge" style={{ background: '#f3e8ff', color: '#7e22ce', fontSize: 11 }}>
                      ✨ Probabilité IA : {j.crm.aiScore}%
                    </span>
                  </div>
                )}
                {STATUTS.indexOf(s) < STATUTS.length - 1 && s !== 'refuse' && s !== 'client_inactif' && (
                  <button
                    className="btn secondary small"
                    style={{ marginTop: 6, width: '100%' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      advance(j.id, s)
                    }}
                  >
                    Avancer →
                  </button>
                )}
              </div>
            ))}
            {byStatut[s].length === 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', textAlign: 'center', padding: '10px 0' }}>
                Vide
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
