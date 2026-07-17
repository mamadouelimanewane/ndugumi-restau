import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  defaultDeal,
  defaultNdugumi,
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

function makeDefaultState(): ProspectState {
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
    createdAt: now,
    updatedAt: now,
  }
}

export const DEFAULT_AGENTS = ['Non assigné', 'Mamadou', 'Astou', 'Cheikh', 'Fatou', 'Ibrahima']

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

  ensureAll: () => void

  // Restaurants (fiche établissement)
  addRestaurant: (data: Omit<RestaurantSeed, 'id'>) => number
  updateRestaurant: (id: number, fields: Partial<Omit<RestaurantSeed, 'id'>>) => void
  deleteRestaurant: (id: number) => void

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

  // Agents
  addAgentName: (name: string) => void
  removeAgentName: (name: string) => void
  setQuota: (agent: string, target: number | null) => void

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

      ensureAll: () => {
        const state = get()
        let changedR = false
        let changedP = false
        const nextR: RestaurantMap = { ...state.restaurants }
        const nextP: ProspectMap = { ...state.prospects }
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
        if (changedR || changedP) set({ restaurants: nextR, prospects: nextP })
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
      },

      setStatut: (id, statut) => {
        set((s) => {
          const existing = s.prospects[id] ?? makeDefaultState()
          const entry: StatutHistoryEntry = {
            statut,
            date: todayISO(),
            agent: existing.agent || 'Non assigné',
          }
          return {
            prospects: {
              ...s.prospects,
              [id]: {
                ...existing,
                statut,
                statutHistory: [entry, ...existing.statutHistory],
                updatedAt: todayISO(),
              },
            },
          }
        })
      },

      setAgent: (id, agent) => {
        set((s) => ({
          prospects: {
            ...s.prospects,
            [id]: { ...(s.prospects[id] ?? makeDefaultState()), agent, updatedAt: todayISO() },
          },
        }))
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
      },

      setMerchantPortalUrl: (url) => set({ merchantPortalUrl: url }),

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
        set((s) => (s.agents.includes(trimmed) ? s : { agents: [...s.agents, trimmed] }))
      },

      removeAgentName: (name) => {
        set((s) => ({ agents: s.agents.filter((a) => a !== name) }))
      },

      setQuota: (agent, target) => {
        set((s) => {
          const quotas = { ...s.quotas }
          if (target === null || Number.isNaN(target)) delete quotas[agent]
          else quotas[agent] = target
          return { quotas }
        })
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
        }),
    }),
    {
      name: 'restau-crm-storage',
      version: 6,
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
        }
      },
    }
  )
)
