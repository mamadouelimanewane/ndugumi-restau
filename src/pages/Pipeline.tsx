import { useMemo } from 'react'
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
          <div className="kanban-col" key={s}>
            <div className="kanban-col-header">
              <span style={{ color: STATUT_COLORS[s] }}>{STATUT_LABELS[s]}</span>
              <span>{byStatut[s].length}</span>
            </div>
            {byStatut[s].map((j) => (
              <div className="kanban-card" key={j.id} onClick={() => navigate(`/prospects/${j.id}`)}>
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
