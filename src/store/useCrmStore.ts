import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabaseStorage } from '../utils/supabaseStorage'
import restaurantsSeed from '../data/restaurants.json'
import {
  type RestaurantSeed,
  type RestaurantMap,
  type ProspectMap,
  type ProspectState,
  type Statut,
  type Note,
  type InteractionType,
  type Contact,
  type Task,
  type TaskMap,
  type TaskPriorite,
  type DealInfo,
  type NdugumiInfo,
  type StatutHistoryEntry,
  type Product,
  type ProductMap,
  type MessageTemplate,
  type TemplateMap,
  type Campaign,
  type CampaignMap,
  type CampaignSend,
  type CampaignSendMap,
  type Canal,
  type UserProfile,
  type UserProfileMap,
  type Order,
  type OrderMap,
  type Attachment,
  type AttachmentKind,
  type AuditEntry,
  type Segment,
  type SegmentMap,
  type SegmentFilter,
  STATUT_LABELS,
  defaultDeal,
  defaultNdugumi,
  defaultUserProfile,
  defaultRestockInfo,
  defaultReferralInfo,
  type RestockInfo,
  type ReferralInfo,
  type DirectWhatsAppMessage,
  type VisualQuote,
  type AgentGoal,
} from '../types'

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'riz-25kg', nom: 'Riz brisé parfumé', categorie: 'Céréales', prixUnitaire: 15000, unite: 'sac 25kg', description: '' },
  { id: 'huile-20l', nom: "Huile végétale", categorie: 'Huiles', prixUnitaire: 22000, unite: 'bidon 20L', description: '' },
  { id: 'oignon-25kg', nom: 'Oignon', categorie: 'Légumes', prixUnitaire: 9000, unite: 'sac 25kg', description: '' },
  { id: 'pdt-25kg', nom: 'Pomme de terre', categorie: 'Légumes', prixUnitaire: 10000, unite: 'sac 25kg', description: '' },
  { id: 'tomate-conc', nom: 'Concentré de tomate', categorie: 'Épicerie', prixUnitaire: 8500, unite: 'carton (24 boîtes)', description: '' },
  { id: 'sucre-50kg', nom: 'Sucre', categorie: 'Épicerie', prixUnitaire: 27000, unite: 'sac 50kg', description: '' },
  { id: 'poulet-carton', nom: 'Poulet entier congelé', categorie: 'Viandes & volailles', prixUnitaire: 32000, unite: 'carton (10 pièces)', description: '' },
  { id: 'poisson-caisse', nom: 'Poisson (thiof/yaboy selon arrivage)', categorie: 'Poissons', prixUnitaire: 18000, unite: 'caisse', description: '' },
  { id: 'gaz-12kg', nom: 'Bouteille de gaz', categorie: 'Combustible', prixUnitaire: 6500, unite: 'bouteille 12kg', description: '' },
  { id: 'eau-pack', nom: 'Eau minérale', categorie: 'Boissons', prixUnitaire: 2500, unite: 'pack de 12', description: '' },
]

function makeDefaultProducts(): ProductMap {
  const m: ProductMap = {}
  for (const p of DEFAULT_PRODUCTS) m[p.id] = p
  return m
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'wa-premier-contact',
    nom: 'Premier contact',
    canal: 'whatsapp',
    sujet: '',
    corps:
      "Bonjour, je suis {agent} de NDUGUMi. Nous aidons les restaurants de {quartier} à faire leur marché plus simplement, via notre application mobile, avec livraison. Auriez-vous 5 minutes pour en discuter ?",
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'wa-relance',
    nom: 'Relance sans réponse',
    canal: 'whatsapp',
    sujet: '',
    corps:
      "Bonjour, je me permets de revenir vers vous au sujet de NDUGUMi pour {etablissement}. Souhaitez-vous qu'on fixe un moment pour en discuter cette semaine ?",
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'email-presentation',
    nom: 'Présentation NDUGUMi',
    canal: 'email',
    sujet: 'NDUGUMi — simplifiez le marché de {etablissement}',
    corps:
      "Bonjour,\n\nJe vous contacte au sujet de NDUGUMi, l'application qui permet aux restaurants de {quartier} de commander leurs produits de marché (riz, huile, légumes, viandes...) directement depuis leur téléphone, avec livraison.\n\nJe reste à votre disposition pour vous présenter le service.\n\nCordialement,\n{agent}",
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'wa-apres-visite',
    nom: 'Après visite — sans inscription',
    canal: 'whatsapp',
    sujet: '',
    corps:
      "Bonjour, c'est {agent} de NDUGUMi.\nMerci pour notre échange de ce jour.\n\nNDUGUMi vous permet de commander vos produits de marché (riz, huile, oignon, poisson...) depuis votre téléphone, avec livraison incluse 🚚\n\nPour essayer gratuitement : ndugumi.com\n\nJe repasserai vous voir prochainement 🙏",
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'wa-relance-7j',
    nom: 'Relance 7 jours — sans réponse',
    canal: 'whatsapp',
    sujet: '',
    corps:
      "Bonjour, je me permets de revenir vers vous pour NDUGUMi — {etablissement}.\n\nPlusieurs restaurants de {quartier} ont commencé à utiliser notre service ce mois-ci et sont très satisfaits.\n\nSouhaitez-vous qu'on fixe 10 minutes cette semaine pour une démonstration rapide ?",
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'wa-apres-livraison',
    nom: 'Après 1ère livraison réussie',
    canal: 'whatsapp',
    sujet: '',
    corps:
      "Bonjour ! J'espère que votre commande NDUGUMi s'est bien passée 😊\n\nN'hésitez pas à me dire si tout était bien — qualité, délai, quantités reçues.\n\nEt dès que vous avez besoin de réapprovisionner, pensez à NDUGUMi ! 🛒\n— {agent}",
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

function makeDefaultTemplates(): TemplateMap {
  const m: TemplateMap = {}
  for (const t of DEFAULT_TEMPLATES) m[t.id] = t
  return m
}

export const DEFAULT_MERCHANT_PORTAL_URL = 'https://admin.ndugumi.com/merchant/admin/ndugalma/login'

const SEED = restaurantsSeed as RestaurantSeed[]

function todayISO(): string {
  return new Date().toISOString()
}

function makeDefaultState(id = 0): ProspectState {
  const now = todayISO()
  return {
    statut: 'nouveau',
    agent: '',
    prochaineRelance: null,
    notes: [],
    contacts: [],
    tags: [],
    deal: defaultDeal(),
    ndugumi: defaultNdugumi(),
    statutHistory: [{ statut: 'nouveau', date: now, agent: 'Non assigné' }],
    attachments: [],
    concurrentActuel: '',
    restock: defaultRestockInfo(),
    referral: defaultReferralInfo(id),
    createdAt: now,
    updatedAt: now,
  }
}

const MAX_AUDIT_ENTRIES = 3000

export const DEFAULT_AGENTS = ['Non assigné', 'Mamadou', 'Astou', 'Cheikh', 'Fatou', 'Ibrahima']

function makeDefaultUserProfiles(): UserProfileMap {
  const m: UserProfileMap = {}
  for (const a of DEFAULT_AGENTS) {
    if (a === 'Non assigné') continue
    m[a] = defaultUserProfile(a)
  }
  m['Mamadou'] = { ...m['Mamadou'], role: 'admin' }
  return m
}

export interface CrmBackup {
  restaurants: RestaurantMap
  prospects: ProspectMap
  tasks: TaskMap
  agents: string[]
  merchantPortalUrl: string
  quotas: Record<string, number>
  products: ProductMap
  templates: TemplateMap
  campaigns: CampaignMap
  campaignSends: CampaignSendMap
  userProfiles: UserProfileMap
  currentAgent: string | null
  orders: OrderMap
  auditLog: AuditEntry[]
  segments: SegmentMap
  settings: Record<string, boolean>
  exportedAt: string
}

interface CrmStore {
  restaurants: RestaurantMap
  prospects: ProspectMap
  tasks: TaskMap
  agents: string[]
  merchantPortalUrl: string
  quotas: Record<string, number>
  products: ProductMap
  templates: TemplateMap
  campaigns: CampaignMap
  campaignSends: CampaignSendMap
  userProfiles: UserProfileMap
  currentAgent: string | null
  orders: OrderMap
  auditLog: AuditEntry[]
  segments: SegmentMap
  settings: Record<string, boolean>
  directWhatsAppMessages: Record<string, DirectWhatsAppMessage>
  visualQuotes: Record<string, VisualQuote>
  agentGoals: Record<string, AgentGoal>

  ensureAll: () => void

  // WhatsApp Direct API Cloud
  sendDirectWhatsAppMessage: (restaurantId: number, texte: string, agent: string, direction?: 'sortant' | 'entrant') => void

  // Devis Visuels WhatsApp
  addVisualQuote: (data: Omit<VisualQuote, 'id' | 'createdAt'>) => string

  // Coordonnées GPS & Navigation
  updateGpsCoords: (id: number, lat: number, lng: number) => void

  // Réapprovisionnement prédictif
  updateRestockInfo: (id: number, fields: Partial<RestockInfo>) => void

  // Parrainage B2B
  setParrain: (filleulId: number, parrainId: number) => void

  // Gamification & Objectifs Agents
  setAgentGoal: (agent: string, fields: Partial<AgentGoal>) => void

  // Restaurants (fiche établissement)
  addRestaurant: (data: Omit<RestaurantSeed, 'id'>) => number
  updateRestaurant: (id: number, fields: Partial<Omit<RestaurantSeed, 'id'>>) => void
  deleteRestaurant: (id: number) => void
  deleteRestaurants: (ids: number[]) => void

  // Suivi commercial
  setStatut: (id: number, statut: Statut) => void
  setAgent: (id: number, agent: string) => void
  setRelance: (id: number, date: string | null) => void
  setTags: (id: number, tags: string[]) => void
  setDeal: (id: number, deal: Partial<DealInfo>) => void
  setNdugumi: (id: number, fields: Partial<NdugumiInfo>) => void
  setMerchantPortalUrl: (url: string) => void

  // Notes / interactions
  addNote: (id: number, type: InteractionType, texte: string, agent: string) => void
  removeNote: (id: number, noteId: string) => void

  // Contacts
  addContact: (id: number, contact: Omit<Contact, 'id'>) => void
  updateContact: (id: number, contactId: string, fields: Partial<Contact>) => void
  removeContact: (id: number, contactId: string) => void

  // Tasks (agenda global)
  addTask: (restaurantId: number, data: {
    titre: string
    description: string
    dateEcheance: string
    priorite: TaskPriorite
    agent: string
  }) => void
  toggleTask: (taskId: string) => void
  removeTask: (taskId: string) => void

  // Agents / utilisateurs
  addAgentName: (name: string) => void
  removeAgentName: (name: string) => void
  setQuota: (agent: string, target: number | null) => void
  setUserProfile: (nom: string, fields: Partial<Omit<UserProfile, 'nom'>>) => void
  setCurrentAgent: (nom: string | null) => void
  setAiScore: (id: number, score: number) => void

  // Commandes NDUGUMi (import de reporting)
  importOrders: (matches: (Omit<Order, 'id' | 'importedAt'> & { restaurantId: number | null })[]) => { imported: number; skipped: number }
  setOrderRestaurant: (orderId: string, restaurantId: number | null) => void
  // API & Webhooks
  receiveWebhookEvent: (payload: any) => { success: boolean; message: string }
  setSetting: (key: string, value: boolean) => void

  // Concurrence
  setConcurrent: (id: number, concurrentActuel: string) => void

  // Pièces jointes (métadonnées — les blobs vivent dans IndexedDB, voir utils/attachmentsDb.ts)
  addAttachmentMeta: (id: number, kind: AttachmentKind, nom: string, type: string, taille: number, agent: string) => string
  removeAttachmentMeta: (id: number, attachmentId: string) => void

  // Journal d'audit
  logAudit: (restaurantId: number, agent: string, action: string, details: string) => void

  // Segments (filtres sauvegardés)
  addSegment: (nom: string, filtre: SegmentFilter) => string
  removeSegment: (id: string) => void

  // Catalogue produits
  addProduct: (data: Omit<Product, 'id'>) => void
  updateProduct: (id: string, fields: Partial<Omit<Product, 'id'>>) => void
  removeProduct: (id: string) => void

  // Templates de communication (WhatsApp / Email)
  addTemplate: (data: Omit<MessageTemplate, 'id' | 'createdAt'>) => void
  updateTemplate: (id: string, fields: Partial<Omit<MessageTemplate, 'id'>>) => void
  removeTemplate: (id: string) => void

  // Campagnes marketing
  addCampaign: (data: Omit<Campaign, 'id' | 'createdAt'>) => string
  updateCampaign: (id: string, fields: Partial<Omit<Campaign, 'id'>>) => void
  removeCampaign: (id: string) => void
  logCampaignSend: (campaignId: string, restaurantId: number, canal: Canal) => void

  // Sauvegarde / restauration
  getBackup: () => CrmBackup
  restoreBackup: (data: CrmBackup) => void

  resetAll: () => void
}

export const useCrmStore = create<CrmStore>()(
  persist(
    (set, get) => ({
      restaurants: {},
      prospects: {},
      tasks: {},
      agents: DEFAULT_AGENTS,
      merchantPortalUrl: DEFAULT_MERCHANT_PORTAL_URL,
      quotas: {},
      products: makeDefaultProducts(),
      templates: makeDefaultTemplates(),
      campaigns: {},
      campaignSends: {},
      userProfiles: makeDefaultUserProfiles(),
      currentAgent: null,
      orders: {},
      auditLog: [],
      segments: {},
      settings: {},
      directWhatsAppMessages: {},
      visualQuotes: {},
      agentGoals: {},

      sendDirectWhatsAppMessage: (restaurantId, texte, agent, direction = 'sortant') => {
        const id = 'wa_' + crypto.randomUUID()
        const msg: DirectWhatsAppMessage = {
          id,
          restaurantId,
          agent,
          direction,
          texte,
          statut: 'lu',
          date: todayISO(),
        }
        set((s) => ({ directWhatsAppMessages: { ...s.directWhatsAppMessages, [id]: msg } }))
        get().addNote(restaurantId, 'whatsapp', `[WhatsApp Direct API] ${texte}`, agent)
      },

      addVisualQuote: (data) => {
        const id = 'quote_' + crypto.randomUUID()
        const quote: VisualQuote = { ...data, id, createdAt: todayISO() }
        set((s) => ({ visualQuotes: { ...s.visualQuotes, [id]: quote } }))
        get().addNote(data.restaurantId, 'proposition', `[Devis Visuel WhatsApp] ${data.items.length} produit(s) · Total: ${data.total.toLocaleString()} FCFA`, data.agent)
        return id
      },

      updateGpsCoords: (id, lat, lng) => {
        set((s) => {
          const rest = s.restaurants[id]
          if (!rest) return s
          return { restaurants: { ...s.restaurants, [id]: { ...rest, exactLat: lat, exactLng: lng } } }
        })
        get().logAudit(id, get().currentAgent || 'Système', 'GPS mis à jour', `Latitude: ${lat.toFixed(5)}, Longitude: ${lng.toFixed(5)}`)
      },

      updateRestockInfo: (id, fields) => {
        set((s) => {
          const pr = s.prospects[id] || makeDefaultState(id)
          const currentRestock = pr.restock || defaultRestockInfo()
          return {
            prospects: {
              ...s.prospects,
              [id]: { ...pr, restock: { ...currentRestock, ...fields }, updatedAt: todayISO() },
            },
          }
        })
      },

      setParrain: (filleulId, parrainId) => {
        set((s) => {
          const pr = s.prospects[filleulId] || makeDefaultState(filleulId)
          const ref = pr.referral || defaultReferralInfo(filleulId)
          return {
            prospects: {
              ...s.prospects,
              [filleulId]: { ...pr, referral: { ...ref, parrainId }, updatedAt: todayISO() },
            },
          }
        })
        get().logAudit(filleulId, get().currentAgent || 'Système', 'Parrainage B2B', `Affecté au parrain ID #${parrainId}`)
      },

      setAgentGoal: (agent, fields) => {
        set((s) => {
          const current = s.agentGoals[agent] || { agent, objectifSignaturesMensuel: 5, objectifVisitesHebdo: 20, objectifCaMensuel: 1500000 }
          return { agentGoals: { ...s.agentGoals, [agent]: { ...current, ...fields } } }
        })
      },

      logAudit: (restaurantId, agent, action, details) => {
        const entry: AuditEntry = { id: crypto.randomUUID(), restaurantId, date: todayISO(), agent, action, details }
        set((s) => {
          const next = [entry, ...s.auditLog]
          return { auditLog: next.length > MAX_AUDIT_ENTRIES ? next.slice(0, MAX_AUDIT_ENTRIES) : next }
        })
      },

      ensureAll: () => {
        const state = get()
        let changedR = false
        let changedP = false
        let changedA = false
        const nextR: RestaurantMap = { ...state.restaurants }
        const nextP: ProspectMap = { ...state.prospects }
        const newAuditLogs: AuditEntry[] = []

        for (const r of SEED) {
          if (!nextR[r.id]) {
            nextR[r.id] = r
            changedR = true
          }
          if (!nextP[r.id]) {
            nextP[r.id] = makeDefaultState()
            changedP = true
          }
        }

        // Automation: auto_churn_risk
        if (state.settings['auto_churn_risk']) {
          const now = Date.now()
          const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000

          const latestOrderByRestau: Record<number, number> = {}
          for (const o of Object.values(state.orders)) {
            if (o.restaurantId !== null) {
              const time = new Date(o.creeLe.replace(' ', 'T')).getTime()
              if (!Number.isNaN(time)) {
                latestOrderByRestau[o.restaurantId] = Math.max(latestOrderByRestau[o.restaurantId] || 0, time)
              }
            }
          }

          for (const [idStr, p] of Object.entries(nextP)) {
            const id = Number(idStr)
            if (p.statut === 'client_actif' && p.deal.santeCompte === 'bonne') {
              const transitionToActif = p.statutHistory.find((h) => h.statut === 'client_actif')?.date
              const lastActivity = latestOrderByRestau[id] || new Date(transitionToActif || p.createdAt).getTime()
              if (now - lastActivity > FOURTEEN_DAYS) {
                nextP[id] = { ...p, deal: { ...p.deal, santeCompte: 'a_risque' } }
                changedP = true
                changedA = true
                newAuditLogs.push({
                  id: crypto.randomUUID(),
                  restaurantId: id,
                  date: todayISO(),
                  agent: 'Système (Auto)',
                  action: 'Santé modifiée',
                  details: 'Bonne santé → À risque (Aucune commande > 14 jours)',
                })
              }
            }
          }
        }

        if (changedR || changedP) {
          if (changedA) {
            set({
              restaurants: nextR,
              prospects: nextP,
              auditLog: [...newAuditLogs, ...state.auditLog].slice(0, MAX_AUDIT_ENTRIES),
            })
          } else {
            set({ restaurants: nextR, prospects: nextP })
          }
        }
      },

      addRestaurant: (data) => {
        const state = get()
        const ids = Object.keys(state.restaurants).map(Number)
        const nextId = ids.length ? Math.max(...ids) + 1 : 1
        const restaurant: RestaurantSeed = { id: nextId, ...data }
        set((s) => ({
          restaurants: { ...s.restaurants, [nextId]: restaurant },
          prospects: { ...s.prospects, [nextId]: makeDefaultState() },
        }))
        return nextId
      },

      updateRestaurant: (id, fields) => {
        set((s) => {
          const existing = s.restaurants[id]
          if (!existing) return s
          return { restaurants: { ...s.restaurants, [id]: { ...existing, ...fields } } }
        })
      },

      deleteRestaurant: (id) => {
        const nom = get().restaurants[id]?.etablissement ?? `#${id}`
        const agent = get().prospects[id]?.agent || 'Non assigné'
        set((s) => {
          const restaurants = { ...s.restaurants }
          const prospects = { ...s.prospects }
          delete restaurants[id]
          delete prospects[id]
          const tasks = Object.fromEntries(
            Object.entries(s.tasks).filter(([, t]) => t.restaurantId !== id)
          )
          return { restaurants, prospects, tasks }
        })
        get().logAudit(id, agent, 'Restaurant supprimé', nom)
      },

      deleteRestaurants: (ids) => {
        const idSet = new Set(ids)
        const agent = get().currentAgent || 'Non assigné'
        set((s) => {
          const restaurants = { ...s.restaurants }
          const prospects = { ...s.prospects }
          for (const id of ids) {
            delete restaurants[id]
            delete prospects[id]
          }
          const tasks = Object.fromEntries(
            Object.entries(s.tasks).filter(([, t]) => !idSet.has(t.restaurantId))
          )
          return { restaurants, prospects, tasks }
        })
        for (const id of ids) {
          get().logAudit(id, agent, 'Suppression en masse', `Restaurant #${id} supprimé via sélection groupe`)
        }
      },

      setStatut: (id, statut) => {
        const existing = get().prospects[id] ?? makeDefaultState()
        const previousStatut = existing.statut
        set((s) => {
          const current = s.prospects[id] ?? makeDefaultState()
          const entry: StatutHistoryEntry = {
            statut,
            date: todayISO(),
            agent: current.agent || 'Non assigné',
          }
          return {
            prospects: {
              ...s.prospects,
              [id]: {
                ...current,
                statut,
                statutHistory: [entry, ...current.statutHistory],
                updatedAt: todayISO(),
              },
            },
          }
        })
        if (previousStatut !== statut) {
          get().logAudit(id, existing.agent || 'Non assigné', 'Statut changé', `${previousStatut} → ${statut}`)
          
          // Automation: auto_task_on_signe
          if (statut === 'signe' && get().settings['auto_task_on_signe']) {
             const j2 = new Date()
             j2.setDate(j2.getDate() + 2)
             get().addTask(id, {
               titre: 'Appel de bienvenue',
               description: "Souhaiter la bienvenue au nouveau client et vérifier que tout se passe bien.",
               dateEcheance: j2.toISOString().split('T')[0],
               priorite: 'haute',
               agent: existing.agent || 'Non assigné'
             })
          }
        }
      },

      setAgent: (id, agent) => {
        const existing = get().prospects[id] ?? makeDefaultState()
        const previousAgent = existing.agent || 'Non assigné'
        set((s) => ({
          prospects: {
            ...s.prospects,
            [id]: { ...(s.prospects[id] ?? makeDefaultState()), agent, updatedAt: todayISO() },
          },
        }))
        if (previousAgent !== (agent || 'Non assigné')) {
          get().logAudit(id, agent || 'Non assigné', 'Agent réassigné', `${previousAgent} → ${agent || 'Non assigné'}`)
        }
      },

      setRelance: (id, date) => {
        set((s) => ({
          prospects: {
            ...s.prospects,
            [id]: {
              ...(s.prospects[id] ?? makeDefaultState()),
              prochaineRelance: date,
              updatedAt: todayISO(),
            },
          },
        }))
      },

      setTags: (id, tags) => {
        set((s) => ({
          prospects: {
            ...s.prospects,
            [id]: { ...(s.prospects[id] ?? makeDefaultState()), tags, updatedAt: todayISO() },
          },
        }))
      },

      setDeal: (id, deal) => {
        set((s) => {
          const existing = s.prospects[id] ?? makeDefaultState()
          return {
            prospects: {
              ...s.prospects,
              [id]: { ...existing, deal: { ...existing.deal, ...deal }, updatedAt: todayISO() },
            },
          }
        })
        const agent = get().prospects[id]?.agent || 'Non assigné'
        get().logAudit(id, agent, 'Compte client modifié', Object.keys(deal).join(', '))
      },

      setNdugumi: (id, fields) => {
        set((s) => {
          const existing = s.prospects[id] ?? makeDefaultState()
          return {
            prospects: {
              ...s.prospects,
              [id]: { ...existing, ndugumi: { ...existing.ndugumi, ...fields }, updatedAt: todayISO() },
            },
          }
        })
        const agent = get().prospects[id]?.agent || 'Non assigné'
        get().logAudit(id, agent, 'Compte NDUGUMi modifié', Object.keys(fields).join(', '))
      },

      setMerchantPortalUrl: (url) => set({ merchantPortalUrl: url }),

      setConcurrent: (id, concurrentActuel) => {
        set((s) => ({
          prospects: {
            ...s.prospects,
            [id]: { ...(s.prospects[id] ?? makeDefaultState()), concurrentActuel, updatedAt: todayISO() },
          },
        }))
      },

      addAttachmentMeta: (id, kind, nom, type, taille, agent) => {
        const attachment: Attachment = { id: crypto.randomUUID(), kind, nom, type, taille, agent, createdAt: todayISO() }
        set((s) => {
          const existing = s.prospects[id] ?? makeDefaultState()
          return {
            prospects: {
              ...s.prospects,
              [id]: { ...existing, attachments: [attachment, ...existing.attachments], updatedAt: todayISO() },
            },
          }
        })
        get().logAudit(id, agent, 'Pièce jointe ajoutée', nom)
        return attachment.id
      },

      removeAttachmentMeta: (id, attachmentId) => {
        set((s) => {
          const existing = s.prospects[id]
          if (!existing) return s
          return {
            prospects: {
              ...s.prospects,
              [id]: { ...existing, attachments: existing.attachments.filter((a) => a.id !== attachmentId) },
            },
          }
        })
      },

      addSegment: (nom, filtre) => {
        const id = crypto.randomUUID()
        const segment: Segment = { id, nom, filtre, createdAt: todayISO() }
        set((s) => ({ segments: { ...s.segments, [id]: segment } }))
        return id
      },

      removeSegment: (id) => {
        set((s) => {
          const segments = { ...s.segments }
          delete segments[id]
          return { segments }
        })
      },

      addNote: (id, type, texte, agent) => {
        const note: Note = { id: crypto.randomUUID(), date: todayISO(), type, agent, texte }
        set((s) => {
          const existing = s.prospects[id] ?? makeDefaultState()
          return {
            prospects: {
              ...s.prospects,
              [id]: { ...existing, notes: [note, ...existing.notes], updatedAt: todayISO() },
            },
          }
        })
      },

      removeNote: (id, noteId) => {
        set((s) => {
          const existing = s.prospects[id]
          if (!existing) return s
          return {
            prospects: {
              ...s.prospects,
              [id]: { ...existing, notes: existing.notes.filter((n) => n.id !== noteId) },
            },
          }
        })
      },

      addContact: (id, contact) => {
        const newContact: Contact = { id: crypto.randomUUID(), ...contact }
        set((s) => {
          const existing = s.prospects[id] ?? makeDefaultState()
          return {
            prospects: {
              ...s.prospects,
              [id]: { ...existing, contacts: [...existing.contacts, newContact], updatedAt: todayISO() },
            },
          }
        })
      },

      updateContact: (id, contactId, fields) => {
        set((s) => {
          const existing = s.prospects[id]
          if (!existing) return s
          return {
            prospects: {
              ...s.prospects,
              [id]: {
                ...existing,
                contacts: existing.contacts.map((c) => (c.id === contactId ? { ...c, ...fields } : c)),
                updatedAt: todayISO(),
              },
            },
          }
        })
      },

      removeContact: (id, contactId) => {
        set((s) => {
          const existing = s.prospects[id]
          if (!existing) return s
          return {
            prospects: {
              ...s.prospects,
              [id]: { ...existing, contacts: existing.contacts.filter((c) => c.id !== contactId) },
            },
          }
        })
      },

      addTask: (restaurantId, data) => {
        const task: Task = {
          id: crypto.randomUUID(),
          restaurantId,
          titre: data.titre,
          description: data.description,
          dateEcheance: data.dateEcheance,
          statut: 'a_faire',
          priorite: data.priorite,
          agent: data.agent,
          createdAt: todayISO(),
        }
        set((s) => ({ tasks: { ...s.tasks, [task.id]: task } }))
      },

      toggleTask: (taskId) => {
        set((s) => {
          const t = s.tasks[taskId]
          if (!t) return s
          return {
            tasks: {
              ...s.tasks,
              [taskId]: { ...t, statut: t.statut === 'a_faire' ? 'fait' : 'a_faire' },
            },
          }
        })
      },

      removeTask: (taskId) => {
        set((s) => {
          const tasks = { ...s.tasks }
          delete tasks[taskId]
          return { tasks }
        })
      },

      addAgentName: (name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        set((s) =>
          s.agents.includes(trimmed)
            ? s
            : {
                agents: [...s.agents, trimmed],
                userProfiles: { ...s.userProfiles, [trimmed]: defaultUserProfile(trimmed) },
              }
        )
      },

      removeAgentName: (name) => {
        set((s) => {
          const userProfiles = { ...s.userProfiles }
          delete userProfiles[name]
          return {
            agents: s.agents.filter((a) => a !== name),
            userProfiles,
            currentAgent: s.currentAgent === name ? null : s.currentAgent,
          }
        })
      },

      setQuota: (agent, target) => {
        set((s) => {
          const quotas = { ...s.quotas }
          if (target === null || Number.isNaN(target)) delete quotas[agent]
          else quotas[agent] = target
          return { quotas }
        })
      },

      setUserProfile: (nom, fields) => {
        set((s) => {
          const existing = s.userProfiles[nom] ?? defaultUserProfile(nom)
          return { userProfiles: { ...s.userProfiles, [nom]: { ...existing, ...fields } } }
        })
      },

      setCurrentAgent: (nom) => set({ currentAgent: nom }),

      setAiScore: (id, score) => {
        set((s) => ({
          prospects: {
            ...s.prospects,
            [id]: { ...(s.prospects[id] ?? makeDefaultState()), aiScore: score },
          },
        }))
      },

      receiveWebhookEvent: (payload: any) => {
        try {
          const type = payload.type
          if (type === 'order.created') {
            const orderData = payload.data
            if (!orderData || !orderData.orderId) return { success: false, message: 'Invalid order payload' }
            get().importOrders([orderData])
            return { success: true, message: `Order ${orderData.orderId} processed via webhook` }
          }
          if (type === 'restaurant.signed') {
            const { phone, name } = payload.data
            if (!phone) return { success: false, message: 'Missing phone number' }
            const { restaurants, prospects, setStatut } = get()
            const match = Object.values(restaurants).find((r) => r.telephone === phone)
            if (match && prospects[match.id]) {
              setStatut(match.id, 'signe')
              return { success: true, message: `Restaurant ${match.etablissement} marked as signed via webhook` }
            }
            return { success: false, message: 'Restaurant not found in CRM' }
          }
          return { success: false, message: 'Unknown event type' }
        } catch (e: any) {
          return { success: false, message: e.message }
        }
      },

      importOrders: (newOrders) => {
        const state = get()
        const existingOrderIds = new Set(Object.values(state.orders).map((o) => o.orderId))
        let imported = 0
        let skipped = 0
        const additions: OrderMap = {}
        const prospectsUpdates: ProspectMap = {}
        const newAuditLogs: AuditEntry[] = []

        for (const o of newOrders) {
          if (existingOrderIds.has(o.orderId)) {
            skipped++
            continue
          }
          const id = crypto.randomUUID()
          additions[id] = { ...o, id, importedAt: todayISO() }
          existingOrderIds.add(o.orderId)
          imported++

          // Automation: auto_client_actif
          if (state.settings['auto_client_actif'] && o.restaurantId !== null) {
            const p = state.prospects[o.restaurantId]
            if (p && p.statut !== 'client_actif' && p.statut !== 'client_inactif') {
              const pUpdate = prospectsUpdates[o.restaurantId] ?? { ...p }
              pUpdate.statut = 'client_actif'
              pUpdate.statutHistory = [
                { statut: 'client_actif', date: todayISO(), agent: 'Système Automatique' },
                ...pUpdate.statutHistory,
              ]
              prospectsUpdates[o.restaurantId] = pUpdate
              newAuditLogs.push({
                id: crypto.randomUUID(),
                restaurantId: o.restaurantId,
                date: todayISO(),
                agent: 'Système (Auto)',
                action: 'Statut changé',
                details: `${STATUT_LABELS[p.statut] || p.statut} → Client actif (Nouvelle commande importée)`,
              })
            }
          }
        }

        if (imported > 0) {
          set((s) => ({
            orders: { ...s.orders, ...additions },
            prospects: { ...s.prospects, ...prospectsUpdates },
            auditLog: [...newAuditLogs, ...s.auditLog].slice(0, MAX_AUDIT_ENTRIES),
          }))
        }
        return { imported, skipped }
      },

      setOrderRestaurant: (id, restaurantId) => {
        set((s) => {
          const existing = s.orders[id]
          if (!existing) return s
          return { orders: { ...s.orders, [id]: { ...existing, restaurantId } } }
        })
      },

      setSetting: (key, value) => {
        set((s) => ({ settings: { ...s.settings, [key]: value } }))
      },

      addProduct: (data) => {
        const id = crypto.randomUUID()
        const product: Product = { id, ...data }
        set((s) => ({ products: { ...s.products, [id]: product } }))
      },

      updateProduct: (id, fields) => {
        set((s) => {
          const existing = s.products[id]
          if (!existing) return s
          return { products: { ...s.products, [id]: { ...existing, ...fields } } }
        })
      },

      removeProduct: (id) => {
        set((s) => {
          const products = { ...s.products }
          delete products[id]
          return { products }
        })
      },

      addTemplate: (data) => {
        const id = crypto.randomUUID()
        const template: MessageTemplate = { id, createdAt: todayISO(), ...data }
        set((s) => ({ templates: { ...s.templates, [id]: template } }))
      },

      updateTemplate: (id, fields) => {
        set((s) => {
          const existing = s.templates[id]
          if (!existing) return s
          return { templates: { ...s.templates, [id]: { ...existing, ...fields } } }
        })
      },

      removeTemplate: (id) => {
        set((s) => {
          const templates = { ...s.templates }
          delete templates[id]
          return { templates }
        })
      },

      addCampaign: (data) => {
        const id = crypto.randomUUID()
        const campaign: Campaign = { id, createdAt: todayISO(), ...data }
        set((s) => ({ campaigns: { ...s.campaigns, [id]: campaign } }))
        return id
      },

      updateCampaign: (id, fields) => {
        set((s) => {
          const existing = s.campaigns[id]
          if (!existing) return s
          return { campaigns: { ...s.campaigns, [id]: { ...existing, ...fields } } }
        })
      },

      removeCampaign: (id) => {
        set((s) => {
          const campaigns = { ...s.campaigns }
          delete campaigns[id]
          const campaignSends = Object.fromEntries(
            Object.entries(s.campaignSends).filter(([, cs]) => cs.campaignId !== id)
          )
          return { campaigns, campaignSends }
        })
      },

      logCampaignSend: (campaignId, restaurantId, canal) => {
        const id = crypto.randomUUID()
        const send: CampaignSend = { id, campaignId, restaurantId, canal, date: todayISO() }
        set((s) => ({ campaignSends: { ...s.campaignSends, [id]: send } }))
      },

      getBackup: () => {
        const s = get()
        return {
          restaurants: s.restaurants,
          prospects: s.prospects,
          tasks: s.tasks,
          agents: s.agents,
          merchantPortalUrl: s.merchantPortalUrl,
          quotas: s.quotas,
          products: s.products,
          templates: s.templates,
          campaigns: s.campaigns,
          campaignSends: s.campaignSends,
          userProfiles: s.userProfiles,
          currentAgent: s.currentAgent,
          orders: s.orders,
          auditLog: s.auditLog,
          segments: s.segments,
          settings: s.settings,
          exportedAt: todayISO(),
        }
      },

      restoreBackup: (data) => {
        set({
          restaurants: data.restaurants ?? {},
          prospects: data.prospects ?? {},
          tasks: data.tasks ?? {},
          agents: data.agents ?? DEFAULT_AGENTS,
          merchantPortalUrl: data.merchantPortalUrl ?? DEFAULT_MERCHANT_PORTAL_URL,
          quotas: data.quotas ?? {},
          products: data.products ?? makeDefaultProducts(),
          templates: data.templates ?? makeDefaultTemplates(),
          campaigns: data.campaigns ?? {},
          campaignSends: data.campaignSends ?? {},
          userProfiles: data.userProfiles ?? makeDefaultUserProfiles(),
          currentAgent: data.currentAgent ?? null,
          orders: data.orders ?? {},
          auditLog: data.auditLog ?? [],
          segments: data.segments ?? {},
          settings: data.settings ?? {},
        })
      },

      resetAll: () =>
        set({
          prospects: {},
          restaurants: {},
          tasks: {},
          agents: DEFAULT_AGENTS,
          merchantPortalUrl: DEFAULT_MERCHANT_PORTAL_URL,
          quotas: {},
          products: makeDefaultProducts(),
          templates: makeDefaultTemplates(),
          campaigns: {},
          campaignSends: {},
          userProfiles: makeDefaultUserProfiles(),
          currentAgent: null,
          orders: {},
          auditLog: [],
          segments: {},
          settings: {},
        }),
    }),
    {
      name: 'restau-crm-storage',
      storage: createJSONStorage(() => supabaseStorage),
      version: 8,
      migrate: (persisted: any) => {
        if (!persisted) return persisted
        const prospects: ProspectMap = persisted.prospects ?? {}
        const fixed: ProspectMap = {}
        for (const [id, p] of Object.entries(prospects)) {
          fixed[Number(id)] = {
            ...p,
            contacts: p.contacts ?? [],
            tags: p.tags ?? [],
            deal: p.deal ?? defaultDeal(),
            ndugumi: p.ndugumi ?? defaultNdugumi(),
            statutHistory: p.statutHistory ?? [
              { statut: p.statut ?? 'nouveau', date: p.createdAt ?? todayISO(), agent: p.agent || 'Non assigné' },
            ],
            attachments: p.attachments ?? [],
            concurrentActuel: p.concurrentActuel ?? '',
          }
        }
        return {
          ...persisted,
          prospects: fixed,
          restaurants: persisted.restaurants ?? {},
          tasks: persisted.tasks ?? {},
          agents: persisted.agents ?? DEFAULT_AGENTS,
          merchantPortalUrl: persisted.merchantPortalUrl ?? DEFAULT_MERCHANT_PORTAL_URL,
          quotas: persisted.quotas ?? {},
          products: persisted.products ?? makeDefaultProducts(),
          templates: persisted.templates ?? makeDefaultTemplates(),
          campaigns: persisted.campaigns ?? {},
          campaignSends: persisted.campaignSends ?? {},
          userProfiles: persisted.userProfiles ?? makeDefaultUserProfiles(),
          currentAgent: persisted.currentAgent ?? null,
          orders: persisted.orders ?? {},
          auditLog: persisted.auditLog ?? [],
          segments: persisted.segments ?? {},
          settings: persisted.settings ?? {},
        }
      },
    }
  )
)
