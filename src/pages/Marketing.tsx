import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
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

  const quartiers = useMemo(() => {
    const set = new Set(joined.map((j) => j.quartier))
    return Array.from(set).sort()
  }, [joined])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const j of joined) for (const t of j.crm.tags) set.add(t)
    return Array.from(set).sort()
  }, [joined])

  function matchesFilter(j: (typeof joined)[number], f: CampaignFilter): boolean {
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

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Campagne</th>
              <th>Canal</th>
              <th>Ciblés (actuellement)</th>
              <th>Contactés</th>
              <th>Convertis en clients</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {stats.map(({ campaign: c, targetedCount, sentCount, convertedCount }) => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{c.nom}</div>
                  {c.objectif && <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{c.objectif}</div>}
                </td>
                <td>
                  <span className="zone-tag">{CANAL_LABELS[c.canal]}</span>
                </td>
                <td>{targetedCount}</td>
                <td>{sentCount}</td>
                <td>{convertedCount}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <Link to={`/communication?campaignId=${c.id}`}>
                    <button className="btn small">Lancer</button>
                  </Link>
                  <button className="btn secondary small" onClick={() => handleRemove(c)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  Aucune campagne. Créez-en une ci-dessus.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
