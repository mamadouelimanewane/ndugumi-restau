export type Zone = 'Dakar intra-muros' | 'Banlieue'

export interface RestaurantSeed {
  id: number
  etablissement: string
  telephone: string
  quartier: string
  zone: Zone
}

export type Statut =
  | 'nouveau'
  | 'contacte'
  | 'interesse'
  | 'rdv'
  | 'negociation'
  | 'signe'
  | 'client_actif'
  | 'client_inactif'
  | 'refuse'
  | 'injoignable'

export const STATUTS: Statut[] = [
  'nouveau',
  'contacte',
  'interesse',
  'rdv',
  'negociation',
  'signe',
  'client_actif',
  'client_inactif',
  'refuse',
  'injoignable',
]

export const STATUT_LABELS: Record<Statut, string> = {
  nouveau: 'À contacter',
  contacte: 'Contacté',
  interesse: 'Intéressé',
  rdv: 'Rendez-vous pris',
  negociation: 'En négociation',
  signe: 'Signé',
  client_actif: 'Client actif',
  client_inactif: 'Client inactif',
  refuse: 'Refusé',
  injoignable: 'Injoignable',
}

export const STATUT_COLORS: Record<Statut, string> = {
  nouveau: '#8a94a6',
  contacte: '#3d7ab5',
  interesse: '#2f9e6f',
  rdv: '#c0793a',
  negociation: '#b8862e',
  signe: '#1f8a4c',
  client_actif: '#0f7a3d',
  client_inactif: '#7a5c3d',
  refuse: '#a63d3d',
  injoignable: '#6b6b6b',
}

export const CLIENT_STATUTS: Statut[] = ['signe', 'client_actif', 'client_inactif']

export type InteractionType = 'appel' | 'visite' | 'whatsapp' | 'email' | 'proposition' | 'autre'

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  appel: 'Appel',
  visite: 'Visite',
  whatsapp: 'WhatsApp',
  email: 'Email',
  proposition: 'Proposition produits',
  autre: 'Autre',
}

export interface Note {
  id: string
  date: string // ISO
  type: InteractionType
  agent: string
  texte: string
}

export interface Contact {
  id: string
  nom: string
  fonction: string
  telephone: string
  email: string
  principal: boolean
}

export type TaskPriorite = 'basse' | 'normale' | 'haute'
export type TaskStatut = 'a_faire' | 'fait'

export const TASK_PRIORITE_LABELS: Record<TaskPriorite, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
}

export const TASK_PRIORITE_COLORS: Record<TaskPriorite, string> = {
  basse: '#8a94a6',
  normale: '#3d7ab5',
  haute: '#a63d3d',
}

export interface Task {
  id: string
  restaurantId: number
  titre: string
  description: string
  dateEcheance: string // yyyy-mm-dd
  statut: TaskStatut
  priorite: TaskPriorite
  agent: string
  createdAt: string
}

export type SanteCompte = 'bonne' | 'a_risque' | 'churn'

export const SANTE_LABELS: Record<SanteCompte, string> = {
  bonne: 'Bonne santé',
  a_risque: 'À risque',
  churn: 'Perdu (churn)',
}

export const SANTE_COLORS: Record<SanteCompte, string> = {
  bonne: '#1f8a4c',
  a_risque: '#b8862e',
  churn: '#a63d3d',
}

export interface DealInfo {
  nombreCommandesMensuel: number | null // fréquence moyenne de commandes de marché/mois
  dateSignature: string | null // yyyy-mm-dd — date de démarrage effectif comme client
  volumeEstimeMensuel: number | null // FCFA — valeur du marché commandé par mois (frais de livraison inclus)
  santeCompte: SanteCompte
}

export function defaultDeal(): DealInfo {
  return {
    nombreCommandesMensuel: null,
    dateSignature: null,
    volumeEstimeMensuel: null,
    santeCompte: 'bonne',
  }
}

export interface NdugumiInfo {
  inscrit: boolean
  dateInscription: string | null // yyyy-mm-dd
  identifiant: string // numéro de téléphone / nom utilisé sur l'appli, pour le retrouver côté NDUGUMi
}

export function defaultNdugumi(): NdugumiInfo {
  return { inscrit: false, dateInscription: null, identifiant: '' }
}

export interface StatutHistoryEntry {
  statut: Statut
  date: string // ISO
  agent: string // agent assigné au moment du changement (proxy — pas d'authentification dans l'outil)
}

export interface ProspectState {
  statut: Statut
  agent: string
  prochaineRelance: string | null // ISO date (yyyy-mm-dd)
  notes: Note[]
  contacts: Contact[]
  tags: string[]
  deal: DealInfo
  ndugumi: NdugumiInfo
  statutHistory: StatutHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export type ProspectMap = Record<number, ProspectState>
export type RestaurantMap = Record<number, RestaurantSeed>
export type TaskMap = Record<string, Task>

export interface Product {
  id: string
  nom: string
  categorie: string
  prixUnitaire: number // FCFA
  unite: string // ex : kg, sac 25kg, carton, litre
  description: string
}

export type ProductMap = Record<string, Product>

export type Canal = 'whatsapp' | 'email'

export const CANAL_LABELS: Record<Canal, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
}

export interface MessageTemplate {
  id: string
  nom: string
  canal: Canal
  sujet: string // utilisé seulement pour email
  corps: string // placeholders : {etablissement} {quartier} {telephone} {agent}
  createdAt: string
}

export type TemplateMap = Record<string, MessageTemplate>

export interface CampaignFilter {
  zone: Zone | ''
  quartier: string
  statut: Statut | ''
  ndugumi: '' | 'oui' | 'non'
  tag: string
}

export function defaultCampaignFilter(): CampaignFilter {
  return { zone: '', quartier: '', statut: '', ndugumi: '', tag: '' }
}

export interface Campaign {
  id: string
  nom: string
  objectif: string
  canal: Canal
  templateId: string | null
  filtre: CampaignFilter
  createdAt: string
}

export type CampaignMap = Record<string, Campaign>

export interface CampaignSend {
  id: string
  campaignId: string
  restaurantId: number
  canal: Canal
  date: string
}

export type CampaignSendMap = Record<string, CampaignSend>

export type UserRole = 'admin' | 'commercial'

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  commercial: 'Commercial',
}

export interface UserProfile {
  nom: string // clé — doit correspondre à une entrée de la liste `agents`
  email: string
  telephone: string
  role: UserRole
  actif: boolean
}

export function defaultUserProfile(nom: string): UserProfile {
  return { nom, email: '', telephone: '', role: 'commercial', actif: true }
}

export type UserProfileMap = Record<string, UserProfile>

export interface Order {
  id: string
  orderId: string
  cartAmount: number
  deliveryCharges: number
  tax: number
  tip: number
  discount: number
  grandTotal: number
  produits: string[]
  marcheNom: string
  marcheTelephone: string
  marcheEmail: string
  clientNom: string
  clientTelephone: string
  clientEmail: string
  livraisonPrevue: string
  statutCommande: string
  creeLe: string // ISO ou "yyyy-mm-dd HH:mm:ss" tel qu'exporté par NDUGUMi
  restaurantId: number | null // rapprochement avec une fiche du CRM (null = non rapproché)
  importedAt: string
}

export type OrderMap = Record<string, Order>
