import { useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
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
import { extractActivities, type ActivityEvent, type NoteActivity, type CampaignSendActivity } from '../utils/activity'

function emptyTemplateDraft(): Omit<MessageTemplate, 'id' | 'createdAt'> {
  return { nom: '', canal: 'whatsapp', sujet: '', corps: '' }
}

export default function Communication() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const agents = useCrmStore((s) => s.agents)
  const currentAgent = useCrmStore((s) => s.currentAgent)
  const templates = useCrmStore((s) => s.templates)
  const campaigns = useCrmStore((s) => s.campaigns)
  const addTemplate = useCrmStore((s) => s.addTemplate)
  const updateTemplate = useCrmStore((s) => s.updateTemplate)
  const removeTemplate = useCrmStore((s) => s.removeTemplate)
  const addNote = useCrmStore((s) => s.addNote)
  const logCampaignSend = useCrmStore((s) => s.logCampaignSend)
  const campaignSends = useCrmStore((s) => s.campaignSends)

  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('campaignId')
  const campaign = campaignId ? campaigns[campaignId] : null

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateDraft, setTemplateDraft] = useState(emptyTemplateDraft())
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [testRestaurantId, setTestRestaurantId] = useState<string>('')

  function insertPlaceholder(placeholder: string) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const newVal = templateDraft.corps.slice(0, start) + placeholder + templateDraft.corps.slice(end)
    setTemplateDraft({ ...templateDraft, corps: newVal })
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + placeholder.length, start + placeholder.length)
    }, 0)
  }

  const [zoneFilter, setZoneFilter] = useState('')
  const [quartierFilter, setQuartierFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState<Statut | ''>('')
  const [tagFilter, setTagFilter] = useState('')
  const [canalFilter, setCanalFilter] = useState<Canal>('whatsapp')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [sendingAgent, setSendingAgent] = useState(currentAgent || agents[0])

  const [activeTab, setActiveTab] = useState<'modeles' | 'scripts' | 'history'>('modeles')
  const [openScript, setOpenScript] = useState<string | null>(null)

  // Filters for History Tab
  const [historyCanalFilter, setHistoryCanalFilter] = useState<'tous' | 'whatsapp' | 'email'>('tous')
  const [historyAgentFilter, setHistoryAgentFilter] = useState('')
  const [historyPeriodeFilter, setHistoryPeriodeFilter] = useState<'7' | '30' | 'tout'>('30')

  const rawActivities = useMemo(() => {
    if (activeTab !== 'history') return []
    const limit = historyPeriodeFilter === '7' ? 7 : historyPeriodeFilter === '30' ? 30 : 99999
    return extractActivities(restaurants, prospects, campaigns, campaignSends, limit)
  }, [activeTab, restaurants, prospects, campaigns, campaignSends, historyPeriodeFilter])

  const filteredHistory = useMemo(() => {
    return rawActivities.filter((a) => {
      // Keep only campaign_send or note with type whatsapp/email
      if (a.type !== 'campaign_send' && !(a.type === 'note' && (a.noteType === 'whatsapp' || a.noteType === 'email'))) {
        return false
      }

      // Canal filter
      const canal = a.type === 'campaign_send' ? (a as CampaignSendActivity).canal : (a as NoteActivity).noteType
      if (historyCanalFilter !== 'tous' && canal !== historyCanalFilter) return false

      // Agent filter
      if (historyAgentFilter && a.agent !== historyAgentFilter) return false

      return true
    })
  }, [rawActivities, historyCanalFilter, historyAgentFilter])

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

  function handleExportCSV() {
    const header = ['Établissement', 'Quartier', 'Zone', 'Téléphone', 'Statut', 'Agent', 'NDUGUMi', 'Tags']
    const rows = filtered.map((j) => [
      j.etablissement,
      j.quartier,
      j.zone,
      j.telephone,
      STATUT_LABELS[j.crm.statut] || j.crm.statut,
      j.crm.agent || '',
      j.crm.ndugumi.inscrit ? 'Oui' : 'Non',
      j.crm.tags.join(', ')
    ])

    const csvContent = [
      header.join(','),
      ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'contacts_ndugumi.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 className="page-title">Communication</h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`btn ${activeTab === 'modeles' ? '' : 'secondary'}`} onClick={() => setActiveTab('modeles')}>
                Modèles WhatsApp/Email
              </button>
              <button className={`btn ${activeTab === 'scripts' ? '' : 'secondary'}`} onClick={() => setActiveTab('scripts')}>
                Scripts d'appel
              </button>
              <button className={`btn ${activeTab === 'history' ? '' : 'secondary'}`} onClick={() => setActiveTab('history')}>
                Historique des envois
              </button>
            </div>
          </div>
          <p className="page-subtitle" style={{ marginTop: 8 }}>
            {campaign ? (
              <>
                Envoi pour la campagne <strong>{campaign.nom}</strong>
              </>
            ) : activeTab === 'modeles' ? (
              'Modèles de message et envoi WhatsApp / Email vers les restaurants'
            ) : activeTab === 'scripts' ? (
              'Scripts conversationnels pour les appels terrain'
            ) : (
              'Historique de vos envois de campagnes et messages individuels'
            )}
          </p>
        </div>
        {activeTab === 'modeles' && (
          <button className="btn" onClick={() => setShowTemplateForm((v) => !v)}>
            {showTemplateForm ? 'Fermer' : '+ Nouveau modèle'}
          </button>
        )}
      </div>

      {activeTab === 'modeles' && showTemplateForm && (
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {['{etablissement}', '{quartier}', '{telephone}', '{agent}'].map((p) => (
                <button key={p} className="btn secondary small" onClick={() => insertPlaceholder(p)}>
                  [{p}]
                </button>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={templateDraft.corps}
              onChange={(e) => setTemplateDraft({ ...templateDraft, corps: e.target.value })}
              style={{ minHeight: 100 }}
            />
            <div
              style={{
                fontSize: 12,
                marginTop: 4,
                color: templateDraft.canal === 'whatsapp' && templateDraft.corps.length > 1000 ? 'var(--danger)' : 'var(--text-dim)',
              }}
            >
              {templateDraft.corps.length} / 1000 caractères
            </div>
          </div>
          <div className="field-row">
            <label>Aperçu du message</label>
            <select
              value={testRestaurantId}
              onChange={(e) => setTestRestaurantId(e.target.value)}
              style={{ marginBottom: 8 }}
            >
              <option value="">Sélectionnez un restaurant pour tester...</option>
              {joined.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.etablissement} ({j.quartier})
                </option>
              ))}
            </select>
            <div
              style={{
                backgroundColor: '#e7ffd7',
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                maxWidth: 400,
              }}
            >
              {testRestaurantId && joined.find((j) => j.id === Number(testRestaurantId))
                ? mergeTemplate(templateDraft.corps, joined.find((j) => j.id === Number(testRestaurantId))!, { agent: sendingAgent })
                : templateDraft.corps}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              Envoyé par {sendingAgent}
            </div>
          </div>
          <button className="btn" onClick={handleSaveTemplate}>
            Enregistrer le modèle
          </button>
        </div>
      )}

      {activeTab === 'modeles' && (
        <>
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
        <div className="filters-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12 }}>
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
          <button className="btn secondary" onClick={handleExportCSV}>
            Exporter contacts CSV
          </button>
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
        </>
      )}

      {activeTab === 'scripts' && (
        <div className="panel">
          <h3>Scripts d'appel</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div 
                style={{ padding: 12, backgroundColor: 'var(--panel)', cursor: 'pointer', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}
                onClick={() => setOpenScript(openScript === 'script1' ? null : 'script1')}
              >
                Script 1 — Premier appel (prospection froide)
                <span>{openScript === 'script1' ? '▲' : '▼'}</span>
              </div>
              {openScript === 'script1' && (
                <div style={{ backgroundColor: '#faf7f2', borderLeft: '3px solid var(--accent)', padding: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  <strong>Objectif : Qualifier en moins de 3 minutes</strong>
                  <br /><br />
                  <strong>[INTRODUCTION — 30 secondes]</strong>
                  <br />
                  « Bonjour, je suis [Prénom] de NDUGUMi. Est-ce que je parle bien au responsable ou au propriétaire ?<br />
                  — Oui : parfait ! / — Non : puis-je lui parler s'il vous plaît ? »
                  <br /><br />
                  <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>En wolof : « Mangi dem ak NDUGUMi — yow mooy borom bi ? »</span>
                  <br /><br />
                  <strong>[ACCROCHE — 30 secondes]</strong>
                  <br />
                  « Nous travaillons avec des restaurants comme le vôtre à [Quartier] pour qu'ils puissent commander leur marché — riz, huile, légumes, poisson — directement depuis leur téléphone, avec livraison incluse dans le prix. »
                  <br /><br />
                  <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>En wolof : « Dañu def application bi ngir restaurants yi dëkk si te jënd nañu yaakaar si xel yi ak livraisoni ci biir prix bi. »</span>
                  <br /><br />
                  <strong>[QUESTION CLÉS — 1 minute]</strong>
                  <br />
                  • « Comment vous approvisionnez-vous en ce moment ? » → écouter attentivement<br />
                  • « C'est quoi votre plus grande difficulté dans vos achats de marché ? »<br />
                  • « Vous êtes à l'aise avec WhatsApp ? »
                  <br /><br />
                  <strong>[CLOSING]</strong>
                  <br />
                  • Si intéressé : « Je peux passer vous voir demain entre 14h et 16h pour une démo de 10 minutes ? »<br />
                  • Si hésitant : « Puis-je vous envoyer quelques infos sur WhatsApp ? »<br />
                  • Si refus : « Pas de problème. Si ça change, nous sommes joignables sur [numéro]. Bonne journée ! »
                </div>
              )}
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div 
                style={{ padding: 12, backgroundColor: 'var(--panel)', cursor: 'pointer', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}
                onClick={() => setOpenScript(openScript === 'script2' ? null : 'script2')}
              >
                Script 2 — Relance après visite sans inscription
                <span>{openScript === 'script2' ? '▲' : '▼'}</span>
              </div>
              {openScript === 'script2' && (
                <div style={{ backgroundColor: '#faf7f2', borderLeft: '3px solid var(--accent)', padding: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  <strong>Objectif : Convertir un prospect intéressé</strong>
                  <br /><br />
                  <strong>[RAPPEL]</strong>
                  <br />
                  « Bonjour [Prénom], c'est [Agent] de NDUGUMi. Je suis passé vous voir [jour] pour vous présenter notre service. »
                  <br /><br />
                  <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>En wolof : « Bonjour, mangi wax [Agent], dém dem ko wax NDUGUMi. »</span>
                  <br /><br />
                  <strong>[RAPPEL DE LA VALEUR]</strong>
                  <br />
                  « Vous m'aviez dit que [rappeler le problème mentionné : temps perdu / prix instables / transport…]. C'est exactement ce que NDUGUMi résout. »
                  <br /><br />
                  <strong>[QUESTION DIRECTE]</strong>
                  <br />
                  « Est-ce que vous avez eu l'occasion de réfléchir à notre proposition ? »
                  <br /><br />
                  <strong>[OBJECTION FRÉQUENTE]</strong>
                  <br />
                  • Prix → « Le prix de livraison est inclus. Calculez ce que vous dépensez en transport en ce moment. »<br />
                  • Habitudes → « Commencez juste avec l'huile et le riz ce mois-ci. »<br />
                  • Pas le temps → « Je peux passer 5 minutes maintenant pour vous inscrire sur place. »
                  <br /><br />
                  <strong>[CLOSING]</strong>
                  <br />
                  « On peut le faire maintenant par téléphone — je guide étape par étape. »
                </div>
              )}
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div 
                style={{ padding: 12, backgroundColor: 'var(--panel)', cursor: 'pointer', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}
                onClick={() => setOpenScript(openScript === 'script3' ? null : 'script3')}
              >
                Script 3 — Réactivation client inactif
                <span>{openScript === 'script3' ? '▲' : '▼'}</span>
              </div>
              {openScript === 'script3' && (
                <div style={{ backgroundColor: '#faf7f2', borderLeft: '3px solid var(--accent)', padding: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  <strong>Objectif : Comprendre le frein et relancer</strong>
                  <br /><br />
                  <strong>[OUVERTURE DOUCE]</strong>
                  <br />
                  « Bonjour [Prénom], c'est [Agent] de NDUGUMi. Je voulais prendre de vos nouvelles — on ne vous a pas vu commander depuis un moment. »
                  <br /><br />
                  <strong>[QUESTION DIAGNOSTIC]</strong>
                  <br />
                  « Est-ce qu'il y a eu un problème avec une livraison, ou est-ce que vous avez trouvé autre chose ? » → écouter sans défendre
                  <br /><br />
                  Causes fréquentes et réponses :<br />
                  • Retard livraison : « Je transmets à notre équipe. On va améliorer ça. »<br />
                  • Prix trop élevé : « Quels produits vous posent problème ? Je regarde ce qu'on peut faire. »<br />
                  • Retour fournisseur habituel : « Et si on vous gardait comme client NDUGUMi juste pour les urgences ? »<br />
                  • Oublié : « On va vous envoyer un rappel WhatsApp chaque semaine — vous voulez essayer ? »
                  <br /><br />
                  <strong>[CLOSING]</strong>
                  <br />
                  « Qu'est-ce qu'il faudrait pour que vous recommandiez une commande cette semaine ? »
                </div>
              )}
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div 
                style={{ padding: 12, backgroundColor: 'var(--panel)', cursor: 'pointer', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}
                onClick={() => setOpenScript(openScript === 'script4' ? null : 'script4')}
              >
                Script 4 — Demande de recommandation (parrainage)
                <span>{openScript === 'script4' ? '▲' : '▼'}</span>
              </div>
              {openScript === 'script4' && (
                <div style={{ backgroundColor: '#faf7f2', borderLeft: '3px solid var(--accent)', padding: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  <strong>Objectif : Obtenir des recommandations de clients satisfaits</strong>
                  <br /><br />
                  <strong>[CONTEXTE]</strong>
                  <br />
                  « Bonjour [Prénom], vous utilisez NDUGUMi depuis [X mois] et ça se passe bien, merci de nous faire confiance ! »
                  <br /><br />
                  <strong>[DEMANDE DIRECTE]</strong>
                  <br />
                  « Est-ce que vous connaissez d'autres restaurants autour de vous qui pourraient être intéressés ? Même dans un autre quartier ? »
                  <br /><br />
                  <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>En wolof : « Dafa am restaurant yépp ci kanam bi wëy ndagam di jënd ci NDUGUMi ? »</span>
                  <br /><br />
                  <strong>[SI OUI]</strong>
                  <br />
                  « Super ! Vous pouvez me donner son numéro, ou bien je peux vous donner notre numéro à lui transmettre directement ? »
                  <br /><br />
                  <strong>[INCENTIVE si applicable]</strong>
                  <br />
                  « Chaque restaurant que vous nous recommandez et qui passe sa première commande, [mentionner l'éventuelle récompense si existante]. »
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="panel">
          <h3>Historique des envois</h3>
          <div className="filters-bar">
            <select value={historyCanalFilter} onChange={(e) => setHistoryCanalFilter(e.target.value as any)}>
              <option value="tous">Tous les canaux</option>
              <option value="whatsapp">WhatsApp uniquement</option>
              <option value="email">Email uniquement</option>
            </select>
            <select value={historyAgentFilter} onChange={(e) => setHistoryAgentFilter(e.target.value)}>
              <option value="">Tous les agents</option>
              {agents.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select value={historyPeriodeFilter} onChange={(e) => setHistoryPeriodeFilter(e.target.value as any)}>
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="tout">Tout l'historique</option>
            </select>
          </div>

          <table className="data-table" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Date & Heure</th>
                <th>Canal</th>
                <th>Établissement</th>
                <th>Agent</th>
                <th>Type d'envoi</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((a) => {
                const dateObj = new Date(a.date)
                const dateFormatted = dateObj.toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })

                const isCampaign = a.type === 'campaign_send'
                const canalStr = isCampaign ? (a as CampaignSendActivity).canal : (a as NoteActivity).noteType
                const isWa = canalStr === 'whatsapp'

                return (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{dateFormatted}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: isWa ? '#d1f4e0' : '#e0e8f5', color: isWa ? '#0f7a3d' : '#3d7ab5' }}>
                        {isWa ? '🟢 WhatsApp' : '✉️ Email'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/prospects/${a.restaurantId}`} style={{ fontWeight: 500, color: 'var(--primary)', textDecoration: 'none' }}>
                        {a.restaurantName}
                      </Link>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{a.quartier}</div>
                    </td>
                    <td>{a.agent}</td>
                    <td>
                      {isCampaign ? (
                        <strong>Campagne : {(a as CampaignSendActivity).campaignName}</strong>
                      ) : (
                        'Envoi individuel'
                      )}
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isCampaign ? (
                        <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Message de campagne</span>
                      ) : (
                        (a as NoteActivity).texte
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    Aucun envoi correspondant à ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
