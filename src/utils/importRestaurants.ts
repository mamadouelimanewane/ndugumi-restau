import * as XLSX from 'xlsx'
import type { Zone } from '../types'

export interface ImportedRow {
  etablissement: string
  telephone: string
  quartier: string
  zone: Zone
}

export interface ImportResult {
  rows: ImportedRow[]
  skipped: number
  total: number
}

const COMBINING_MARKS = /[̀-ͯ]/g

function normalizeHeader(h: string): string {
  return h.toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '').trim()
}

function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalizeHeader)
  for (const c of candidates) {
    const idx = normalized.indexOf(c)
    if (idx !== -1) return idx
  }
  return -1
}

/**
 * Lit un fichier .csv ou .xlsx (même parseur pour les deux, via SheetJS) et extrait les restaurants.
 * Pour le CSV, passer le texte déjà décodé en UTF-8 (type: 'string') — lire un CSV comme buffer brut
 * fait planter le décodage des accents (SheetJS ne devine pas l'encodage d'un CSV binaire).
 */
export function parseRestaurantsFile(data: ArrayBuffer | string): ImportResult {
  const wb =
    typeof data === 'string'
      ? XLSX.read(data, { type: 'string', raw: true })
      : XLSX.read(data, { type: 'array', raw: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false })

  if (aoa.length === 0) return { rows: [], skipped: 0, total: 0 }

  const headers = (aoa[0] as unknown[]).map((h) => String(h ?? ''))
  const iNom = findColumn(headers, ['etablissement', 'nom', 'restaurant'])
  const iTel = findColumn(headers, ['telephone', 'tel'])
  const iQuartier = findColumn(headers, ['quartier', 'commune'])
  const iZone = findColumn(headers, ['zone'])

  const rows: ImportedRow[] = []
  let skipped = 0

  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r] as unknown[]
    if (!row || row.length === 0) continue
    const nom = iNom !== -1 ? String(row[iNom] ?? '').trim() : ''
    const quartier = iQuartier !== -1 ? String(row[iQuartier] ?? '').trim() : ''
    if (!nom || !quartier) {
      skipped++
      continue
    }
    const telephone = iTel !== -1 ? String(row[iTel] ?? '').trim() : ''
    const zoneRaw = iZone !== -1 ? normalizeHeader(String(row[iZone] ?? '')) : ''
    const zone: Zone = zoneRaw.includes('banlieue') ? 'Banlieue' : 'Dakar intra-muros'
    rows.push({
      etablissement: nom,
      telephone: telephone || 'Non communiqué',
      quartier,
      zone,
    })
  }

  return { rows, skipped, total: aoa.length - 1 }
}
