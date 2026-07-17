import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { STATUT_LABELS, SANTE_LABELS } from '../types'
import type { JoinedProspect } from './joined'

const PRIMARY: [number, number, number] = [122, 31, 31] // #7a1f1f
const ROW_ALT: [number, number, number] = [247, 241, 232] // #f7f1e8

function newDoc(title: string, subtitle: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, pageWidth, 46, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(title, 28, 24)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(subtitle, 28, 38)

  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(dateStr, pageWidth - 28, 38, { align: 'right' })

  return doc
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8.5)
    doc.setTextColor(120, 120, 120)
    doc.text('Restau CRM — Prospection restaurants NDUGUMi', 28, pageHeight - 16)
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - 28, pageHeight - 16, { align: 'right' })
  }
}

function download(doc: jsPDF, filename: string) {
  doc.save(filename)
}

export function exportProspectsPdf(joined: JoinedProspect[], title = 'Répertoire des prospects') {
  const doc = newDoc(title, `${joined.length} restaurants`)

  const head = [['Établissement', 'Téléphone', 'Quartier', 'Zone', 'Statut', 'Agent', 'Relance', 'NDUGUMi']]
  const body = joined.map((j) => [
    j.etablissement,
    j.telephone,
    j.quartier,
    j.zone === 'Dakar intra-muros' ? 'Dakar' : 'Banlieue',
    STATUT_LABELS[j.crm.statut],
    j.crm.agent || 'Non assigné',
    j.crm.prochaineRelance ?? '—',
    j.crm.ndugumi.inscrit ? 'Oui' : 'Non',
  ])

  autoTable(doc, {
    head,
    body,
    startY: 58,
    margin: { left: 24, right: 24 },
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles: {
      0: { cellWidth: 190 },
      1: { cellWidth: 85 },
      2: { cellWidth: 110 },
      3: { cellWidth: 55 },
      4: { cellWidth: 75 },
      5: { cellWidth: 65 },
      6: { cellWidth: 60 },
      7: { cellWidth: 45 },
    },
    didDrawPage: () => addFooter(doc),
  })

  addFooter(doc)
  download(doc, `restau-crm-prospects-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function exportClientsPdf(clients: JoinedProspect[]) {
  const doc = newDoc('Comptes clients NDUGUMi', `${clients.length} clients (signés + actifs)`)

  const head = [['Client', 'Quartier', 'Téléphone', 'Commandes / mois', 'Volume mensuel (FCFA)', 'Santé du compte']]
  const body = clients.map((j) => [
    j.etablissement,
    j.quartier,
    j.telephone,
    j.crm.deal.nombreCommandesMensuel !== null ? String(j.crm.deal.nombreCommandesMensuel) : '—',
    j.crm.deal.volumeEstimeMensuel !== null ? j.crm.deal.volumeEstimeMensuel.toLocaleString('fr-FR') : '—',
    SANTE_LABELS[j.crm.deal.santeCompte],
  ])

  autoTable(doc, {
    head,
    body,
    startY: 58,
    margin: { left: 24, right: 24 },
    styles: { fontSize: 9, cellPadding: 5, overflow: 'linebreak' },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ROW_ALT },
    didDrawPage: () => addFooter(doc),
  })

  addFooter(doc)
  download(doc, `restau-crm-clients-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function exportAgentPdf(agent: string, joined: JoinedProspect[]) {
  const mine = joined.filter((j) => (j.crm.agent || 'Non assigné') === agent)
  const doc = newDoc(`Portefeuille de ${agent}`, `${mine.length} restaurants assignés`)

  const head = [['Établissement', 'Téléphone', 'Quartier', 'Statut', 'Relance', 'Tags']]
  const body = mine.map((j) => [
    j.etablissement,
    j.telephone,
    j.quartier,
    STATUT_LABELS[j.crm.statut],
    j.crm.prochaineRelance ?? '—',
    j.crm.tags.join(', ') || '—',
  ])

  autoTable(doc, {
    head,
    body,
    startY: 58,
    margin: { left: 24, right: 24 },
    styles: { fontSize: 9, cellPadding: 5, overflow: 'linebreak' },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ROW_ALT },
    didDrawPage: () => addFooter(doc),
  })

  addFooter(doc)
  download(doc, `restau-crm-${agent.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
