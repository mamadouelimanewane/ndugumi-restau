import type { ProspectMap, ProspectState, RestaurantMap, RestaurantSeed } from '../types'

export interface JoinedProspect extends RestaurantSeed {
  crm: ProspectState
}

export function joinProspects(restaurants: RestaurantMap, prospects: ProspectMap): JoinedProspect[] {
  return Object.values(restaurants)
    .map((r) => {
      const crm = prospects[r.id]
      if (!crm) return null
      return { ...r, crm }
    })
    .filter((x): x is JoinedProspect => x !== null)
}

/**
 * Les dates stockées sont des chaînes "yyyy-mm-dd" sans fuseau (dates civiles). new Date(string)
 * les interprète comme minuit UTC, ce qui décale d'un jour dès que le fuseau du navigateur est
 * en avance sur UTC. On parse donc manuellement en composantes locales pour éviter ce décalage.
 */
function parseLocalDate(dateISO: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isLate(dateISO: string | null): boolean {
  if (!dateISO) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = parseLocalDate(dateISO)
  return d.getTime() < today.getTime()
}

export function isToday(dateISO: string | null): boolean {
  if (!dateISO) return false
  const today = new Date()
  const d = parseLocalDate(dateISO)
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}
