import * as XLSX from 'xlsx'
import { STATUT_LABELS, SANTE_LABELS } from '../types'
import type { JoinedProspect } from './joined'

function sheetName(name: string): string {
  // Excel sheet names: max 31 chars, no : \ / ? * [ ]
  return name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31)
}

function autoWidth(rows: (string | number)[][], header: string[]) {
  return header.map((h, i) => {
    const longest = rows.reduce((max, r) => {
      const v = r[i]
      const len = v === null || v === undefined ? 0 : String(v).length
      return Math.max(max, len)
    }, h.length)
    return { wch: Math.min(Math.max(longest + 2, 10), 60) }
  })
}

function buildAndDownload(header: string[], rows: (string | number)[][], sheet: string, filename: string) {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  ws['!cols'] = autoWidth(rows, header)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName(sheet))
  XLSX.writeFile(wb, filename)
}

export function exportProspectsXlsx(joined: JoinedProspect[], filenamePrefix = 'restau-crm-prospects') {
  const header = [
    'Établissement',
    'Téléphone',
    'Quartier',
    'Zone',
    'Statut',
    'Agent',
    'Prochaine relance',
    'Tags',
    'Date de démarrage',
    'Commandes de marché / mois',
    'Volume estimé mensuel (FCFA)',
    'Santé du compte',
    "Nombre d'interactions",
    'Inscrit NDUGUMi',
    "Date d'inscription NDUGUMi",
  ]
  const rows: (string | number)[][] = joined.map((j) => [
    j.etablissement,
    j.telephone,
    j.quartier,
    j.zone,
    STATUT_LABELS[j.crm.statut],
    j.crm.agent || 'Non assigné',
    j.crm.prochaineRelance ?? '',
    j.crm.tags.join(', '),
    j.crm.deal.dateSignature ?? '',
    j.crm.deal.nombreCommandesMensuel ?? '',
    j.crm.deal.volumeEstimeMensuel ?? '',
    SANTE_LABELS[j.crm.deal.santeCompte],
    j.crm.notes.length,
    j.crm.ndugumi.inscrit ? 'Oui' : 'Non',
    j.crm.ndugumi.dateInscription ?? '',
  ])
  buildAndDownload(header, rows, 'Prospects', `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportClientsXlsx(clients: JoinedProspect[]) {
  const header = [
    'Client',
    'Quartier',
    'Téléphone',
    'Commandes / mois',
    'Volume mensuel (FCFA)',
    'Santé du compte',
    'Compte NDUGUMi actif',
    'Date de démarrage',
  ]
  const rows: (string | number)[][] = clients.map((j) => [
    j.etablissement,
    j.quartier,
    j.telephone,
    j.crm.deal.nombreCommandesMensuel ?? '',
    j.crm.deal.volumeEstimeMensuel ?? '',
    SANTE_LABELS[j.crm.deal.santeCompte],
    j.crm.ndugumi.inscrit ? 'Oui' : 'Non',
    j.crm.deal.dateSignature ?? '',
  ])
  buildAndDownload(header, rows, 'Clients', `restau-crm-clients-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportAgentXlsx(agent: string, joined: JoinedProspect[]) {
  const mine = joined.filter((j) => (j.crm.agent || 'Non assigné') === agent)
  const header = ['Établissement', 'Téléphone', 'Quartier', 'Zone', 'Statut', 'Prochaine relance', 'Tags']
  const rows: (string | number)[][] = mine.map((j) => [
    j.etablissement,
    j.telephone,
    j.quartier,
    j.zone,
    STATUT_LABELS[j.crm.statut],
    j.crm.prochaineRelance ?? '',
    j.crm.tags.join(', '),
  ])
  buildAndDownload(
    header,
    rows,
    agent,
    `restau-crm-${agent.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`
  )
}
