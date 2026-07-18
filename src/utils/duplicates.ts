import { firstInternationalDigits } from './phone'
import type { RestaurantSeed } from '../types'

/** Retire les marques diacritiques combinantes issues d'une normalisation NFD (ex : "é" → "e" + accent). */
function stripCombiningMarks(s: string): string {
  let out = ''
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0
    if (code >= 0x0300 && code <= 0x036f) continue
    out += ch
  }
  return out
}

function normalizeName(s: string): string {
  return stripCombiningMarks(s.toLowerCase().normalize('NFD'))
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(chez|restaurant|resto|le|la|les|de|du|des|et)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return 0
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(na, nb) / maxLen
}

export interface DuplicateGroup {
  key: string
  reason: 'telephone' | 'nom'
  restaurantIds: number[]
}

/**
 * Détection heuristique, pas un rapprochement garanti : signale les paires à vérifier
 * manuellement (même téléphone = très probable ; nom très similaire dans le même quartier =
 * à vérifier). Ne fusionne ni ne supprime rien automatiquement.
 */
export function findDuplicates(restaurants: RestaurantSeed[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = []

  const byPhone = new Map<string, number[]>()
  for (const r of restaurants) {
    const digits = firstInternationalDigits(r.telephone)
    if (!digits) continue
    if (!byPhone.has(digits)) byPhone.set(digits, [])
    byPhone.get(digits)!.push(r.id)
  }
  for (const [digits, ids] of byPhone) {
    if (ids.length > 1) groups.push({ key: digits, reason: 'telephone', restaurantIds: ids })
  }

  const seen = new Set<string>()
  for (let i = 0; i < restaurants.length; i++) {
    for (let j = i + 1; j < restaurants.length; j++) {
      const a = restaurants[i]
      const b = restaurants[j]
      if (a.quartier !== b.quartier) continue
      const pairKey = [a.id, b.id].sort((x, y) => x - y).join('-')
      if (seen.has(pairKey)) continue
      if (nameSimilarity(a.etablissement, b.etablissement) >= 0.82) {
        seen.add(pairKey)
        groups.push({ key: pairKey, reason: 'nom', restaurantIds: [a.id, b.id] })
      }
    }
  }

  return groups
}
