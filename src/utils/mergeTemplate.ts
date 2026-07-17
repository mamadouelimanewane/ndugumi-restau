import type { JoinedProspect } from './joined'

export interface MergeContext {
  agent?: string
}

/** Remplace {etablissement} {quartier} {telephone} {agent} par les valeurs réelles du restaurant. */
export function mergeTemplate(text: string, restaurant: JoinedProspect, ctx: MergeContext = {}): string {
  return text
    .replace(/\{etablissement\}/g, restaurant.etablissement)
    .replace(/\{quartier\}/g, restaurant.quartier)
    .replace(/\{telephone\}/g, restaurant.telephone)
    .replace(/\{agent\}/g, ctx.agent || restaurant.crm.agent || 'notre équipe')
}
