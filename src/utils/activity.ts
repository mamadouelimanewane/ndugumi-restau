import {
  type ProspectMap,
  type RestaurantMap,
  type CampaignMap,
  type CampaignSendMap,
  type Statut,
} from '../types'

export type ActivityType = 'note' | 'statut_change' | 'campaign_send'

export interface BaseActivity {
  id: string
  date: string // ISO string
  agent: string
  restaurantId: number
  restaurantName: string
  quartier: string
  type: ActivityType
}

export interface NoteActivity extends BaseActivity {
  type: 'note'
  noteType: 'whatsapp' | 'email' | 'appel' | 'visite' | 'autre'
  texte: string
}

export interface StatutActivity extends BaseActivity {
  type: 'statut_change'
  nouveauStatut: Statut
}

export interface CampaignSendActivity extends BaseActivity {
  type: 'campaign_send'
  campaignId: string
  campaignName: string
  canal: 'whatsapp' | 'email'
}

export type ActivityEvent = NoteActivity | StatutActivity | CampaignSendActivity

export function extractActivities(
  restaurants: RestaurantMap,
  prospects: ProspectMap,
  campaigns: CampaignMap,
  campaignSends: CampaignSendMap,
  daysLimit: number = 30
): ActivityEvent[] {
  const events: ActivityEvent[] = []
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysLimit)
  const cutoffMs = cutoffDate.getTime()

  // Extract from prospects (notes & statut changes)
  Object.entries(prospects).forEach(([idStr, crm]) => {
    const restaurantId = parseInt(idStr, 10)
    const restau = restaurants[restaurantId]
    if (!restau) return

    // Notes
    crm.notes.forEach((n, idx) => {
      const d = new Date(n.date)
      if (d.getTime() >= cutoffMs) {
        events.push({
          id: `note-${restaurantId}-${idx}-${d.getTime()}`,
          date: n.date,
          agent: n.agent,
          restaurantId,
          restaurantName: restau.etablissement,
          quartier: restau.quartier,
          type: 'note',
          noteType: n.type,
          texte: n.texte,
        } as NoteActivity)
      }
    })

    // Statut History
    crm.statutHistory?.forEach((sh, idx) => {
      const d = new Date(sh.date)
      if (d.getTime() >= cutoffMs) {
        events.push({
          id: `statut-${restaurantId}-${idx}-${d.getTime()}`,
          date: sh.date,
          agent: sh.agent,
          restaurantId,
          restaurantName: restau.etablissement,
          quartier: restau.quartier,
          type: 'statut_change',
          nouveauStatut: sh.statut,
        } as StatutActivity)
      }
    })
  })

  // Extract from campaign sends
  Object.values(campaignSends).forEach((cs) => {
    const d = new Date(cs.date)
    if (d.getTime() >= cutoffMs) {
      const restau = restaurants[cs.restaurantId]
      const camp = campaigns[cs.campaignId]
      if (!restau || !camp) return

      events.push({
        id: `send-${cs.id}`,
        date: cs.date,
        agent: 'Système', // Campaigns don't record the sender in the current schema
        restaurantId: cs.restaurantId,
        restaurantName: restau.etablissement,
        quartier: restau.quartier,
        type: 'campaign_send',
        campaignId: cs.campaignId,
        campaignName: camp.nom,
        canal: cs.canal,
      } as CampaignSendActivity)
    }
  })

  // Sort descending by date
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return events
}
