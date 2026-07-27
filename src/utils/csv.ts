import { STATUT_LABELS, SANTE_LABELS } from '../types'
import type { JoinedProspect } from './joined'
import type { Product } from '../types'

function esc(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value)
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function exportProspectsCsv(joined: JoinedProspect[]) {
  const headers = [
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
  const rows = joined.map((j) => [
    j.etablissement,
    j.telephone,
    j.quartier,
    j.zone,
    STATUT_LABELS[j.crm.statut],
    j.crm.agent,
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
  downloadCsv(headers, rows, `restau-crm-export-${new Date().toISOString().slice(0, 10)}.csv`)
}

function downloadCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [headers.map(esc).join(';'), ...rows.map((r) => r.map(esc).join(';'))].join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportProductsCsv(products: Product[]) {
  const headers = ['Nom', 'Catégorie', 'Prix unitaire (FCFA)', 'Unité', 'Description', 'Origine', 'Stock disponible', 'Minimum de commande', 'Fournisseur']
  const rows = products.map((p) => [
    p.nom,
    p.categorie,
    p.prixUnitaire,
    p.unite,
    p.description || '',
    p.origine || '',
    p.stockDispo ?? '',
    p.minimumCommande ?? '',
    p.fournisseur || '',
  ])
  downloadCsv(headers, rows, `restau-crm-catalogue-${new Date().toISOString().slice(0, 10)}.csv`)
}
