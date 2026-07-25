import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import type { Zone } from '../types'

interface PublicLead {
  id: string
  etablissement: string
  telephone: string
  quartier: string | null
  message: string | null
  created_at: string
}

export default function PublicLeadsPanel() {
  const addRestaurant = useCrmStore((s) => s.addRestaurant)
  const setTags = useCrmStore((s) => s.setTags)
  const addNote = useCrmStore((s) => s.addNote)
  const currentAgent = useCrmStore((s) => s.currentAgent)
  const navigate = useNavigate()

  const [leads, setLeads] = useState<PublicLead[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  async function loadLeads() {
    try {
      const res = await fetch('/api/lead')
      const data = await res.json()
      setLeads(data.leads ?? [])
    } catch (e) {
      console.error('Erreur chargement leads publics', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [])

  async function handleConvert(lead: PublicLead) {
    const id = addRestaurant({
      etablissement: lead.etablissement,
      telephone: lead.telephone || 'Non communiqué',
      quartier: lead.quartier || 'Non renseigné',
      zone: 'Dakar intra-muros' as Zone,
    })
    setTags(id, ['Lead site web'])
    if (lead.message) {
      addNote(id, 'autre', `Message du formulaire public : ${lead.message}`, currentAgent || 'Formulaire public')
    }
    try {
      await fetch('/api/lead', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id, restaurantId: id }),
      })
    } catch (e) {
      console.error('Erreur marquage lead converti', e)
    }
    setLeads((prev) => prev.filter((l) => l.id !== lead.id))
    navigate(`/prospects/${id}`)
  }

  async function handleDismiss(lead: PublicLead) {
    if (!confirm('Ignorer cette demande (ne sera plus affichée) ?')) return
    try {
      await fetch('/api/lead', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id, restaurantId: null }),
      })
    } catch (e) {
      console.error('Erreur ignorement lead', e)
    }
    setLeads((prev) => prev.filter((l) => l.id !== lead.id))
  }

  if (loading || leads.length === 0) return null

  return (
    <div className="panel" style={{ background: '#fff7e0', border: '1px solid #f0d878', marginBottom: 16 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded((v) => !v)}
      >
        <strong style={{ fontSize: 13.5, color: '#7a5c00' }}>
          📥 {leads.length} demande(s) reçue(s) via le formulaire public « Devenir partenaire »
        </strong>
        <span style={{ fontSize: 12, color: '#7a5c00' }}>{expanded ? '▲ Masquer' : '▼ Afficher'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leads.map((lead) => (
            <div
              key={lead.id}
              style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
            >
              <div>
                <strong>{lead.etablissement}</strong>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {lead.telephone} {lead.quartier ? `· ${lead.quartier}` : ''} ·{' '}
                  {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                </div>
                {lead.message && <div style={{ fontSize: 12, marginTop: 4 }}>« {lead.message} »</div>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn small" onClick={() => handleConvert(lead)}>
                  ✅ Convertir en prospect
                </button>
                <button className="btn secondary small" onClick={() => handleDismiss(lead)}>
                  Ignorer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
