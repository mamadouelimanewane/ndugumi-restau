import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects, isLate } from '../utils/joined'
import {
  STATUTS,
  STATUT_LABELS,
  CANAL_LABELS,
  CLIENT_STATUTS,
  defaultCampaignFilter,
  type Statut,
  type Canal,
  type Campaign,
  type CampaignFilter,
} from '../types'

function emptyDraft(): { nom: string; objectif: string; canal: Canal; templateId: string; filtre: CampaignFilter } {
  return { nom: '', objectif: '', canal: 'whatsapp', templateId: '', filtre: defaultCampaignFilter() }
}

export default function Marketing() {
  const navigate = useNavigate()
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const templates = useCrmStore((s) => s.templates)
  const campaigns = useCrmStore((s) => s.campaigns)
  const campaignSends = useCrmStore((s) => s.campaignSends)
  const addCampaign = useCrmStore((s) => s.addCampaign)
  const removeCampaign = useCrmStore((s) => s.removeCampaign)

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(emptyDraft())
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)

  const quartiers = useMemo(() => {
    const set = new Set(joined.map((j) => j.quartier))
    return Array.from(set).sort()
  }, [joined])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const j of joined) for (const t of j.crm.tags) set.add(t)
    return Array.from(set).sort()
  }, [joined])

  const zonesAConquerir = useMemo(() => {
    const quartiersStats = new Map<string, { prospects: number; actifs: number }>()
    for (const j of joined) {
      const qs = quartiersStats.get(j.quartier) || { prospects: 0, actifs: 0 }
      if (j.crm.statut === 'client_actif') qs.actifs++
      else if (!CLIENT_STATUTS.includes(j.crm.statut)) qs.prospects++
      quartiersStats.set(j.quartier, qs)
    }
    return Array.from(quartiersStats.entries())
      .filter(([_, stats]) => stats.prospects > 5 && stats.actifs === 0)
      .map(([q, _]) => q)
  }, [joined])

  const smartSegments = useMemo(() => {
    const now = Date.now()
    const urgents = joined.filter(j => isLate(j.crm.prochaineRelance) && ['contacte','interesse','rdv','negociation'].includes(j.crm.statut))
    
    const chauds = joined.filter(j => {
      if (!['interesse','rdv'].includes(j.crm.statut)) return false
      const lastNoteDate = j.crm.notes.length > 0 ? Math.max(...j.crm.notes.map(n => new Date(n.date).getTime())) : new Date(j.crm.createdAt).getTime()
      const isNotActiveRelance = !j.crm.prochaineRelance || isLate(j.crm.prochaineRelance)
      return (now - lastNoteDate) > 14 * 24 * 60 * 60 * 1000 && isNotActiveRelance
    })

    const dormants = joined.filter(j => {
      if (['client_actif','signe','refuse','client_inactif'].includes(j.crm.statut)) return false
      const lastNoteDate = j.crm.notes.length > 0 ? Math.max(...j.crm.notes.map(n => new Date(n.date).getTime())) : new Date(j.crm.createdAt).getTime()
      return (now - lastNoteDate) > 30 * 24 * 60 * 60 * 1000
    })

    const nouveaux = joined.filter(j => j.crm.statut === 'nouveau' && (now - new Date(j.crm.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000)
    
    const inactifs = joined.filter(j => j.crm.statut === 'client_inactif')

    const conquerir = joined.filter(j => zonesAConquerir.includes(j.quartier))

    return [
      { id: 'urgents', icon: '🔴', nom: 'Relances urgentes', desc: 'Relances dépassées (contacts/chauds)', count: urgents.length, color: 'var(--danger)' },
      { id: 'chauds', icon: '🟡', nom: 'Chauds non convertis', desc: '+14j sans conversion ni relance active', count: chauds.length, color: 'var(--warn)' },
      { id: 'dormants', icon: '💤', nom: 'Dormants', desc: '+30j sans aucune nouvelle', count: dormants.length, color: 'var(--text-dim)' },
      { id: 'nouveaux', icon: '🆕', nom: 'Nouveaux non contactés', desc: 'Dans le CRM depuis +7j', count: nouveaux.length, color: 'var(--primary)' },
      { id: 'inactifs', icon: '🔄', nom: 'Réactivation clients', desc: 'Clients perdus ou inactifs', count: inactifs.length, color: '#7a5c3d' },
      { id: 'conquerir', icon: '🏆', nom: 'Zone à conquérir', desc: 'Quartiers >5 prospects sans clients', count: conquerir.length, color: '#b8862e' }
    ]
  }, [joined, zonesAConquerir])

  function matchesFilter(j: (typeof joined)[number], f: CampaignFilter): boolean {
    if (f.segment) {
      const now = Date.now()
      if (f.segment === 'urgents') {
        if (!isLate(j.crm.prochaineRelance) || !['contacte', 'interesse', 'rdv', 'negociation'].includes(j.crm.statut)) return false
      }
      if (f.segment === 'chauds') {
        if (!['interesse', 'rdv'].includes(j.crm.statut)) return false
        const lastNoteDate = j.crm.notes.length > 0 ? Math.max(...j.crm.notes.map((n) => new Date(n.date).getTime())) : new Date(j.crm.createdAt).getTime()
        if (now - lastNoteDate <= 14 * 24 * 60 * 60 * 1000 || (j.crm.prochaineRelance && !isLate(j.crm.prochaineRelance))) return false
      }
      if (f.segment === 'dormants') {
        if (['client_actif', 'signe', 'refuse', 'client_inactif'].includes(j.crm.statut)) return false
        const lastNoteDate = j.crm.notes.length > 0 ? Math.max(...j.crm.notes.map((n) => new Date(n.date).getTime())) : new Date(j.crm.createdAt).getTime()
        if (now - lastNoteDate <= 30 * 24 * 60 * 60 * 1000) return false
      }
      if (f.segment === 'nouveaux') {
        if (j.crm.statut !== 'nouveau') return false
        if (now - new Date(j.crm.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000) return false
      }
      if (f.segment === 'inactifs') {
        if (j.crm.statut !== 'client_inactif') return false
      }
      if (f.segment === 'conquerir') {
        if (!zonesAConquerir.includes(j.quartier)) return false
      }
    }

    if (f.zone && j.zone !== f.zone) return false
    if (f.quartier && j.quartier !== f.quartier) return false
    if (f.statut && j.crm.statut !== f.statut) return false
    if (f.tag && !j.crm.tags.includes(f.tag)) return false
    if (f.ndugumi === 'oui' && !j.crm.ndugumi.inscrit) return false
    if (f.ndugumi === 'non' && j.crm.ndugumi.inscrit) return false
    return true
  }

  const campaignList = useMemo(
    () => Object.values(campaigns).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [campaigns]
  )

  const stats = useMemo(() => {
    return campaignList.map((c) => {
      const targeted = joined.filter((j) => matchesFilter(j, c.filtre))
      const sends = Object.values(campaignSends).filter((cs) => cs.campaignId === c.id)
      const sentRestaurantIds = new Set(sends.map((s) => s.restaurantId))
      const converted = joined.filter(
        (j) => sentRestaurantIds.has(j.id) && CLIENT_STATUTS.includes(j.crm.statut) && j.crm.statut !== 'client_inactif'
      )
      return {
        campaign: c,
        targetedCount: targeted.length,
        sentCount: sentRestaurantIds.size,
        convertedCount: converted.length,
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })
  }, [campaignList, joined, campaignSends])

  function handleCreate() {
    if (!draft.nom.trim()) return
    const id = addCampaign({
      nom: draft.nom.trim(),
      objectif: draft.objectif.trim(),
      canal: draft.canal,
      templateId: draft.templateId || null,
      filtre: draft.filtre,
    })
    setDraft(emptyDraft())
    setShowForm(false)
    return id
  }

  function handleRemove(c: Campaign) {
    if (confirm(`Supprimer la campagne « ${c.nom} » ?`)) removeCampaign(c.id)
  }

  const templatesForCanal = Object.values(templates).filter((t) => t.canal === draft.canal)

  const handleViewProspects = (segmentId: string) => {
    if (segmentId === 'nouveaux') navigate('/prospects?statut=nouveau')
    else if (segmentId === 'inactifs') navigate('/prospects?statut=client_inactif')
    else {
      sessionStorage.setItem('prospects_segment_filter', segmentId)
      navigate('/prospects')
    }
  }

  const handleCreateCampaignForSegment = (segmentId: string, segmentNom: string) => {
    const id = addCampaign({
      nom: `Campagne ${segmentNom}`,
      objectif: `Ciblage du segment : ${segmentNom}`,
      canal: 'whatsapp',
      templateId: null,
      filtre: { ...defaultCampaignFilter(), segment: segmentId }
    })
    navigate('/communication?campaignId=' + id)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Marketing</h1>
          <p className="page-subtitle">Campagnes ciblées : segment de restaurants + modèle de message, avec suivi de performance</p>
        </div>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Fermer' : '+ Nouvelle campagne'}
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 16 }}>⚡ Segments intelligents</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {smartSegments.map(seg => (
            <div key={seg.id} className="panel" style={{ borderTop: `4px solid ${seg.color}`, margin: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>{seg.icon}</span>
                <h3 style={{ margin: 0, fontSize: '16px' }}>{seg.nom}</h3>
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-dim)', flex: 1 }}>{seg.desc}</p>
              <div style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>
                {seg.count} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-dim)' }}>restaurants</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn secondary small" onClick={() => handleViewProspects(seg.id)} style={{ flex: 1, padding: '6px' }}>Voir les prospects →</button>
                <button className="btn small" onClick={() => handleCreateCampaignForSegment(seg.id, seg.nom)} style={{ flex: 1, padding: '6px' }}>Créer une campagne</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="panel">
          <h3>Nouvelle campagne</h3>
          <div className="field-row">
            <label>Nom</label>
            <input type="text" value={draft.nom} onChange={(e) => setDraft({ ...draft, nom: e.target.value })} placeholder="Ex : Relance quartiers sans NDUGUMi" />
          </div>
          <div className="field-row">
            <label>Objectif</label>
            <input type="text" value={draft.objectif} onChange={(e) => setDraft({ ...draft, objectif: e.target.value })} placeholder="Ex : Faire connaître NDUGUMi aux restaurants intéressés non signés" />
          </div>
          <div className="field-row">
            <label>Canal</label>
            <select value={draft.canal} onChange={(e) => setDraft({ ...draft, canal: e.target.value as Canal, templateId: '' })}>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div className="field-row">
            <label>Modèle de message</label>
            <select value={draft.templateId} onChange={(e) => setDraft({ ...draft, templateId: e.target.value })}>
              <option value="">Aucun (à choisir au moment de l'envoi)</option>
              {templatesForCanal.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </select>
          </div>
          <h3 style={{ fontSize: 13, marginTop: 16 }}>Segment ciblé</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={draft.filtre.zone} onChange={(e) => setDraft({ ...draft, filtre: { ...draft.filtre, zone: e.target.value as any } })}>
              <option value="">Toutes zones</option>
              <option value="Dakar intra-muros">Dakar intra-muros</option>
              <option value="Banlieue">Banlieue</option>
            </select>
            <select value={draft.filtre.quartier} onChange={(e) => setDraft({ ...draft, filtre: { ...draft.filtre, quartier: e.target.value } })}>
              <option value="">Tous quartiers</option>
              {quartiers.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            <select
              value={draft.filtre.statut}
              onChange={(e) => setDraft({ ...draft, filtre: { ...draft.filtre, statut: e.target.value as Statut | '' } })}
            >
              <option value="">Tous statuts</option>
              {STATUTS.map((s) => (
                <option key={s} value={s}>
                  {STATUT_LABELS[s]}
                </option>
              ))}
            </select>
            {allTags.length > 0 && (
              <select value={draft.filtre.tag} onChange={(e) => setDraft({ ...draft, filtre: { ...draft.filtre, tag: e.target.value } })}>
                <option value="">Tous tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
            <select
              value={draft.filtre.ndugumi}
              onChange={(e) => setDraft({ ...draft, filtre: { ...draft.filtre, ndugumi: e.target.value as '' | 'oui' | 'non' } })}
            >
              <option value="">NDUGUMi (tous)</option>
              <option value="oui">Inscrits NDUGUMi</option>
              <option value="non">Non inscrits NDUGUMi</option>
            </select>
            {draft.filtre.segment && (
              <span className="badge" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                Segment : {smartSegments.find(s => s.id === draft.filtre.segment)?.nom || draft.filtre.segment}
                <button
                  style={{ background: 'none', border: 'none', color: 'white', marginLeft: 6, cursor: 'pointer' }}
                  onClick={() => setDraft({ ...draft, filtre: { ...draft.filtre, segment: '' } })}
                >
                  ×
                </button>
              </span>
            )}
          </div>
          <div style={{ marginTop: 10, fontSize: 12.5 }}>
            <strong>{joined.filter((j) => matchesFilter(j, draft.filtre)).length}</strong> restaurant(s) correspondent
            actuellement à ce segment.
          </div>
          <button className="btn" style={{ marginTop: 10 }} onClick={handleCreate}>
            Créer la campagne
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {stats.map(({ campaign: c, targetedCount, sentCount, convertedCount }) => {
          const isExpanded = expandedCampaignId === c.id
          
          const sends = Object.values(campaignSends).filter(cs => cs.campaignId === c.id)
          const last7Days = Date.now() - 7 * 24 * 60 * 60 * 1000
          const isActive = sends.some(s => new Date(s.date).getTime() > last7Days)
          
          const tauxEnvoi = targetedCount > 0 ? Math.round((sentCount / targetedCount) * 100) : 0
          const tauxConvCampagne = sentCount > 0 ? Math.round((convertedCount / sentCount) * 100) : 0
          const tauxGlobal = targetedCount > 0 ? Math.round((convertedCount / targetedCount) * 100) : 0

          const sendsByDay = sends.reduce((acc, s) => {
            const day = s.date.slice(0, 10)
            acc[day] = (acc[day] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          const last7DaysKeys = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - 6 + i)
            return d.toISOString().slice(0, 10)
          })
          
          const maxSends = Math.max(...last7DaysKeys.map(d => sendsByDay[d] || 0))

          return (
            <div key={c.id} className="panel" style={{ padding: 0, margin: 0, overflow: 'hidden' }}>
              <div 
                style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: isExpanded ? 'var(--sidebar-bg)' : 'transparent' }}
                onClick={() => setExpandedCampaignId(isExpanded ? null : c.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px' }}>{isActive ? '🟢 Active' : '⚪ Ancienne'}</span>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>{c.nom}</h3>
                    <span className="zone-tag">{CANAL_LABELS[c.canal]}</span>
                  </div>
                  {c.objectif && <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>{c.objectif}</div>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                  <Link to={`/communication?campaignId=${c.id}`}>
                    <button className="btn small">Lancer →</button>
                  </Link>
                  <button className="btn secondary small" onClick={() => handleRemove(c)}>Supprimer</button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Filtres : </span>
                      {c.filtre.segment && <span className="zone-tag">Segment: {c.filtre.segment}</span>}
                      {c.filtre.zone && <span className="zone-tag">Zone: {c.filtre.zone}</span>}
                      {c.filtre.quartier && <span className="zone-tag">Quartier: {c.filtre.quartier}</span>}
                      {c.filtre.statut && <span className="zone-tag">Statut: {STATUT_LABELS[c.filtre.statut]}</span>}
                      {c.filtre.tag && <span className="zone-tag">Tag: {c.filtre.tag}</span>}
                      {c.filtre.ndugumi && <span className="zone-tag">NDUGUMi: {c.filtre.ndugumi === 'oui' ? 'Inscrits' : 'Non inscrits'}</span>}
                      {(!c.filtre.segment && !c.filtre.zone && !c.filtre.quartier && !c.filtre.statut && !c.filtre.tag && !c.filtre.ndugumi) && <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Aucun (Tous les restaurants)</span>}
                   </div>
                   
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                      <div className="kpi-card" style={{ margin: 0 }}>
                        <div className="kpi-label">Restaurants ciblés</div>
                        <div className="kpi-value">{targetedCount}</div>
                      </div>
                      <div className="kpi-card" style={{ margin: 0 }}>
                        <div className="kpi-label">Contactés</div>
                        <div className="kpi-value">{sentCount} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-dim)' }}>({tauxEnvoi}%)</span></div>
                      </div>
                      <div className="kpi-card" style={{ margin: 0 }}>
                        <div className="kpi-label">Convertis en clients</div>
                        <div className="kpi-value">{convertedCount} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-dim)' }}>({tauxConvCampagne}% des contactés)</span></div>
                      </div>
                      <div className="kpi-card" style={{ margin: 0 }}>
                        <div className="kpi-label">Taux de conversion global</div>
                        <div className="kpi-value">{tauxGlobal}%</div>
                      </div>
                   </div>

                   <div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Envois sur les 7 derniers jours</h4>
                      {sends.length === 0 || maxSends === 0 ? (
                        <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Aucun envoi enregistré</div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' }}>
                          {last7DaysKeys.map(d => {
                            const count = sendsByDay[d] || 0
                            const height = maxSends > 0 ? `${(count / maxSends) * 100}%` : '0%'
                            return (
                              <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1 }}>
                                  <div style={{ background: 'var(--accent)', width: '100%', height, minHeight: count > 0 ? '4px' : '0', borderRadius: '2px' }}></div>
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '4px' }}>
                                  {d.slice(8, 10)}/{d.slice(5, 7)}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                   </div>
                </div>
              )}
            </div>
          )
        })}
        {stats.length === 0 && (
          <div className="empty-state">Aucune campagne. Créez-en une ci-dessus.</div>
        )}
      </div>

      <div className="panel" style={{ marginTop: 24, padding: 0, overflow: 'hidden' }}>
        <h3 style={{ padding: '16px', margin: 0, borderBottom: '1px solid var(--border)' }}>Performance comparative</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Ciblés</th>
              <th>Contactés</th>
              <th>Taux envoi</th>
              <th>Convertis</th>
              <th>Taux conv. global</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(({ campaign: c, targetedCount, sentCount, convertedCount }) => {
              const tauxEnvoi = targetedCount > 0 ? Math.round((sentCount / targetedCount) * 100) : 0
              const tauxGlobal = targetedCount > 0 ? Math.round((convertedCount / targetedCount) * 100) : 0
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.nom}</td>
                  <td>{targetedCount}</td>
                  <td>{sentCount}</td>
                  <td>{tauxEnvoi}%</td>
                  <td>{convertedCount}</td>
                  <td>{tauxGlobal}%</td>
                </tr>
              )
            })}
            {stats.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">Aucune campagne à comparer.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
