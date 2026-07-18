import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import {
  STATUTS,
  STATUT_LABELS,
  STATUT_COLORS,
  INTERACTION_LABELS,
  CLIENT_STATUTS,
  SANTE_LABELS,
  TASK_PRIORITE_LABELS,
  TASK_PRIORITE_COLORS,
  type Statut,
  type InteractionType,
  type TaskPriorite,
  type SanteCompte,
  type Zone,
} from '../types'
import StatutBadge from '../components/StatutBadge'
import PhoneQuickActions from '../components/PhoneQuickActions'
import AttachmentsPanel from '../components/AttachmentsPanel'
import { isLate, joinProspects } from '../utils/joined'
import { computeQuartierDensity } from '../utils/priority'
import { waLinkWithText } from '../utils/phone'
import { mailtoLink } from '../utils/email'
import { exportVisitCardPdf } from '../utils/pdf'
import { fetchAiSummary, fetchAiMessage, fetchAiScore } from '../utils/ai'

export default function ProspectDetail() {
  const { id } = useParams()
  const restaurantId = Number(id)
  const navigate = useNavigate()

  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const tasks = useCrmStore((s) => s.tasks)
  const agents = useCrmStore((s) => s.agents)
  const products = useCrmStore((s) => s.products)
  const currentAgent = useCrmStore((s) => s.currentAgent)
  const merchantPortalUrl = useCrmStore((s) => s.merchantPortalUrl)

  const setStatut = useCrmStore((s) => s.setStatut)
  const setAgent = useCrmStore((s) => s.setAgent)
  const setRelance = useCrmStore((s) => s.setRelance)
  const addNote = useCrmStore((s) => s.addNote)
  const removeNote = useCrmStore((s) => s.removeNote)
  const setTags = useCrmStore((s) => s.setTags)
  const setDeal = useCrmStore((s) => s.setDeal)
  const setNdugumi = useCrmStore((s) => s.setNdugumi)
  const setConcurrent = useCrmStore((s) => s.setConcurrent)
  const updateRestaurant = useCrmStore((s) => s.updateRestaurant)
  const deleteRestaurant = useCrmStore((s) => s.deleteRestaurant)
  const addContact = useCrmStore((s) => s.addContact)
  const updateContact = useCrmStore((s) => s.updateContact)
  const removeContact = useCrmStore((s) => s.removeContact)
  const addTask = useCrmStore((s) => s.addTask)
  const toggleTask = useCrmStore((s) => s.toggleTask)
  const removeTask = useCrmStore((s) => s.removeTask)

  const restaurant = restaurants[restaurantId]
  const crm = prospects[restaurantId]
  const restaurantTasks = useMemo(
    () =>
      Object.values(tasks)
        .filter((t) => t.restaurantId === restaurantId)
        .sort((a, b) => a.dateEcheance.localeCompare(b.dateEcheance)),
    [tasks, restaurantId]
  )

  const quartierDensity = useMemo(
    () => computeQuartierDensity(joinProspects(restaurants, prospects)),
    [restaurants, prospects]
  )

  const [editingInfo, setEditingInfo] = useState(false)
  const [editNom, setEditNom] = useState(restaurant?.etablissement ?? '')
  const [editTel, setEditTel] = useState(restaurant?.telephone ?? '')
  const [editQuartier, setEditQuartier] = useState(restaurant?.quartier ?? '')
  const [editZone, setEditZone] = useState<Zone>(restaurant?.zone ?? 'Dakar intra-muros')

  const [noteType, setNoteType] = useState<InteractionType>('appel')
  const [noteAgent, setNoteAgent] = useState(currentAgent || crm?.agent || agents[0])
  const [noteText, setNoteText] = useState('')

  const [tagInput, setTagInput] = useState('')

  const [contactNom, setContactNom] = useState('')
  const [contactFonction, setContactFonction] = useState('')
  const [contactTel, setContactTel] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPrincipal, setContactPrincipal] = useState(false)

  const [taskTitre, setTaskTitre] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [taskPriorite, setTaskPriorite] = useState<TaskPriorite>('normale')
  const [taskAgent, setTaskAgent] = useState(currentAgent || crm?.agent || agents[0])

  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({})
  const [proposalMessage, setProposalMessage] = useState('')
  const [proposalAgent, setProposalAgent] = useState(currentAgent || crm?.agent || agents[0])

  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null)

  const [aiMessageCanal, setAiMessageCanal] = useState<'whatsapp' | 'email'>('whatsapp')
  const [aiMessageObjectif, setAiMessageObjectif] = useState('')
  const [aiMessageSujet, setAiMessageSujet] = useState('')
  const [aiMessageCorps, setAiMessageCorps] = useState('')
  const [aiMessageLoading, setAiMessageLoading] = useState(false)
  const [aiMessageError, setAiMessageError] = useState<string | null>(null)
  const [aiMessageAgent, setAiMessageAgent] = useState(currentAgent || crm?.agent || agents[0])

  const [aiScore, setAiScore] = useState<{ score: number; raison: string; prochaineAction: string } | null>(null)
  const [aiScoreLoading, setAiScoreLoading] = useState(false)
  const [aiScoreError, setAiScoreError] = useState<string | null>(null)

  if (!restaurant || !crm) {
    return (
      <div className="panel">
        <p>Restaurant introuvable.</p>
        <Link className="btn secondary" to="/prospects">
          Retour à la liste
        </Link>
      </div>
    )
  }

  const isClient = CLIENT_STATUTS.includes(crm.statut)

  function handleAddNote() {
    if (!noteText.trim()) return
    addNote(restaurantId, noteType, noteText.trim(), noteAgent)
    setNoteText('')
  }

  function handleSaveInfo() {
    updateRestaurant(restaurantId, {
      etablissement: editNom.trim() || restaurant.etablissement,
      telephone: editTel.trim() || restaurant.telephone,
      quartier: editQuartier.trim() || restaurant.quartier,
      zone: editZone,
    })
    setEditingInfo(false)
  }

  function handleDelete() {
    if (confirm(`Supprimer définitivement « ${restaurant.etablissement} » du CRM ?`)) {
      deleteRestaurant(restaurantId)
      navigate('/prospects')
    }
  }

  function handleAddTag() {
    const t = tagInput.trim()
    if (!t || crm.tags.includes(t)) return
    setTags(restaurantId, [...crm.tags, t])
    setTagInput('')
  }

  function handleRemoveTag(t: string) {
    setTags(
      restaurantId,
      crm.tags.filter((x) => x !== t)
    )
  }

  function handleAddContact() {
    if (!contactNom.trim()) return
    addContact(restaurantId, {
      nom: contactNom.trim(),
      fonction: contactFonction.trim(),
      telephone: contactTel.trim(),
      email: contactEmail.trim(),
      principal: contactPrincipal,
    })
    setContactNom('')
    setContactFonction('')
    setContactTel('')
    setContactEmail('')
    setContactPrincipal(false)
  }

  function handleAddTask() {
    if (!taskTitre.trim() || !taskDate) return
    addTask(restaurantId, {
      titre: taskTitre.trim(),
      description: taskDesc.trim(),
      dateEcheance: taskDate,
      priorite: taskPriorite,
      agent: taskAgent,
    })
    setTaskTitre('')
    setTaskDesc('')
    setTaskDate('')
  }

  const productList = useMemo(() => Object.values(products).sort((a, b) => a.nom.localeCompare(b.nom)), [products])
  const selectedEntries = productList.filter((p) => (selectedQty[p.id] ?? 0) > 0)
  const proposalTotal = selectedEntries.reduce((acc, p) => acc + p.prixUnitaire * (selectedQty[p.id] ?? 0), 0)

  const proposalPhone = crm.contacts.find((c) => c.principal)?.telephone || restaurant.telephone

  function toggleProduct(id: string) {
    setSelectedQty((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = 1
      return next
    })
  }

  function setProductQty(id: string, qty: number) {
    setSelectedQty((prev) => ({ ...prev, [id]: Math.max(1, qty) }))
  }

  function handleGenerateMessage() {
    if (selectedEntries.length === 0) {
      setProposalMessage('')
      return
    }
    const lines = selectedEntries.map(
      (p) => `• ${p.nom} (${p.unite}) x${selectedQty[p.id]} : ${(p.prixUnitaire * selectedQty[p.id]).toLocaleString('fr-FR')} FCFA`
    )
    const message = [
      `Bonjour, voici notre proposition de produits pour ${restaurant.etablissement} :`,
      '',
      ...lines,
      '',
      `Total estimé : ${proposalTotal.toLocaleString('fr-FR')} FCFA`,
      '',
      "Vous pouvez commander directement ces produits (et bien d'autres) via l'application NDUGUMi. N'hésitez pas à nous contacter pour toute question.",
    ].join('\n')
    setProposalMessage(message)
  }

  function handleSendProposal() {
    if (!proposalMessage.trim()) {
      alert("Générez ou rédigez un message avant d'envoyer.")
      return
    }
    const link = waLinkWithText(proposalPhone, proposalMessage.trim())
    if (!link) {
      alert("Aucun numéro de téléphone exploitable pour ce restaurant (ou son contact principal).")
      return
    }
    window.open(link, '_blank', 'noopener,noreferrer')
    addNote(restaurantId, 'proposition', proposalMessage.trim(), proposalAgent)
  }

  async function handleGenerateSummary() {
    setAiSummaryLoading(true)
    setAiSummaryError(null)
    try {
      const { summary } = await fetchAiSummary({
        etablissement: restaurant.etablissement,
        quartier: restaurant.quartier,
        zone: restaurant.zone,
        statut: STATUT_LABELS[crm.statut],
        agent: crm.agent || 'Non assigné',
        prochaineRelance: crm.prochaineRelance,
        tags: crm.tags,
        notes: crm.notes.map((n) => ({ date: n.date, type: INTERACTION_LABELS[n.type], texte: n.texte })),
        tasks: restaurantTasks
          .filter((t) => t.statut === 'a_faire')
          .map((t) => ({ titre: t.titre, dateEcheance: t.dateEcheance, statut: t.statut })),
        ndugumiInscrit: crm.ndugumi.inscrit,
      })
      setAiSummary(summary)
    } catch (e: any) {
      setAiSummaryError(e?.message || 'Erreur inconnue')
    } finally {
      setAiSummaryLoading(false)
    }
  }

  async function handleGenerateAiMessage() {
    setAiMessageLoading(true)
    setAiMessageError(null)
    try {
      const { sujet, corps } = await fetchAiMessage({
        etablissement: restaurant.etablissement,
        quartier: restaurant.quartier,
        statut: STATUT_LABELS[crm.statut],
        tags: crm.tags,
        canal: aiMessageCanal,
        objectif: aiMessageObjectif.trim(),
        recentNotes: crm.notes.slice(0, 5).map((n) => ({ date: n.date, texte: n.texte })),
      })
      setAiMessageSujet(sujet)
      setAiMessageCorps(corps)
    } catch (e: any) {
      setAiMessageError(e?.message || 'Erreur inconnue')
    } finally {
      setAiMessageLoading(false)
    }
  }

  function handleSendAiMessage() {
    if (!aiMessageCorps.trim()) return
    if (aiMessageCanal === 'whatsapp') {
      const phone = crm.contacts.find((c) => c.principal)?.telephone || restaurant.telephone
      const link = waLinkWithText(phone, aiMessageCorps.trim())
      if (!link) {
        alert('Aucun numéro de téléphone exploitable pour ce restaurant.')
        return
      }
      window.open(link, '_blank', 'noopener,noreferrer')
    } else {
      const email = crm.contacts.find((c) => c.principal && c.email)?.email || crm.contacts.find((c) => c.email)?.email
      if (!email) {
        alert("Aucune adresse email connue pour ce restaurant (ajoutez un contact avec email).")
        return
      }
      const link = mailtoLink(email, aiMessageSujet, aiMessageCorps.trim())
      if (!link) return
      window.open(link, '_blank')
    }
    addNote(restaurantId, aiMessageCanal, aiMessageCorps.trim(), aiMessageAgent)
  }

  async function handleEvaluateScore() {
    setAiScoreLoading(true)
    setAiScoreError(null)
    try {
      const overdueTasks = restaurantTasks.filter((t) => t.statut === 'a_faire' && isLate(t.dateEcheance)).length
      const result = await fetchAiScore({
        etablissement: restaurant.etablissement,
        quartier: restaurant.quartier,
        statut: STATUT_LABELS[crm.statut],
        hasContact: crm.contacts.length > 0,
        tags: crm.tags,
        notes: crm.notes.map((n) => ({ date: n.date, type: INTERACTION_LABELS[n.type], texte: n.texte })),
        overdueTasks,
        overdueRelance: isLate(crm.prochaineRelance),
        quartierClientsCount: quartierDensity[restaurant.quartier] ?? 0,
      })
      setAiScore(result)
    } catch (e: any) {
      setAiScoreError(e?.message || 'Erreur inconnue')
    } finally {
      setAiScoreLoading(false)
    }
  }

  return (
    <div>
      <Link className="link-back" to="/prospects">
        ← Retour à la liste des prospects
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">{restaurant.etablissement}</h1>
          <p className="page-subtitle">
            {restaurant.quartier} · {restaurant.zone}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn secondary" onClick={() => exportVisitCardPdf({ ...restaurant, crm })}>
            Fiche de visite (PDF)
          </button>
          <StatutBadge statut={crm.statut} />
        </div>
      </div>

      <div className="panel">
        <h3>Assistant IA</h3>
        <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: -8, marginBottom: 14 }}>
          Suggestions générées par IA (DeepSeek) — à relire avant d'envoyer ou d'agir, ce n'est pas toujours exact.
        </p>

        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <strong style={{ fontSize: 13 }}>Résumé de la fiche</strong>
            <button className="btn secondary small" onClick={handleGenerateSummary} disabled={aiSummaryLoading}>
              {aiSummaryLoading ? 'Génération…' : 'Générer le résumé'}
            </button>
          </div>
          {aiSummaryError && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{aiSummaryError}</div>}
          {aiSummary && <div className="note-text" style={{ marginTop: 8 }}>{aiSummary}</div>}
        </div>

        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14 }}>
          <strong style={{ fontSize: 13 }}>Message personnalisé</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
            <select value={aiMessageCanal} onChange={(e) => setAiMessageCanal(e.target.value as 'whatsapp' | 'email')}>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>
            <input
              type="text"
              placeholder="Objectif (ex : relancer avec une offre, annoncer une nouveauté…)"
              value={aiMessageObjectif}
              onChange={(e) => setAiMessageObjectif(e.target.value)}
              style={{ flex: '1 1 220px' }}
            />
            <button className="btn secondary small" onClick={handleGenerateAiMessage} disabled={aiMessageLoading}>
              {aiMessageLoading ? 'Génération…' : 'Générer le message'}
            </button>
          </div>
          {aiMessageError && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{aiMessageError}</div>}
          {(aiMessageCorps || aiMessageLoading) && (
            <>
              {aiMessageCanal === 'email' && (
                <div className="field-row">
                  <label>Sujet</label>
                  <input type="text" value={aiMessageSujet} onChange={(e) => setAiMessageSujet(e.target.value)} />
                </div>
              )}
              <div className="field-row">
                <label>Message (modifiable)</label>
                <textarea value={aiMessageCorps} onChange={(e) => setAiMessageCorps(e.target.value)} style={{ minHeight: 100 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={aiMessageAgent} onChange={(e) => setAiMessageAgent(e.target.value)}>
                  {agents.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <button className="btn small" onClick={handleSendAiMessage} disabled={!aiMessageCorps.trim()}>
                  Envoyer via {aiMessageCanal === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </button>
              </div>
            </>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <strong style={{ fontSize: 13 }}>Score de conversion prédictif</strong>
            <button className="btn secondary small" onClick={handleEvaluateScore} disabled={aiScoreLoading}>
              {aiScoreLoading ? 'Évaluation…' : 'Évaluer avec l\'IA'}
            </button>
          </div>
          {aiScoreError && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{aiScoreError}</div>}
          {aiScore && (
            <div style={{ marginTop: 10, display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: aiScore.score >= 60 ? 'var(--ok)' : aiScore.score >= 30 ? 'var(--warn)' : 'var(--danger)',
                  minWidth: 60,
                }}
              >
                {aiScore.score}
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}> / 100</span>
              </div>
              <div style={{ flex: '1 1 220px', fontSize: 12.5 }}>
                <div>{aiScore.raison}</div>
                <div style={{ marginTop: 6, fontWeight: 600 }}>Action suggérée : {aiScore.prochaineAction}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Fiche établissement</h3>
              <button className="btn secondary small" onClick={() => setEditingInfo((v) => !v)}>
                {editingInfo ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {!editingInfo ? (
              <>
                <div className="field-row" style={{ marginTop: 12 }}>
                  <label>Téléphone</label>
                  <div>
                    {restaurant.telephone}
                    <PhoneQuickActions phone={restaurant.telephone} />
                  </div>
                </div>
                <div className="field-row">
                  <label>Quartier / commune</label>
                  <div>{restaurant.quartier}</div>
                </div>
                <div className="field-row">
                  <label>Zone</label>
                  <div>{restaurant.zone}</div>
                </div>
              </>
            ) : (
              <>
                <div className="field-row" style={{ marginTop: 12 }}>
                  <label>Nom / adresse</label>
                  <input type="text" value={editNom} onChange={(e) => setEditNom(e.target.value)} />
                </div>
                <div className="field-row">
                  <label>Téléphone</label>
                  <input type="text" value={editTel} onChange={(e) => setEditTel(e.target.value)} />
                </div>
                <div className="field-row">
                  <label>Quartier / commune</label>
                  <input type="text" value={editQuartier} onChange={(e) => setEditQuartier(e.target.value)} />
                </div>
                <div className="field-row">
                  <label>Zone</label>
                  <select value={editZone} onChange={(e) => setEditZone(e.target.value as Zone)}>
                    <option value="Dakar intra-muros">Dakar intra-muros</option>
                    <option value="Banlieue">Banlieue</option>
                  </select>
                </div>
                <button className="btn small" onClick={handleSaveInfo}>
                  Enregistrer
                </button>
              </>
            )}
          </div>

          <div className="panel">
            <h3>Suivi commercial</h3>
            <div className="field-row">
              <label>Statut</label>
              <select value={crm.statut} onChange={(e) => setStatut(restaurantId, e.target.value as Statut)}>
                {STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {STATUT_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <label>Agent assigné</label>
              <select value={crm.agent || agents[0]} onChange={(e) => setAgent(restaurantId, e.target.value)}>
                {agents.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <label>Prochaine relance</label>
              <input
                type="date"
                value={crm.prochaineRelance ?? ''}
                onChange={(e) => setRelance(restaurantId, e.target.value || null)}
              />
            </div>
            <div className="field-row">
              <label>Concurrence (appli déjà utilisée, le cas échéant)</label>
              <input
                type="text"
                value={crm.concurrentActuel}
                onChange={(e) => setConcurrent(restaurantId, e.target.value)}
                placeholder="Ex : Yassir, Glovo, aucune…"
              />
            </div>
            <div className="field-row" style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
              Créé le {new Date(crm.createdAt).toLocaleDateString('fr-FR')} · dernière mise à jour le{' '}
              {new Date(crm.updatedAt).toLocaleDateString('fr-FR')}
            </div>
          </div>

          <div className="panel">
            <h3>Historique des statuts</h3>
            {crm.statutHistory.map((h, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 0',
                  borderBottom: i < crm.statutHistory.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 12.5,
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: STATUT_COLORS[h.statut],
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 600 }}>{STATUT_LABELS[h.statut]}</span>
                <span style={{ color: 'var(--text-dim)', marginLeft: 'auto' }}>
                  {new Date(h.date).toLocaleString('fr-FR')} · {h.agent}
                </span>
              </div>
            ))}
          </div>

          <div className="panel">
            <h3>Tags</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
              {crm.tags.map((t) => (
                <span key={t} className="zone-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {t}
                  <button
                    onClick={() => handleRemoveTag(t)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, padding: 0 }}
                  >
                    ✕
                  </button>
                </span>
              ))}
              {crm.tags.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Aucun tag</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="Ex : gros volume, chaîne, prioritaire…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                style={{ flex: 1 }}
              />
              <button className="btn secondary small" onClick={handleAddTag}>
                Ajouter
              </button>
            </div>
          </div>

          <div className="panel">
            <h3>Compte NDUGUMi (client mobile)</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={crm.ndugumi.inscrit}
                onChange={(e) =>
                  setNdugumi(restaurantId, {
                    inscrit: e.target.checked,
                    dateInscription: e.target.checked
                      ? crm.ndugumi.dateInscription ?? new Date().toISOString().slice(0, 10)
                      : crm.ndugumi.dateInscription,
                  })
                }
              />
              Utilise l'appli NDUGUMi pour son marché
            </label>
            {crm.ndugumi.inscrit && (
              <>
                <div className="field-row">
                  <label>Date de première commande</label>
                  <input
                    type="date"
                    value={crm.ndugumi.dateInscription ?? ''}
                    onChange={(e) => setNdugumi(restaurantId, { dateInscription: e.target.value || null })}
                  />
                </div>
                <div className="field-row">
                  <label>Numéro de téléphone utilisé sur l'appli (facultatif)</label>
                  <input
                    type="text"
                    value={crm.ndugumi.identifiant}
                    onChange={(e) => setNdugumi(restaurantId, { identifiant: e.target.value })}
                    placeholder="Pour le retrouver dans le suivi des commandes"
                  />
                </div>
              </>
            )}
            <a href={merchantPortalUrl} target="_blank" rel="noopener noreferrer">
              <button className="btn secondary small" type="button">
                Suivre les commandes de ce restaurant ↗
              </button>
            </a>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
              Ouvre le back-office NDUGUMi pour vérifier l'historique de commandes du restaurant.
            </div>
          </div>

          {isClient && (
            <div className="panel">
              <h3>Suivi du compte client</h3>
              <div className="field-row">
                <label>Date de démarrage effectif</label>
                <input
                  type="date"
                  value={crm.deal.dateSignature ?? ''}
                  onChange={(e) => setDeal(restaurantId, { dateSignature: e.target.value || null })}
                />
              </div>
              <div className="field-row">
                <label>Nombre de commandes de marché / mois</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={crm.deal.nombreCommandesMensuel ?? ''}
                  onChange={(e) =>
                    setDeal(restaurantId, {
                      nombreCommandesMensuel: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="Ex : 12"
                />
              </div>
              <div className="field-row">
                <label>Valeur du marché commandé / mois (FCFA, livraison incluse)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={crm.deal.volumeEstimeMensuel ?? ''}
                  onChange={(e) =>
                    setDeal(restaurantId, {
                      volumeEstimeMensuel: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="Ex : 500000"
                />
              </div>
              <div className="field-row">
                <label>Santé du compte</label>
                <select
                  value={crm.deal.santeCompte}
                  onChange={(e) => setDeal(restaurantId, { santeCompte: e.target.value as SanteCompte })}
                >
                  {(Object.keys(SANTE_LABELS) as SanteCompte[]).map((s) => (
                    <option key={s} value={s}>
                      {SANTE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="panel">
            <h3>Zone de danger</h3>
            <button className="btn secondary small" style={{ color: 'var(--danger)' }} onClick={handleDelete}>
              Supprimer cette fiche
            </button>
          </div>
        </div>

        <div>
          <div className="panel">
            <h3>Contacts ({crm.contacts.length})</h3>
            {crm.contacts.map((c) => (
              <div className="note-item" key={c.id} style={{ borderLeftColor: 'var(--primary)' }}>
                <div className="note-meta">
                  <span>
                    <strong>{c.nom}</strong>
                    {c.fonction ? ` · ${c.fonction}` : ''} {c.principal ? '· ⭐ Principal' : ''}
                  </span>
                  <button
                    className="btn secondary small"
                    onClick={() => removeContact(restaurantId, c.id)}
                    style={{ padding: '2px 8px' }}
                  >
                    Supprimer
                  </button>
                </div>
                <div className="note-text">
                  {c.telephone && (
                    <div>
                      Tél : {c.telephone}
                      <PhoneQuickActions phone={c.telephone} />
                    </div>
                  )}
                  {c.email && <div>Email : {c.email}</div>}
                  {!c.principal && (
                    <button
                      className="btn secondary small"
                      style={{ marginTop: 6 }}
                      onClick={() => updateContact(restaurantId, c.id, { principal: true })}
                    >
                      Définir comme contact principal
                    </button>
                  )}
                </div>
              </div>
            ))}
            {crm.contacts.length === 0 && (
              <div className="empty-state">Aucun contact enregistré pour ce restaurant.</div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Nom"
                  value={contactNom}
                  onChange={(e) => setContactNom(e.target.value)}
                  style={{ flex: '1 1 140px' }}
                />
                <input
                  type="text"
                  placeholder="Fonction (gérant, propriétaire…)"
                  value={contactFonction}
                  onChange={(e) => setContactFonction(e.target.value)}
                  style={{ flex: '1 1 140px' }}
                />
                <input
                  type="text"
                  placeholder="Téléphone"
                  value={contactTel}
                  onChange={(e) => setContactTel(e.target.value)}
                  style={{ flex: '1 1 120px' }}
                />
                <input
                  type="text"
                  placeholder="Email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  style={{ flex: '1 1 140px' }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12.5 }}>
                <input
                  type="checkbox"
                  checked={contactPrincipal}
                  onChange={(e) => setContactPrincipal(e.target.checked)}
                />
                Contact principal
              </label>
              <button className="btn small" style={{ marginTop: 8 }} onClick={handleAddContact}>
                Ajouter le contact
              </button>
            </div>
          </div>

          <AttachmentsPanel restaurantId={restaurantId} agent={currentAgent || crm.agent || 'Non assigné'} />

          <div className="panel">
            <h3>Proposer des produits via WhatsApp</h3>
            {productList.length === 0 ? (
              <div className="empty-state">
                Le catalogue est vide. Ajoutez des produits depuis la page « Catalogue produits ».
              </div>
            ) : (
              <>
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: 8 }}>
                  {productList.map((p) => (
                    <div
                      key={p.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12.5 }}
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedQty[p.id]}
                        onChange={() => toggleProduct(p.id)}
                      />
                      <span style={{ flex: 1 }}>
                        {p.nom} <span style={{ color: 'var(--text-dim)' }}>({p.unite}) — {p.prixUnitaire.toLocaleString('fr-FR')} FCFA</span>
                      </span>
                      {selectedQty[p.id] > 0 && (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={selectedQty[p.id]}
                          onChange={(e) => setProductQty(p.id, Number(e.target.value) || 1)}
                          style={{ width: 44, fontSize: 12 }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0', fontSize: 12.5 }}>
                  <span>
                    {selectedEntries.length} produit(s) sélectionné(s) · Total :{' '}
                    <strong>{proposalTotal.toLocaleString('fr-FR')} FCFA</strong>
                  </span>
                  <button className="btn secondary small" onClick={handleGenerateMessage}>
                    Générer le message
                  </button>
                </div>
                <div className="field-row">
                  <label>Message WhatsApp (modifiable)</label>
                  <textarea
                    value={proposalMessage}
                    onChange={(e) => setProposalMessage(e.target.value)}
                    style={{ minHeight: 120 }}
                    placeholder="Cliquez sur « Générer le message » après avoir sélectionné des produits, ou rédigez le vôtre."
                  />
                </div>
                <div className="field-row">
                  <label>Agent</label>
                  <select value={proposalAgent} onChange={(e) => setProposalAgent(e.target.value)}>
                    {agents.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
                  Envoyé au{' '}
                  {crm.contacts.find((c) => c.principal) ? 'contact principal' : 'numéro du restaurant'} :{' '}
                  {proposalPhone}
                </div>
                <button className="btn" onClick={handleSendProposal}>
                  Envoyer via WhatsApp
                </button>
              </>
            )}
          </div>

          <div className="panel">
            <h3>Tâches ({restaurantTasks.filter((t) => t.statut === 'a_faire').length} en cours)</h3>
            {restaurantTasks.map((t) => (
              <div
                className="note-item"
                key={t.id}
                style={{
                  borderLeftColor: TASK_PRIORITE_COLORS[t.priorite],
                  opacity: t.statut === 'fait' ? 0.55 : 1,
                }}
              >
                <div className="note-meta">
                  <span>
                    <strong style={{ textDecoration: t.statut === 'fait' ? 'line-through' : 'none' }}>
                      {t.titre}
                    </strong>{' '}
                    · {TASK_PRIORITE_LABELS[t.priorite]} · {t.agent}
                  </span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button className="btn secondary small" onClick={() => toggleTask(t.id)} style={{ padding: '2px 8px' }}>
                      {t.statut === 'fait' ? 'Rouvrir' : 'Terminer'}
                    </button>
                    <button className="btn secondary small" onClick={() => removeTask(t.id)} style={{ padding: '2px 8px' }}>
                      Supprimer
                    </button>
                  </span>
                </div>
                <div className="note-text">
                  {t.description}
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11.5,
                      color: isLate(t.dateEcheance) && t.statut === 'a_faire' ? 'var(--danger)' : 'var(--text-dim)',
                    }}
                  >
                    Échéance : {t.dateEcheance}
                    {isLate(t.dateEcheance) && t.statut === 'a_faire' ? ' (en retard)' : ''}
                  </div>
                </div>
              </div>
            ))}
            {restaurantTasks.length === 0 && <div className="empty-state">Aucune tâche pour ce restaurant.</div>}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10 }}>
              <div className="field-row">
                <label>Titre</label>
                <input type="text" value={taskTitre} onChange={(e) => setTaskTitre(e.target.value)} placeholder="Ex : Relancer avec offre commission réduite" />
              </div>
              <div className="field-row">
                <label>Description</label>
                <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div className="field-row" style={{ flex: '1 1 140px' }}>
                  <label>Échéance</label>
                  <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
                </div>
                <div className="field-row" style={{ flex: '1 1 120px' }}>
                  <label>Priorité</label>
                  <select value={taskPriorite} onChange={(e) => setTaskPriorite(e.target.value as TaskPriorite)}>
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
              <button className="btn small" onClick={handleAddTask}>
                Créer la tâche
              </button>
            </div>
          </div>

          <div className="panel">
            <h3>Ajouter une interaction</h3>
            <div className="field-row">
              <label>Type</label>
              <select value={noteType} onChange={(e) => setNoteType(e.target.value as InteractionType)}>
                {(Object.keys(INTERACTION_LABELS) as InteractionType[]).map((t) => (
                  <option key={t} value={t}>
                    {INTERACTION_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <label>Agent</label>
              <select value={noteAgent} onChange={(e) => setNoteAgent(e.target.value)}>
                {agents.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <label>Note</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ex : Rendez-vous fixé avec le gérant jeudi 10h, intéressé par la commission à 8%…"
              />
            </div>
            <button className="btn" onClick={handleAddNote}>
              Enregistrer l'interaction
            </button>
          </div>

          <div className="panel">
            <h3>Historique ({crm.notes.length})</h3>
            {crm.notes.length === 0 && <div className="empty-state">Aucune interaction enregistrée pour l'instant.</div>}
            {crm.notes.map((n) => (
              <div className="note-item" key={n.id}>
                <div className="note-meta">
                  <span>
                    <strong>{INTERACTION_LABELS[n.type]}</strong> · {n.agent} ·{' '}
                    {new Date(n.date).toLocaleString('fr-FR')}
                  </span>
                  <button
                    className="btn secondary small"
                    onClick={() => removeNote(restaurantId, n.id)}
                    style={{ padding: '2px 8px' }}
                  >
                    Supprimer
                  </button>
                </div>
                <div className="note-text">{n.texte}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button className="btn secondary" onClick={() => navigate('/prospects')}>
        ← Retour
      </button>
    </div>
  )
}
