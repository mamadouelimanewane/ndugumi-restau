import { useState } from 'react'
import { waLinkWithText } from '../utils/phone'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Simulateur() {
  const [budgetMensuel, setBudgetMensuel] = useState<number>(1500000) // FCFA
  const [frequenceMarche, setFrequenceMarche] = useState<number>(3) // 3 fois par semaine

  // Calculs dynamiques
  const economieProduitsAnnuelle = Math.round(budgetMensuel * 0.12 * 12) // 12% d'économie
  const economieProduitsMensuelle = Math.round(budgetMensuel * 0.12)

  const heuresGagneesMensuelles = frequenceMarche * 4 * 4 // 4h par trajet x 4 semaines
  const heuresGagneesAnnuelles = heuresGagneesMensuelles * 12

  const coutTransportMensuel = frequenceMarche * 5000 * 4 // 5000 FCFA par trajet taxi/carburant
  const coutTransportAnnuel = coutTransportMensuel * 12

  const gainTotalMensuel = economieProduitsMensuelle + coutTransportMensuel
  const gainTotalAnnuel = economieProduitsAnnuelle + coutTransportAnnuel

  function handleShareWhatsapp() {
    const text = `🧮 *SIMULATION D'ÉCONOMIES NDUGUMi POUR VOTRE RESTAURANT*

📊 *Votre budget marché actuel* : ${budgetMensuel.toLocaleString('fr-FR')} FCFA / mois

💰 *Vos Gains Estimés avec NDUGUMi* :
• *Économie directe sur les produits (12%)* : +${economieProduitsMensuelle.toLocaleString('fr-FR')} FCFA / mois
• *Économie de transport évitée* : +${coutTransportMensuel.toLocaleString('fr-FR')} FCFA / mois
• ⏱️ *Temps de marché gagné* : *${heuresGagneesMensuelles} heures* de liberté par mois !

✨ *GAIN TOTAL NET EN CASH* :
👉 *+${gainTotalMensuel.toLocaleString('fr-FR')} FCFA par mois*
👉 *+${gainTotalAnnuel.toLocaleString('fr-FR')} FCFA par an !*

📲 Passez à l'approvisionnement NDUGUMi dès cette semaine !`

    const link = waLinkWithText('', text)
    if (link) window.open(link, '_blank')
  }

  function downloadPdfReport() {
    const doc = new jsPDF()
    doc.setFillColor(122, 31, 31)
    doc.rect(0, 0, 210, 24, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text('NDUGUMi — BILAN D\'ÉCONOMIES & ROI CLIENT', 14, 15)

    doc.setTextColor(40, 40, 40)
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text(`Budget marché actuel : ${budgetMensuel.toLocaleString('fr-FR')} FCFA / mois`, 14, 35)

    autoTable(doc, {
      startY: 45,
      head: [['Poste d\'économie', 'Par Mois (FCFA)', 'Par An (FCFA)']],
      body: [
        ['Économie directe sur les marchandises (12%)', `${economieProduitsMensuelle.toLocaleString('fr-FR')} FCFA`, `${economieProduitsAnnuelle.toLocaleString('fr-FR')} FCFA`],
        ['Frais de transport & carburant évités', `${coutTransportMensuel.toLocaleString('fr-FR')} FCFA`, `${coutTransportAnnuel.toLocaleString('fr-FR')} FCFA`],
        ['Gain Total Net en Cash', `${gainTotalMensuel.toLocaleString('fr-FR')} FCFA`, `${gainTotalAnnuel.toLocaleString('fr-FR')} FCFA`],
      ],
      headStyles: { fillColor: [122, 31, 31] },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 15
    doc.text(`Temps de déplacement économisé : ${heuresGagneesMensuelles} heures / mois (${heuresGagneesAnnuelles} heures / an)`, 14, finalY)

    doc.save(`Simulation_Economies_NDUGUMi.pdf`)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🧮 Simulateur d'Économies & ROI Client</h1>
          <p className="page-subtitle">
            Démontrez en 10 secondes l'impact financier net de NDUGUMi sur la trésorerie du restaurant
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={handleShareWhatsapp}>📲 Partager WhatsApp</button>
          <button className="btn" onClick={downloadPdfReport}>📄 Télécharger PDF</button>
        </div>
      </div>

      {/* Curseur Interactif */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px' }}>⚙️ Ajuster le Budget du Restaurant</h3>
        
        <div className="field-row">
          <label>Budget marché mensuel : <strong style={{ fontSize: 18, color: '#7a1f1f' }}>{budgetMensuel.toLocaleString('fr-FR')} FCFA / mois</strong></label>
          <input
            type="range"
            min={300000}
            max={10000000}
            step={100000}
            value={budgetMensuel}
            onChange={(e) => setBudgetMensuel(Number(e.target.value))}
            style={{ width: '100%', height: 8 }}
          />
        </div>

        <div className="field-row" style={{ marginTop: 14 }}>
          <label>Fréquence actuelle des voyages au marché : <strong>{frequenceMarche} fois par semaine</strong></label>
          <input
            type="range"
            min={1}
            max={7}
            step={1}
            value={frequenceMarche}
            onChange={(e) => setFrequenceMarche(Number(e.target.value))}
            style={{ width: '100%', height: 8 }}
          />
        </div>
      </div>

      {/* Cartes d'Impact Financier */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="panel" style={{ borderLeft: '4px solid #16a34a', background: '#f0fdf4' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>GAIN NET MENSUEL</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#15803d', marginTop: 4 }}>
            +{gainTotalMensuel.toLocaleString('fr-FR')} FCFA
          </div>
          <div style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
            Économie nette sur marchandises + transport
          </div>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #0284c7', background: '#f0f9ff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>GAIN NET ANNUEL</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0284c7', marginTop: 4 }}>
            +{gainTotalAnnuel.toLocaleString('fr-FR')} FCFA
          </div>
          <div style={{ fontSize: 12, color: '#075985', marginTop: 4 }}>
            Trésorerie réinjectable dans le restaurant chaque année
          </div>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #f59e0b', background: '#fffbe0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>TEMPS DE TRAVAIL GAGNÉ</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#d97706', marginTop: 4 }}>
            {heuresGagneesMensuelles}h / mois
          </div>
          <div style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>
            soit {heuresGagneesAnnuelles}h / an d'allers-retours au marché évités
          </div>
        </div>
      </div>
    </div>
  )
}
