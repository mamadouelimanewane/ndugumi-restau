import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { STATUT_LABELS } from '../types'

interface Result {
  key: string
  label: string
  sublabel: string
  onSelect: () => void
}

export default function GlobalSearch() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const tasks = useCrmStore((s) => s.tasks)
  const navigate = useNavigate()

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []

    const out: Result[] = []

    for (const j of joined) {
      const haystack = `${j.etablissement} ${j.telephone} ${j.quartier}`.toLowerCase()
      if (haystack.includes(q)) {
        out.push({
          key: `r-${j.id}`,
          label: j.etablissement,
          sublabel: `${j.quartier} · ${STATUT_LABELS[j.crm.statut]}`,
          onSelect: () => navigate(`/prospects/${j.id}`),
        })
      }
      if (out.length >= 6) break
    }

    if (out.length < 8) {
      for (const t of Object.values(tasks)) {
        if (t.titre.toLowerCase().includes(q)) {
          const parent = restaurants[t.restaurantId]
          out.push({
            key: `t-${t.id}`,
            label: t.titre,
            sublabel: parent ? `Tâche · ${parent.etablissement}` : 'Tâche',
            onSelect: () => navigate(`/prospects/${t.restaurantId}`),
          })
        }
        if (out.length >= 8) break
      }
    }

    return out
  }, [query, joined, tasks, restaurants, navigate])

  function handleSelect(r: Result) {
    r.onSelect()
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="global-search" ref={boxRef}>
      <input
        type="text"
        placeholder="Rechercher un restaurant, un numéro, un quartier, une tâche…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && query.trim().length >= 2 && (
        <div className="global-search-results">
          {results.length === 0 && <div className="global-search-empty">Aucun résultat pour « {query} »</div>}
          {results.map((r) => (
            <div key={r.key} className="global-search-item" onClick={() => handleSelect(r)}>
              <div className="global-search-item-label">{r.label}</div>
              <div className="global-search-item-sub">{r.sublabel}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
