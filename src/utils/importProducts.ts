import * as XLSX from 'xlsx'

export interface ImportedProductRow {
  nom: string
  categorie: string
  prixUnitaire: number
  unite: string
  description: string
  origine: string
  fournisseur: string
}

export interface ImportProductsResult {
  rows: ImportedProductRow[]
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
 * Lit un fichier .csv ou .xlsx (même parseur, via SheetJS) et extrait les produits catalogue.
 * Colonnes reconnues (insensibles à la casse/accents) : nom/produit, categorie, prix/prix unitaire,
 * unite, description, origine/provenance, fournisseur. Seuls nom + prix (> 0) sont obligatoires.
 */
export function parseProductsFile(data: ArrayBuffer | string): ImportProductsResult {
  const wb =
    typeof data === 'string'
      ? XLSX.read(data, { type: 'string', raw: true })
      : XLSX.read(data, { type: 'array', raw: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false })

  if (aoa.length === 0) return { rows: [], skipped: 0, total: 0 }

  const headers = (aoa[0] as unknown[]).map((h) => String(h ?? ''))
  const iNom = findColumn(headers, ['nom', 'produit', 'nom du produit'])
  const iCategorie = findColumn(headers, ['categorie', 'categorie du produit'])
  const iPrix = findColumn(headers, ['prix', 'prix unitaire', 'prix unitaire (fcfa)', 'prix fcfa'])
  const iUnite = findColumn(headers, ['unite', "unite de vente"])
  const iDescription = findColumn(headers, ['description'])
  const iOrigine = findColumn(headers, ['origine', 'provenance'])
  const iFournisseur = findColumn(headers, ['fournisseur', 'grossiste'])

  const rows: ImportedProductRow[] = []
  let skipped = 0

  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r] as unknown[]
    if (!row || row.length === 0) continue
    const nom = iNom !== -1 ? String(row[iNom] ?? '').trim() : ''
    const prixRaw = iPrix !== -1 ? row[iPrix] : undefined
    const prixUnitaire = typeof prixRaw === 'number' ? prixRaw : Number(String(prixRaw ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'))
    if (!nom || !Number.isFinite(prixUnitaire) || prixUnitaire <= 0) {
      skipped++
      continue
    }
    rows.push({
      nom,
      categorie: iCategorie !== -1 ? String(row[iCategorie] ?? '').trim() : '',
      prixUnitaire,
      unite: iUnite !== -1 ? String(row[iUnite] ?? '').trim() || 'unité' : 'unité',
      description: iDescription !== -1 ? String(row[iDescription] ?? '').trim() : '',
      origine: iOrigine !== -1 ? String(row[iOrigine] ?? '').trim() : '',
      fournisseur: iFournisseur !== -1 ? String(row[iFournisseur] ?? '').trim() : '',
    })
  }

  return { rows, skipped, total: aoa.length - 1 }
}
