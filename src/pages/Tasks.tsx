import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { isLate, isToday } from '../utils/joined'
import { getMonthMatrix, monthLabel, startOfMonth, toISODate, WEEKDAY_LABELS } from '../utils/calendar'
import {
  TASK_PRIORITE_LABELS,
  TASK_PRIORITE_COLORS,
  type TaskPriorite,
  type TaskStatut,
} from '../types'

type ViewMode = 'liste' | 'calendrier'

export default function Tasks() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const tasks = useCrmStore((s) => s.tasks)
  const agents = useCrmStore((s) => s.agents)
  const addTask = useCrmStore((s) => s.addTask)
  const toggleTask = useCrmStore((s) => s.toggleTask)
  const removeTask = useCrmStore((s) => s.removeTask)
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState<ViewMode>('liste')
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const [agentFilter, setAgentFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState<TaskStatut | ''>('a_faire')

  const [restaurantSearch, setRestaurantSearch] = useState('')
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | ''>('')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [dateEcheance, setDateEcheance] = useState('')
  const [priorite, setPriorite] = useState<TaskPriorite>('normale')
  const [taskAgent, setTaskAgent] = useState(agents[0])
  const [showForm, setShowForm] = useState(false)

  const restaurantOptions = useMemo(() => {
    const q = restaurantSearch.trim().toLowerCase()
    const all = Object.values(restaurants)
    const filtered = q ? all.filter((r) => r.etablissement.toLowerCase().includes(q)) : all
    return filtered.slice(0, 50)
  }, [restaurants, restaurantSearch])

  const allJoinedTasks = useMemo(() => {
    return Object.values(tasks)
      .map((t) => ({ ...t, restaurant: restaurants[t.restaurantId] }))
      .filter((t) => t.restaurant)
  }, [tasks, restaurants])

  const list = useMemo(() => {
    return allJoinedTasks
      .filter((t) => (agentFilter ? t.agent === agentFilter : true))
      .filter((t) => (statutFilter ? t.statut === statutFilter : true))
      .filter((t) => (selectedDay ? t.dateEcheance === selectedDay : true))
      .sort((a, b) => a.dateEcheance.localeCompare(b.dateEcheance))
  }, [allJoinedTasks, agentFilter, statutFilter, selectedDay])

  const tasksByDay = useMemo(() => {
    const m = new Map<string, typeof allJoinedTasks>()
    for (const t of allJoinedTasks) {
      if (agentFilter && t.agent !== agentFilter) continue
      if (statutFilter && t.statut !== statutFilter) continue
      const arr = m.get(t.dateEcheance) ?? []
      arr.push(t)
      m.set(t.dateEcheance, arr)
    }
    return m
  }, [allJoinedTasks, agentFilter, statutFilter])

  const weeks = useMemo(() => getMonthMatrix(calendarMonth), [calendarMonth])

  function handleCreate() {
    if (!selectedRestaurantId || !titre.trim() || !dateEcheance) return
    addTask(Number(selectedRestaurantId), {
      titre: titre.trim(),
      description: description.trim(),
      dateEcheance,
      priorite,
      agent: taskAgent,
    })
    setTitre('')
    setDescription('')
    setDateEcheance('')
    setSelectedRestaurantId('')
    setRestaurantSearch('')
    setShowForm(false)
  }

  function changeMonth(delta: number) {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tâches &amp; agenda</h1>
          <p className="page-subtitle">Toutes les tâches de suivi, tous restaurants confondus</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={viewMode === 'liste' ? 'btn' : 'btn secondary'}
            onClick={() => {
              setViewMode('liste')
              setSelectedDay(null)
            }}
          >
            Vue liste
          </button>
          <button className={viewMode === 'calendrier' ? 'btn' : 'btn secondary'} onClick={() => setViewMode('calendrier')}>
            Vue calendrier
          </button>
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Fermer' : '+ Nouvelle tâche'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="panel">
          <h3>Créer une tâche</h3>
          <div className="field-row">
            <label>Restaurant</label>
            <input
              type="text"
              placeholder="Rechercher un restaurant…"
              value={restaurantSearch}
              onChange={(e) => setRestaurantSearch(e.target.value)}
            />
          </div>
          <div className="field-row">
            <select
              size={6}
              value={selectedRestaurantId}
              onChange={(e) => setSelectedRestaurantId(Number(e.target.value))}
            >
              {restaurantOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.etablissement} — {r.quartier}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <label>Titre</label>
            <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="field-row">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div className="field-row" style={{ flex: '1 1 140px' }}>
              <label>Échéance</label>
              <input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} />
            </div>
            <div className="field-row" style={{ flex: '1 1 120px' }}>
              <label>Priorité</label>
              <select value={priorite} onChange={(e) => setPriorite(e.target.value as TaskPriorite)}>
                {(Object.keys(TASK_PRIORITE_LABELS) as TaskPriorite[]).map((p) => (
                  <option key={p} value={p}>
                    {TASK_PRIORITE_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row" style={{ flex: '1 1 140px' }}>
              <label>Agent</label>
              <select value={taskAgent} onChange={(e) => setTaskAgent(e.target.value)}>
                {agents.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn" onClick={handleCreate}>
            Créer la tâche
          </button>
        </div>
      )}

      <div className="filters-bar">
        <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
          <option value="">Tous les agents</option>
          {agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value as TaskStatut | '')}>
          <option value="">Tous statuts</option>
          <option value="a_faire">À faire</option>
          <option value="fait">Terminées</option>
        </select>
        {selectedDay && (
          <button className="btn secondary small" onClick={() => setSelectedDay(null)}>
            Voir toutes les dates (retirer le {selectedDay})
          </button>
        )}
      </div>

      {viewMode === 'calendrier' && (
        <div className="panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button className="btn secondary small" onClick={() => changeMonth(-1)}>
              ← Mois précédent
            </button>
            <strong style={{ textTransform: 'capitalize' }}>{monthLabel(calendarMonth)}</strong>
            <button className="btn secondary small" onClick={() => changeMonth(1)}>
              Mois suivant →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', color: 'var(--text-dim)' }}>
                {w}
              </div>
            ))}
            {weeks.flat().map((day, i) => {
              const iso = toISODate(day)
              const inMonth = day.getMonth() === calendarMonth.getMonth()
              const dayTasks = tasksByDay.get(iso) ?? []
              const isSelected = selectedDay === iso
              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : iso)}
                  style={{
                    minHeight: 66,
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 6,
                    padding: 4,
                    cursor: 'pointer',
                    background: inMonth ? '#fff' : '#faf7f2',
                    opacity: inMonth ? 1 : 0.5,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: isToday(iso) ? 700 : 400, color: isToday(iso) ? 'var(--primary)' : 'inherit' }}>
                    {day.getDate()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        style={{
                          fontSize: 9.5,
                          background: TASK_PRIORITE_COLORS[t.priorite],
                          color: '#fff',
                          borderRadius: 3,
                          padding: '1px 4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textDecoration: t.statut === 'fait' ? 'line-through' : 'none',
                        }}
                      >
                        {t.titre}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>+{dayTasks.length - 2} autre(s)</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Tâche</th>
              <th>Restaurant</th>
              <th>Échéance</th>
              <th>Priorité</th>
              <th>Agent</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td>
                  <input type="checkbox" checked={t.statut === 'fait'} onChange={() => toggleTask(t.id)} />
                </td>
                <td style={{ textDecoration: t.statut === 'fait' ? 'line-through' : 'none' }}>
                  <div style={{ fontWeight: 600 }}>{t.titre}</div>
                  {t.description && <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{t.description}</div>}
                </td>
                <td>
                  <span
                    style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }}
                    onClick={() => navigate(`/prospects/${t.restaurantId}`)}
                  >
                    {t.restaurant.etablissement}
                  </span>
                </td>
                <td
                  style={{
                    color:
                      t.statut === 'a_faire' && isLate(t.dateEcheance)
                        ? 'var(--danger)'
                        : t.statut === 'a_faire' && isToday(t.dateEcheance)
                          ? 'var(--warn)'
                          : 'inherit',
                    fontWeight: t.statut === 'a_faire' && isLate(t.dateEcheance) ? 700 : 400,
                  }}
                >
                  {t.dateEcheance}
                  {t.statut === 'a_faire' && isLate(t.dateEcheance) ? ' (retard)' : ''}
                </td>
                <td>
                  <span className="badge" style={{ background: TASK_PRIORITE_COLORS[t.priorite] }}>
                    {TASK_PRIORITE_LABELS[t.priorite]}
                  </span>
                </td>
                <td>{t.agent}</td>
                <td>
                  <button className="btn secondary small" onClick={() => removeTask(t.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-state">
                  Aucune tâche ne correspond à ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
