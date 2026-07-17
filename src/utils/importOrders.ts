import * as XLSX from 'xlsx'
import type { Order, RestaurantMap, ProspectMap } from '../types'
import { firstInternationalDigits } from './phone'

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function findColumn(headers: string[], candidate: string): number {
  const normalized = headers.map(normalizeHeader)
  return normalized.indexOf(candidate)
}

function num(raw: string | undefined): number {
  if (!raw) return 0
  const m = raw.match(/([\d]+(?:[.,]\d+)?)/)
  if (!m) return 0
  return parseFloat(m[1].replace(',', '.')) || 0
}

function extractField(text: string, label: string): string {
  const re = new RegExp(label.replace(/\s+/g, '\\s*') + '\\s*:\\s*XOF\\s*([\\d.,]*)', 'i')
  const m = text.match(re)
  return m ? m[1] : ''
}

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

export interface ParsedOrdersResult {
  orders: Omit<Order, 'id' | 'importedAt'>[]
  skipped: number
  total: number
}

/** Parse le reporting de commandes NDUGUMi exporté en .csv ou .xlsx (colonnes multi-lignes). */
export function parseOrdersFile(data: ArrayBuffer | string): ParsedOrdersResult {
  // raw:true empêche SheetJS de convertir les dates ("2026-07-15 00:01:29") en numéros de série
  // Excel — sans quoi Deliver on / Created at deviennent inexploitables tels quels.
  const wb =
    typeof data === 'string'
      ? XLSX.read(data, { type: 'string', raw: true })
      : XLSX.read(data, { type: 'array', raw: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false })
  if (aoa.length === 0) return { orders: [], skipped: 0, total: 0 }

  const headers = (aoa[0] as unknown[]).map((h) => String(h ?? ''))
  const iOrderId = findColumn(headers, 'orderid')
  const iPayment = findColumn(headers, 'paymentdetails')
  const iProducts = findColumn(headers, 'productdetails')
  const iStore = findColumn(headers, 'storedetails')
  const iUser = findColumn(headers, 'userdetails')
  const iDeliverOn = findColumn(headers, 'deliveron')
  const iStatus = findColumn(headers, 'currentstatus')
  const iCreatedAt = findColumn(headers, 'createdat')

  const orders: Omit<Order, 'id' | 'importedAt'>[] = []
  let skipped = 0

  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r] as unknown[]
    if (!row || row.length === 0) continue
    const orderId = iOrderId !== -1 ? String(row[iOrderId] ?? '').trim() : ''
    if (!orderId) {
      skipped++
      continue
    }

    const paymentText = iPayment !== -1 ? String(row[iPayment] ?? '') : ''
    const productsText = iProducts !== -1 ? String(row[iProducts] ?? '') : ''
    const storeText = iStore !== -1 ? String(row[iStore] ?? '') : ''
    const userText = iUser !== -1 ? String(row[iUser] ?? '') : ''

    const storeLines = lines(storeText)
    const userLines = lines(userText)
    const produits = lines(productsText).map((l) => l.replace(/,\s*$/, ''))

    orders.push({
      orderId,
      cartAmount: num(extractField(paymentText, 'Cart Amount')),
      deliveryCharges: num(extractField(paymentText, 'Delivery Charges')),
      tax: num(extractField(paymentText, 'Tax')),
      tip: num(extractField(paymentText, 'Tip')),
      discount: num(extractField(paymentText, 'Discount')),
      grandTotal: num(extractField(paymentText, 'Grand Total')),
      produits,
      marcheNom: storeLines[0] ?? '',
      marcheTelephone: storeLines[1] ?? '',
      marcheEmail: storeLines[2] ?? '',
      clientNom: userLines[0] ?? '',
      clientTelephone: userLines[1] ?? '',
      clientEmail: userLines[2] ?? '',
      livraisonPrevue: iDeliverOn !== -1 ? String(row[iDeliverOn] ?? '').trim() : '',
      statutCommande: iStatus !== -1 ? String(row[iStatus] ?? '').trim() : '',
      creeLe: iCreatedAt !== -1 ? String(row[iCreatedAt] ?? '').trim() : '',
      restaurantId: null,
    })
  }

  return { orders, skipped, total: aoa.length - 1 }
}

/**
 * Tente de rapprocher chaque commande à une fiche restaurant existante, par téléphone
 * (client, ou marché) puis par le "identifiant" NDUGUMi renseigné manuellement sur la fiche.
 * Ne modifie rien d'autre — le rapprochement reste proposé, à valider par l'utilisateur.
 */
export function matchOrderToRestaurant(
  order: Pick<Order, 'clientTelephone' | 'marcheTelephone'>,
  restaurants: RestaurantMap,
  prospects: ProspectMap
): number | null {
  const clientDigits = firstInternationalDigits(order.clientTelephone)
  const marcheDigits = firstInternationalDigits(order.marcheTelephone)

  for (const r of Object.values(restaurants)) {
    const crm = prospects[r.id]
    if (!crm) continue
    const restaurantDigits = firstInternationalDigits(r.telephone)
    const identifiantDigits = crm.ndugumi.identifiant ? firstInternationalDigits(crm.ndugumi.identifiant) : null
    const contactDigits = crm.contacts.map((c) => firstInternationalDigits(c.telephone)).filter(Boolean)

    if (clientDigits && (clientDigits === restaurantDigits || clientDigits === identifiantDigits || contactDigits.includes(clientDigits))) {
      return r.id
    }
    if (marcheDigits && marcheDigits === restaurantDigits) {
      return r.id
    }
  }
  return null
}
