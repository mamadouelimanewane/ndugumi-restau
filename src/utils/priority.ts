import type { JoinedProspect } from './joined'
import { isLate } from './joined'
import type { Statut } from '../types'

/**
 * Score de priorité simple et transparent (pas de boîte noire) : plus le score est élevé,
 * plus le prospect mérite une action rapide. Basé sur l'avancement dans le pipeline, la
 * présence d'un contact identifié, la preuve de concept dans le quartier (d'autres clients
 * NDUGUMi actifs à proximité) et l'urgence des relances/tâches en retard.
 */
const STATUT_POINTS: Record<Statut, number> = {
  nouveau: 1,
  contacte: 2,
  interesse: 4,
  rdv: 5,
  negociation: 6,
  signe: 0,
  client_actif: 0,
  client_inactif: -2,
  refuse: -5,
  injoignable: -3,
}

export function computeQuartierDensity(joined: JoinedProspect[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const j of joined) {
    if (j.crm.ndugumi.inscrit) m[j.quartier] = (m[j.quartier] ?? 0) + 1
  }
  return m
}

export function priorityScore(
  j: JoinedProspect,
  quartierDensity: Record<string, number>,
  hasOverdueTask: boolean
): number {
  let score = STATUT_POINTS[j.crm.statut] ?? 0
  if (j.crm.contacts.length > 0) score += 2
  if (!j.crm.ndugumi.inscrit && (quartierDensity[j.quartier] ?? 0) > 0) score += 2
  if (isLate(j.crm.prochaineRelance)) score += 3
  if (hasOverdueTask) score += 3
  score += Math.min(3, j.crm.tags.length)
  return score
}
