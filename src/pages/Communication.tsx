import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { waLinkWithText } from '../utils/phone'
import { mailtoLink } from '../utils/email'
import { mergeTemplate } from '../utils/mergeTemplate'
import {
  STATUTS,
  STATUT_LABELS,
  CANAL_LABELS,
  type Statut,
  type Canal,
  type MessageTemplate,
} from '../types'

function emptyTemplateDraft(): Omit<MessageTemplate, 'id' | 'createdAt'> {
  return { nom: '', canal: 'whatsapp', sujet: '', corps: '' }
}

export default function Communication() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const agents = useCrmStore((s) => s.agents)
  const templates = useCrmStore((s) => s.templates)
  const campaigns = useCrmStore((s) => s.campaigns)
  const addTemplate = useCrmStore((s) => s.addTemplate)
  const updateTemplate = useCrmStore((s) => s.updateTemplate)
  const removeTemplate = useCrmStore((s) => s.removeTemplate)
  const addNote = useCrmStore((s) => s.addNote)
  const logCampaignSend = useCrmStore((s) => s.logCampaignSend)

  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('campaignId')
  const campaign = campaignId ? campaigns[campaignId] : null

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateDraft, setTemplateDraft] = useState(emptyTemplateDraft())
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  const [zoneFilter, setZoneFilter] = useState('')
  const [quartierFilter, setQuartierFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState<Statut | ''>('')
  const [tagFilter, setTagFilter] = useState('')
  const [canalFilter, setCanalFilter] = useState<Canal>('whatsapp')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [sendingAgent, setSendingAgent] = useState(agents[0])

  useEffect(() => {
    if (!campaign) return
    setZoneFilter(campaign.filtre.zone)
    setQuartierFilter(campaign.filtre.quartier)
    setStatutFilter(campaign.filtre.statut)
    setTagFilter(campaign.filtre.tag)
    setCanalFilter(campaign.canal)
    if (campaign.templateId) setSelectedTemplateId(campaign.templateId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const templateList = useMemo(
    () => Object.values(templates).sort((a, b) => a.nom.localeCompare(b.nom)),
    [templates]
  )
  const templatesForCanal = templateList.filter((t) => t.canal === canalFilter)
  const selectedTemplate = selectedTemplateId ? templates[selectedTemplateId] : null

  const quartiers = useMemo(() => {
    const set = new Set(joined.map((j) => j.quartier))
    return Array.from(set).sort()
  }, [joined])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const j of joined) for (const t of j.crm.tags) set.add(t)
    return Array.from(set).sort()
  }, [joined])

  const filtered = useMemo(() => {
    return joined.filter((j) => {
      if (zoneFilter && j.zone !== zoneFilter) return false
      if (quartierFilter && j.quartier !== quartierFilter) return false
      if (statutFilter && j.crm.statut !== statutFilter) return false
      if (tagFilter && !j.crm.tags.includes(tagFilter)) return false
      return true
    })
  }, [joined, zoneFilter, quartierFilter, statutFilter, tagFilter])

  function handleSaveTemplate() {
    if (!templateDraft.nom.trim() || !templateDraft.corps.trim()) return
    if (editingTemplateId) {
      updateTemplate(editingTemplateId, templateDraft)
      setEditingTemplateId(null)
    } else {
      addTemplate(templateDraft)
    }
    setTemplateDraft(emptyTemplateDraft())
    setShowTemplateForm(false)
  }

  function startEditTemplate(t: MessageTemplate) {
    setEditingTemplateId(t.id)
    setTemplateDraft({ nom: t.nom, canal: t.canal, sujet: t.sujet, corps: t.corps })
    setShowTemplateForm(true)
  }

  function handleRemoveTemplate(t: MessageTemplate) {
    if (confirm(`Supprimer le modèle « ${t.nom} » ?`)) removeTemplate(t.id)
  }

  function emailTarget(j: (typeof joined)[number]): string | null {
    const principal = j.crm.contacts.find((c) => c.principal && c.email)
    if (principal) return principal.email
    const any = j.crm.contacts.find((c) => c.email)
    return any ? any.email : null
  }

  function handleSendWhatsapp(j: (typeof joined)[number]) {
    const bodyRaw = selectedTemplate ? selectedTemplate.corps : ''
    if (!bodyRaw.trim()) {
      alert('Sélectionnez un modèle WhatsApp avant d\'envoyer.')
      return
    }
    const message = mergeTemplate(bodyRaw, j, { agent: sendingAgent })
    const link = waLinkWithText(j.telephone, message)
    if (!link) {
      alert('Aucun numéro exploitable pour ce restaurant.')
      return
    }
    window.open(link, '_blank', 'noopener,noreferrer')
    addNote(j.id, 'whatsapp', message, sendingAgent)
    if (campaignId) logCampaignSend(campaignId, j.id, 'whatsapp')
  }

  function handleSendEmail(j: (typeof joined)[number]) {
    const email = emailTarget(j)
    if (!email) {
      alert('Aucune adresse email connue pour ce restaurant (ajoutez un contact avec email).')
      return
    }
    if (!selectedTemplate || selectedTemplate.canal !== 'email') {
      alert('Sélectionnez un modèle Email avant d\'envoyer.')
      return
    }
    const subject = mergeTemplate(selectedTemplate.sujet, j, { agent: sendingAgent })
    const body = mergeTemplate(selectedTemplate.corps, j, { agent: sendingAgent })
    const link = mailtoLink(email, subject, body)
    if (!link) return
    window.open(link, '_blank')
    addNote(j.id, 'email', `${subject}\n\n${body}`, sendingAgent)
    if (campaignId) logCampaignSend(campaignId, j.id, 'email')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Communication</h1>
          <p className="page-subtitle">
            {campaign ? (
              <>
                Envoi pour la campagne <strong>{campaign.nom}</strong>
              </>
            ) : (
              'Modèles de message et envoi WhatsApp / Email vers les restaurants'
            )}
          </p>
        </div>
        <button className="btn" onClick={() => setShowTemplateForm((v) => !v)}>
          {showTemplateForm ? 'Fermer' : '+ Nouveau modèle'}
        </button>
      </div>

      {showTemplateForm && (
        <div className="panel">
          <h3>{editingTemplateId ? 'Modifier le modèle' : 'Nouveau modèle'}</h3>
          <div className="field-row">
            <label>Nom</label>
            <input
              type="text"
              value={templateDraft.nom}
              onChange={(e) => setTemplateDraft({ ...templateDraft, nom: e.target.value })}
              placeholder="Ex : Premier contact"
            />
          </div>
          <div className="field-row">
            <label>Canal</label>
            <select
              value={templateDraft.canal}
              onChange={(e) => setTemplateDraft({ ...templateDraft, canal: e.target.value as Canal })}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>
          </div>
          {templateDraft.canal === 'email' && (
            <div className="field-row">
              <label>Sujet</label>
              <input
                type="text"
                value={templateDraft.sujet}
                onChange={(e) => setTemplateDraft({ ...templateDraft, sujet: e.target.value })}
                placeholder="Ex : NDUGUMi — simplifiez le marché de {etablissement}"
              />
            </div>
          )}
          <div className="field-row">
            <label>Message (placeholders : {'{etablissement}'} {'{quartier}'} {'{telephone}'} {'{agent}'})</label>
            <textarea
              value={templateDraft.corps}
              onChange={(e) => setTemplateDraft({ ...templateDraft, corps: e.target.value })}
              style={{ minHeight: 100 }}
            />
          </div>
          <button className="btn" onClick={handleSaveTemplate}>
            Enregistrer le modèle
          </button>
        </div>
      )}

      <div className="panel">
        <h3>Modèles disponibles</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Canal</th>
              <th>Aperçu</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {templateList.map((t) => (
              <tr key={t.id}>
                <td>{t.nom}</td>
                <td>
                  <span className="zone-tag">{CANAL_LABELS[t.canal]}</span>
                </td>
                <td style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{t.corps.slice(0, 70)}…</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn secondary small" onClick={() => startEditTemplate(t)}>
                    Modifier
                  </button>
                  <button className="btn secondary small" onClick={() => handleRemoveTemplate(t)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {templateList.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  Aucun modèle. Créez-en un ci-dessus.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Envoyer</h3>
        <div className="filters-bar">
          <select value={canalFilter} onChange={(e) => { setCanalFilter(e.target.value as Canal); setSelectedTemplateId('') }}>
            <option value="whatsapp">Canal : WhatsApp</option>
            <option value="email">Canal : Email</option>
          </select>
          <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
            <option value="">Choisir un modèle…</option>
            {templatesForCanal.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </select>
          <select value={sendingAgent} onChange={(e) => setSendingAgent(e.target.value)}>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
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
        </div>

        {selectedTemplate && (
          <div className="note-item" style={{ marginBottom: 12 }}>
            <div className="note-meta">
              <strong>Aperçu du modèle « {selectedTemplate.nom} »</strong>
            </div>
            <div className="note-text">{selectedTemplate.corps}</div>
          </div>
        )}

        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          {filtered.length} restaurant(s) correspondent à ces filtres. Cliquez WhatsApp ou Email sur chaque
          ligne pour envoyer individuellement (chaque envoi ouvre l'application correspondante et s'enregistre
          dans l'historique du restaurant).
        </p>

        <table className="data-table">
          <thead>
            <tr>
              <th>Établissement</th>
              <th>Quartier</th>
              <th>Contact</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((j) => (
              <tr key={j.id}>
                <td>{j.etablissement}</td>
                <td>{j.quartier}</td>
                <td style={{ fontSize: 12 }}>
                  {j.telephone}
                  {emailTarget(j) && <div>{emailTarget(j)}</div>}
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn small" onClick={() => handleSendWhatsapp(j)} disabled={canalFilter !== 'whatsapp'}>
                    WhatsApp
                  </button>
                  <button
                    className="btn small"
                    onClick={() => handleSendEmail(j)}
                    disabled={canalFilter !== 'email' || !emailTarget(j)}
                  >
                    Email
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  Aucun restaurant ne correspond à ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>
            Affichage limité aux 100 premiers résultats — affinez les filtres pour cibler plus précisément.
          </div>
        )}
      </div>
    </div>
  )
}
