import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/* ─────────────────────────────────────────────
   Helpers PDF
───────────────────────────────────────────── */
function pdfHeader(doc: jsPDF, title: string, subtitle: string) {
  // Bande de couleur en-tête
  doc.setFillColor(122, 31, 31)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('NDUGUMi — Équipe commerciale', 14, 10)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 14, 17)

  // Sous-titre
  doc.setTextColor(40, 40, 40)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(subtitle, 14, 32)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100, 100, 100)
  doc.text('Document confidentiel — Usage interne uniquement', 14, 38)

  // Ligne séparatrice
  doc.setDrawColor(192, 121, 58)
  doc.setLineWidth(0.5)
  doc.line(14, 41, 196, 41)
}

function sectionTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFillColor(244, 241, 236)
  doc.rect(14, y, 182, 7, 'F')
  doc.setTextColor(94, 23, 23)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(text.toUpperCase(), 16, y + 5)
  return y + 11
}

function field(doc: jsPDF, y: number, label: string, lineLen = 120): number {
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 80)
  doc.text(label, 16, y)
  doc.setDrawColor(180, 180, 180)
  doc.line(16, y + 3, 16 + lineLen, y + 3)
  return y + 10
}

function checkboxRow(doc: jsPDF, y: number, items: string[], cols = 2): number {
  const colW = 90
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)
  items.forEach((item, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = 16 + col * colW
    const ly = y + row * 7
    doc.rect(x, ly - 4, 3.5, 3.5)
    doc.text(item, x + 5, ly - 1)
  })
  return y + Math.ceil(items.length / cols) * 7 + 3
}

/* ─────────────────────────────────────────────
   Document 1 : Fiche d'enquête terrain
───────────────────────────────────────────── */
function generateFicheEnquete() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 46

  pdfHeader(doc, 'Fiche d\'enquête terrain', 'Fiche Prospect Restaurant')

  // SECTION 1 — Identification
  y = sectionTitle(doc, y, 'Section 1 — Identification de l\'établissement')
  y = field(doc, y, 'Nom de l\'établissement', 160)
  y = field(doc, y, 'Adresse / Quartier', 160)

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
  doc.text('Zone :', 16, y)
  y = checkboxRow(doc, y + 4, ['Dakar intra-muros', 'Banlieue'], 2)

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
  doc.text('Type d\'établissement :', 16, y)
  y = checkboxRow(doc, y + 4, [
    'Restaurant gastronomique', 'Dibiterie / Grillade',
    'Fast-food local', 'Thiéboudiène / plats du jour',
    'Café / Sandwicherie', 'Restauration de rue',
  ])

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
  doc.text('Capacité :', 16, y)
  y = checkboxRow(doc, y + 4, ['< 20 couverts', '20–50', '50–100', '> 100'], 4)
  y = field(doc, y, 'Téléphone principal', 80)
  y = field(doc, y, 'WhatsApp disponible ?  ☐ Oui  ☐ Non  — Autre numéro :', 120)

  // SECTION 2 — Contacts
  y = sectionTitle(doc, y, 'Section 2 — Contact(s) identifié(s)')
  autoTable(doc, {
    startY: y,
    head: [['Rôle', 'Nom', 'Téléphone', 'Email', 'Décisionnaire ?']],
    body: [
      ['Gérant / Propriétaire', '', '', '', '☐ Oui  ☐ Non'],
      ['Responsable achats', '', '', '', '☐ Oui  ☐ Non'],
      ['Chef cuisinier', '', '', '', '☐ Oui  ☐ Non'],
      ['Autre : _______', '', '', '', '☐ Oui  ☐ Non'],
    ],
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [122, 31, 31], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 5

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
  doc.text('Meilleur moment pour être contacté :', 16, y)
  y = checkboxRow(doc, y + 4, ['Matin (avant 12h)', 'Après-midi (14h–17h)', 'Soir (après 19h)', 'WhatsApp uniquement'], 4)

  // SECTION 3 — Approvisionnement
  y = sectionTitle(doc, y, 'Section 3 — Situation d\'approvisionnement actuelle')
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
  doc.text('Comment vous approvisionnez-vous ?', 16, y); y += 4
  y = checkboxRow(doc, y, [
    'Je vais moi-même au marché (Tilène, Castors, Sandaga…)',
    'J\'envoie un employé au marché chaque matin',
    'Un fournisseur / grossiste me livre directement',
    'J\'achète en gros chez un commerçant fixe',
    'Je passe par une application / commande en ligne',
  ])

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
  doc.text('Fréquence des achats au marché :', 16, y)
  y = checkboxRow(doc, y + 4, ['Chaque jour', '3–4 fois/semaine', '1–2 fois/semaine', 'Moins souvent'], 4)

  autoTable(doc, {
    startY: y,
    head: [['Produit', 'Acheté ?', 'Quantité / Fréquence', 'Fournisseur actuel']],
    body: [
      ['Riz (brisé, long)', '☐', '', ''],
      ['Huile végétale', '☐', '', ''],
      ['Oignon', '☐', '', ''],
      ['Pomme de terre', '☐', '', ''],
      ['Concentré de tomate', '☐', '', ''],
      ['Poulet / Viande', '☐', '', ''],
      ['Poisson (thiof, yaboya…)', '☐', '', ''],
      ['Légumes frais', '☐', '', ''],
      ['Gaz (bouteille 12 kg)', '☐', '', ''],
      ['Eau minérale', '☐', '', ''],
    ],
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [122, 31, 31], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 5

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
  doc.text('Budget marché estimé par mois :', 16, y)
  y = checkboxRow(doc, y + 4, [
    '< 100 000 FCFA', '100 000 – 300 000 FCFA',
    '300 000 – 600 000 FCFA', '> 600 000 FCFA',
  ], 4)

  // SECTION 4 — Problèmes
  y = sectionTitle(doc, y, 'Section 4 — Problèmes vécus aujourd\'hui')
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
  doc.text('Principales difficultés dans les achats de marché :', 16, y); y += 4
  y = checkboxRow(doc, y, [
    'Temps perdu au marché (déplacement, attente)',
    'Prix instables / augmentations fréquentes',
    'Qualité irrégulière des produits',
    'Ruptures de stock imprévues',
    'Problème de transport des marchandises',
    'Dépendance à un seul fournisseur peu fiable',
    'Difficulté à gérer les stocks (gaspillage)',
    'Manque de temps pour aller au marché',
  ])

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
  doc.text('Commentaire libre :', 16, y); y += 5
  doc.setDrawColor(200, 200, 200)
  for (let i = 0; i < 3; i++) {
    doc.line(16, y, 196, y)
    y += 6
  }
  y += 3

  // SECTION 5 — NDUGUMi
  y = sectionTitle(doc, y, 'Section 5 — Connaissance & réceptivité à NDUGUMi')
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
  doc.text('Connaissez-vous l\'application NDUGUMi ?', 16, y)
  y = checkboxRow(doc, y + 4, [
    'Non, jamais entendu parler', 'J\'en ai entendu parler, pas essayé',
    'Téléchargée mais pas utilisée', 'Je l\'utilise déjà',
  ], 2)

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
  doc.text('Première réaction après présentation :', 16, y)
  y = checkboxRow(doc, y + 4, [
    'Très intéressé', 'Intéressé', 'Neutre', 'Sceptique', 'Pas intéressé',
  ], 5)

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
  doc.text('Ce qui pourrait le convaincre d\'essayer :', 16, y); y += 5
  doc.setDrawColor(200, 200, 200)
  for (let i = 0; i < 2; i++) { doc.line(16, y, 196, y); y += 6 }
  y += 3

  // SECTION 7 — Observations
  y = sectionTitle(doc, y, 'Section 6 — Observations terrain (usage interne)')
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
  doc.text('Niveau d\'activité :', 16, y)
  y = checkboxRow(doc, y + 4, ['Vide / peu actif', 'Activité modérée', 'Très fréquenté'], 3)
  doc.text('Maturité digitale :', 16, y)
  y = checkboxRow(doc, y + 4, ['Smartphone actif (WhatsApp, réseaux)', 'Smartphone usage basique', 'Pas ou peu numérique'], 3)
  doc.text('Impression générale :', 16, y)
  y = checkboxRow(doc, y + 4, ['Ouvert et communicatif', 'Pressé mais réceptif', 'Méfiant', 'Mauvais interlocuteur'], 2)

  // SECTION 8 — Synthèse
  y = sectionTitle(doc, y, 'Section 7 — Synthèse & suite à donner')
  autoTable(doc, {
    startY: y,
    body: [
      ['Statut CRM :', '☐ Nouveau  ☐ Contacté  ☐ Intéressé  ☐ RDV  ☐ Refusé  ☐ Injoignable'],
      ['Prochaine action :', '☐ Rappel  ☐ Visite démo  ☐ WhatsApp  ☐ Inscription  ☐ Aucune'],
      ['Date de relance :', '____/____/2026'],
      ['Agent commercial :', ''],
      ['Date de la visite :', '____/____/2026     Heure : ___________'],
      ['Durée échange :', '☐ < 5 min    ☐ 5–15 min    ☐ > 15 min'],
      ['Notes :', '\n\n\n'],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [244, 241, 236], cellWidth: 50 } },
    margin: { left: 14, right: 14 },
  })

  // Pied de page
  const pageH = doc.internal.pageSize.height
  doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150)
  doc.text('NDUGUMi — Équipe commerciale Dakar & Banlieue | Fiche Prospect v1.0 — Juillet 2026', 14, pageH - 8)

  doc.save('NDUGUMi_Fiche_Enquete_Terrain.pdf')
}

/* ─────────────────────────────────────────────
   Document 2 : Questionnaire de qualification rapide
───────────────────────────────────────────── */
function generateQuestionnaire() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 46

  pdfHeader(doc, 'Outil terrain — 5 à 7 minutes', 'Questionnaire de Qualification Rapide')

  // Accroche
  doc.setFillColor(255, 243, 224)
  doc.rect(14, y, 182, 16, 'F')
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(122, 31, 31)
  doc.text('💬 ACCROCHE :', 16, y + 5)
  doc.setFont('helvetica', 'italic'); doc.setTextColor(50, 50, 50); doc.setFontSize(7.5)
  doc.text(
    '« Bonjour ! Je suis {Prénom} de NDUGUMi. Nous aidons les restaurants de {Quartier} à commander leur marché',
    16, y + 10
  )
  doc.text('directement depuis leur téléphone — sans se déplacer, avec livraison incluse. J\'aurais juste 5 minutes ? »', 16, y + 14)
  y += 20

  // Q1
  y = sectionTitle(doc, y, 'Q1 — Comment vous approvisionnez-vous aujourd\'hui en produits de marché ?')
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50)
  doc.text('(Laisser répondre librement — écouter avant de parler)', 16, y); y += 5
  autoTable(doc, {
    startY: y,
    head: [['Réponse entendue', 'Signal', 'Argument NDUGUMi à préparer']],
    body: [
      ['« Je vais moi-même au marché »', '✅ Fort', 'Commandez en 2 min depuis votre téléphone'],
      ['« J\'envoie un employé chaque matin »', '✅ Bon', 'Coût caché main-d\'œuvre — vous choisissez vous-même'],
      ['« J\'ai un fournisseur qui me livre »', '⚠️ Challenger', 'Creuser prix, fiabilité, produits manquants'],
      ['« On est très bien organisé »', '⚠️ Résistant', 'Se positionner en filet de sécurité'],
    ],
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [122, 31, 31], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // Q2
  y = sectionTitle(doc, y, 'Q2 — C\'est quoi votre plus grand problème dans vos achats de marché ?')
  autoTable(doc, {
    startY: y,
    head: [['Réponse entendue', 'Argument NDUGUMi']],
    body: [
      ['« Le temps perdu au marché »', 'Commandez en 2 minutes depuis ici'],
      ['« Les prix qui changent tout le temps »', 'Nos prix sont affichés et stables'],
      ['« Mon employé ramène ce qu\'il veut »', 'Vous choisissez vous-même les produits'],
      ['« Parfois il manque des produits »', 'Commande programmée, stock disponible'],
      ['« Le transport coûte cher »', 'Livraison incluse dans le prix NDUGUMi'],
    ],
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [122, 31, 31], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // Q3 Q4 Q5
  y = sectionTitle(doc, y, 'Q3 — Utilisez-vous WhatsApp pour votre business ?')
  y = checkboxRow(doc, y, [
    'Oui, quotidiennement → Profil idéal',
    'Oui mais peu → Prévoir accompagnement inscription',
    'Non / basique → Pas de priorité immédiate',
  ])

  y = sectionTitle(doc, y, 'Q4 — Combien de fois par semaine allez-vous au marché ?')
  y = checkboxRow(doc, y, [
    'Chaque jour → Douleur maximale ⭐⭐⭐',
    '3–4 fois/semaine → Bon potentiel ⭐⭐',
    '1–2 fois/semaine → Moyen ⭐',
    'Rarement → Livré déjà, challenger',
  ], 2)

  y = sectionTitle(doc, y, 'Q5 — Connaissez-vous l\'application NDUGUMi ?')
  y = checkboxRow(doc, y, [
    'Non → Faire la démo (voir bloc B au dos)',
    'Oui, pas encore testé → « Qu\'est-ce qui vous a retenu ? »',
    'Déjà utilisateur → « Qu\'est-ce qui manque ? »',
  ])

  // Objections
  y = sectionTitle(doc, y, 'Réponses aux objections les plus fréquentes')
  autoTable(doc, {
    startY: y,
    head: [['Objection', 'Réponse NDUGUMi']],
    body: [
      ['« C\'est trop cher »', 'Calculez : transport + temps employé au marché = souvent équivalent ou plus cher'],
      ['« Je ne sais pas utiliser les applis »', 'Notre équipe vous aide à vous inscrire gratuitement en 10 minutes'],
      ['« Mon fournisseur me satisfait »', 'Utilisez NDUGUMi juste pour les produits qu\'il n\'a pas ou pour les urgences'],
      ['« Je ne vous connais pas »', '« Le restaurant [nom quartier] vous utilisez — puis-je vous donner son contact ? »'],
      ['« J\'ai pas le temps là »', '« Puis-je revenir [jour] à [heure] pour 5 minutes de démo ? »'],
    ],
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [192, 121, 58], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // Scoring
  y = sectionTitle(doc, y, '🏆 Grille de scoring rapide (à remplir mentalement)')
  autoTable(doc, {
    startY: y,
    head: [['Critère', '0 pt', '1 pt', '2 pts']],
    body: [
      ['Va au marché lui-même ou envoie un employé', 'Non', 'Parfois', 'Oui, souvent'],
      ['Exprime un problème clair d\'approvisionnement', 'Non', 'Vague', 'Clairement'],
      ['Utilise smartphone / WhatsApp activement', 'Non', 'Peu', 'Oui'],
      ['Intérêt montré durant l\'échange', 'Négatif', 'Neutre', 'Positif'],
      ['Accepte un RDV / démo', 'Non', 'Peut-être', 'Oui'],
      ['Restaurant actif et bien fréquenté', 'Non', 'Moyen', 'Oui'],
    ],
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [122, 31, 31], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 4

  autoTable(doc, {
    startY: y,
    head: [['Score', 'Statut CRM', 'Priorité']],
    body: [
      ['9 – 12', 'Intéressé → Planifier démo', '🔴 Haute'],
      ['5 – 8', 'Contacté → Relance dans 7 jours', '🟡 Normale'],
      ['0 – 4', 'Contacté → Relance dans 30 jours', '🟢 Basse'],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [35, 42, 59], textColor: 255 },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // Mémo CRM
  y = sectionTitle(doc, y, '📝 Mémo rapide à saisir dans le CRM (immédiatement après la visite)')
  autoTable(doc, {
    startY: y,
    body: [
      ['Établissement :', '', 'Date visite :', ''],
      ['Contact :', '', 'Tél :', ''],
      ['Problème identifié :', '', 'Score :', '/12'],
      ['Réaction NDUGUMi :', '☐ Très intéressé  ☐ Intéressé  ☐ Neutre  ☐ Réfractaire', '', ''],
      ['Prochaine action :', '', 'Date :', ''],
    ],
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [244, 241, 236], cellWidth: 38 },
      2: { fontStyle: 'bold', fillColor: [244, 241, 236], cellWidth: 25 },
    },
    margin: { left: 14, right: 14 },
  })

  const pageH = doc.internal.pageSize.height
  doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150)
  doc.text('NDUGUMi — Questionnaire terrain v1.0 — Juillet 2026', 14, pageH - 8)

  doc.save('NDUGUMi_Questionnaire_Qualification_Rapide.pdf')
}

/* ─────────────────────────────────────────────
   Document 3 : Guide stratégie commerciale
───────────────────────────────────────────── */
function generateStrategieCommerciale() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 46

  pdfHeader(doc, 'Guide opérationnel — Équipe terrain', 'Stratégie Commerciale NDUGUMi')

  // Proposition de valeur
  y = sectionTitle(doc, y, '1. Proposition de valeur — Ce que NDUGUMi apporte aux restaurants')
  autoTable(doc, {
    startY: y,
    head: [['Ce que le restaurant GAGNE', 'Ce qu\'il arrête de PERDRE']],
    body: [
      ['⏱ Temps libéré — plus de déplacement au marché', '💸 Coût du transport aller-retour quotidien'],
      ['📱 Commande simple depuis le téléphone', '🕐 1 à 3 heures perdues chaque matin'],
      ['📦 Livraison à domicile (au restaurant)', '🤦 Erreurs / oublis de l\'employé envoyé'],
      ['💰 Prix transparents et stables affichés', '📉 Marchandage épuisant, incertitude des prix'],
      ['🔁 Historique et suivi de commandes', '🗒 Gestion manuelle sur cahier / mémoire'],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [122, 31, 31], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // 4 profils
  y = sectionTitle(doc, y, '2. Les 4 profils de restaurateurs à Dakar')
  const profils = [
    {
      icon: '⭐⭐⭐', titre: 'PROFIL 1 — Le Gérant Débordé (Cible prioritaire)',
      desc: 'Fait tout lui-même. Va au marché le matin, gère la caisse le midi.',
      trigger: 'Gain de temps et simplification.',
      pitch: '« Je vois que vous gérez tout vous-même. NDUGUMi peut vous faire gagner 1h à 2h chaque matin. »',
      moment: '14h–16h (entre les services)',
    },
    {
      icon: '⭐⭐', titre: 'PROFIL 2 — Le Patron Qui Délègue (Cible secondaire)',
      desc: 'Envoie un employé faire le marché chaque matin.',
      trigger: 'Contrôle et économies.',
      pitch: '« Avec NDUGUMi, c\'est vous qui choisissez les produits. Vous savez exactement ce qui sera livré. »',
      moment: '14h–17h',
    },
    {
      icon: '⭐', titre: 'PROFIL 3 — Le Restaurateur Organisé (À convaincre)',
      desc: 'A déjà un fournisseur ou grossiste de confiance.',
      trigger: 'Se positionner en complément, pas en remplacement.',
      pitch: '« Gardez votre fournisseur. NDUGUMi est votre filet de sécurité pour les urgences. Inscription gratuite. »',
      moment: 'Quand le fournisseur faillit',
    },
    {
      icon: '❌', titre: 'PROFIL 4 — Le Réfractaire au Numérique',
      desc: 'Utilise peu son téléphone. Préfère les habitudes.',
      trigger: 'Ne pas insister — noter dans le CRM et revenir dans 3–6 mois.',
      pitch: 'Laisser une carte, repartir dignement.',
      moment: 'Ne pas insister',
    },
  ]

  for (const p of profils) {
    doc.setFillColor(250, 247, 242)
    doc.rect(14, y, 182, 28, 'F')
    doc.setTextColor(122, 31, 31); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.text(`${p.icon}  ${p.titre}`, 17, y + 6)
    doc.setTextColor(50, 50, 50); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
    doc.text(`Profil : ${p.desc}`, 17, y + 12)
    doc.text(`Déclencheur : ${p.trigger}`, 17, y + 17)
    doc.setFont('helvetica', 'italic')
    doc.text(`Pitch : ${p.pitch.length > 100 ? p.pitch.slice(0, 97) + '…' : p.pitch}`, 17, y + 22)
    doc.setFont('helvetica', 'normal')
    doc.text(`⏰ Moment idéal : ${p.moment}`, 17, y + 27)
    y += 31
  }

  // Cycle de vente
  y = sectionTitle(doc, y, '3. Le cycle de vente en 5 étapes')
  autoTable(doc, {
    startY: y,
    head: [['Étape', 'Durée cible', 'Objectif', 'Règle clé']],
    body: [
      ['1. Repérage terrain', 'Continu', 'Identifier les prospects dans la zone', 'Utiliser la carte du CRM + tournée 10h–12h'],
      ['2. Premier contact', '5–7 min', 'Qualifier rapidement', 'Ne jamais interrompre pendant un service (11h30–21h)'],
      ['3. Démo / Présentation', '15–30 min', 'Montrer l\'app, lever les objections', 'Montrer sur son propre téléphone, calculer les économies'],
      ['4. Inscription & 1ère commande', '10–15 min', 'Signer et passer la 1ère commande', 'Faire la commande MAINTENANT, même petite (10 000 FCFA)'],
      ['5. Suivi client actif', 'Hebdomadaire', 'Fidéliser et détecter le churn', 'Appel J+1 après livraison obligatoire'],
    ],
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [122, 31, 31], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // Journée type
  y = sectionTitle(doc, y, '4. Organisation d\'une journée type')
  autoTable(doc, {
    startY: y,
    body: [
      ['07h00 – 09h00', 'Préparation', 'CRM, liste prospects à visiter, itinéraire optimisé'],
      ['09h00 – 11h30', '🔥 Tournée terrain', '6–8 nouveaux contacts (1ers passages)'],
      ['11h30 – 14h00', '⛔ PAUSE', 'Service actif dans les restaurants — NE PAS DÉRANGER'],
      ['14h00 – 17h30', '🔥 Visites de fond', '3–5 démos approfondies / 2ème passages'],
      ['17h30 – 18h30', 'Administratif', 'Mise à jour CRM + relances WhatsApp + rapport'],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [35, 42, 59], textColor: 255 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { fontStyle: 'bold', cellWidth: 35, fillColor: [244, 241, 236] },
    },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // Objectifs journaliers
  y = sectionTitle(doc, y, '5. Objectifs journaliers minimum')
  autoTable(doc, {
    startY: y,
    head: [['Activité', 'Objectif / jour']],
    body: [
      ['Nouveaux prospects contactés', '8 – 12'],
      ['Démonstrations réalisées', '2 – 4'],
      ['Inscriptions / 1ères commandes', '1 – 2'],
      ['Relances effectuées (appels + WhatsApp)', '10+'],
      ['Taux de conversion contact → inscription', '> 10%'],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [192, 121, 58], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // Techniques de persuasion
  y = sectionTitle(doc, y, '6. Techniques terrain adaptées au contexte dakarois')
  autoTable(doc, {
    startY: y,
    head: [['Technique', 'Comment l\'utiliser']],
    body: [
      ['🤝 Preuve sociale par le quartier', '« Le restaurant [Nom] juste à côté utilise NDUGUMi. Voulez-vous son contact ? »'],
      ['📊 Calcul des économies en direct', 'Transport aller-retour × 26 jours + coût employé = économie réelle chiffrable'],
      ['🎁 Offre sans risque', '« L\'inscription est gratuite. Essayez une seule commande. Si ça ne convient pas, rien de perdu. »'],
      ['🔄 Essai partiel', '« Utilisez NDUGUMi juste pour l\'huile et le riz ce mois-ci, on verra pour le reste. »'],
      ['📅 Urgence douce', '« On fait une opération dans votre quartier cette semaine — c\'est le bon moment. »'],
    ],
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [35, 42, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // Erreurs à éviter
  y = sectionTitle(doc, y, '7. Erreurs à éviter')
  autoTable(doc, {
    startY: y,
    head: [['❌ Erreur fréquente', '✅ Bonne pratique']],
    body: [
      ['Arriver pendant le service (11h30–14h)', 'Vérifier l\'heure avant d\'entrer'],
      ['Lire le questionnaire comme un formulaire', 'Poser les questions dans la conversation naturelle'],
      ['Parler trop, écouter peu', '70% écoute, 30% parole'],
      ['Promettre des choses non confirmées', 'Vérifier avant de promettre (prix, délais)'],
      ['Ne pas saisir dans le CRM le même jour', 'CRM mis à jour avant 19h chaque soir'],
      ['Laisser un client sans nouvelles après inscription', 'Appel de suivi J+1 obligatoire'],
    ],
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [166, 61, 61], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 14, right: 14 },
  })

  const pageH = doc.internal.pageSize.height
  doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150)
  doc.text('NDUGUMi — Guide stratégie commerciale v1.0 — Juillet 2026 | Document confidentiel', 14, pageH - 8)

  doc.save('NDUGUMi_Strategie_Commerciale.pdf')
}

/* ─────────────────────────────────────────────
   Helpers Word (.doc / .docx)
───────────────────────────────────────────── */
function downloadWordDoc(filename: string, title: string, htmlBody: string) {
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
        xmlns:w='urn:schemas-microsoft-com:office:word' 
        xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #222; margin: 25px; line-height: 1.5; }
          .banner { background-color: #7a1f1f; color: #ffffff; padding: 12px 18px; border-radius: 4px; margin-bottom: 20px; }
          .banner h1 { color: #ffffff; font-size: 16pt; font-weight: bold; margin: 0; padding: 0; border: none; }
          .banner p { color: #f4f1ec; font-size: 10pt; margin: 4px 0 0 0; }
          h2 { color: #7a1f1f; font-size: 13pt; font-weight: bold; background-color: #f4f1ec; padding: 6px 10px; border-left: 4px solid #c0793a; margin-top: 22px; margin-bottom: 12px; }
          h3 { color: #5e1717; font-size: 11pt; font-weight: bold; margin-top: 14px; margin-bottom: 6px; }
          p { margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 16px; }
          th { background-color: #7a1f1f; color: #ffffff; font-weight: bold; padding: 8px 10px; text-align: left; font-size: 10pt; border: 1px solid #7a1f1f; }
          td { padding: 7px 10px; border: 1px solid #cccccc; font-size: 10pt; vertical-align: top; }
          tr:nth-child(even) td { background-color: #faf7f2; }
          .box { background-color: #fff9f0; border: 1px solid #ffe3c2; padding: 12px; border-radius: 4px; margin-bottom: 15px; }
          .footer { font-size: 8.5pt; color: #777777; font-style: italic; border-top: 1px solid #dddddd; padding-top: 10px; margin-top: 30px; }
        </style>
        </head>
        <body>`

  const footer = `<div class="footer">NDUGUMi — Équipe commerciale Dakar & Banlieue | Document modifiable Word — ${new Date().getFullYear()}</div></body></html>`
  const sourceHTML = header + htmlBody + footer

  const blob = new Blob(['\ufeff', sourceHTML], {
    type: 'application/msword',
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function generateFicheEnqueteWord() {
  const html = `
    <div class="banner">
      <h1>NDUGUMi — Équipe Commerciale</h1>
      <p>Fiche d'Enquête Terrain — Fiche Prospect Restaurant (Format Modifiable Word)</p>
    </div>

    <h2>SECTION 1 — Identification de l'établissement</h2>
    <p><strong>Nom de l'établissement :</strong> ____________________________________________________</p>
    <p><strong>Adresse / Quartier :</strong> ____________________________________________________</p>
    <p><strong>Zone géographique :</strong> [ &nbsp; ] Dakar intra-muros &nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Banlieue</p>

    <p><strong>Type d'établissement :</strong></p>
    <p>[ &nbsp; ] Restaurant gastronomique &nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Dibiterie / Grillade &nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Fast-food local<br/>
       [ &nbsp; ] Thiéboudiène / plats du jour &nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Café / Sandwicherie &nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Restauration de rue</p>

    <p><strong>Capacité :</strong> [ &nbsp; ] &lt; 20 couverts &nbsp;&nbsp; [ &nbsp; ] 20–50 &nbsp;&nbsp; [ &nbsp; ] 50–100 &nbsp;&nbsp; [ &nbsp; ] &gt; 100</p>
    <p><strong>Téléphone principal :</strong> _________________________ &nbsp;&nbsp;&nbsp;&nbsp; <strong>WhatsApp :</strong> [ &nbsp; ] Oui &nbsp; [ &nbsp; ] Non</p>

    <h2>SECTION 2 — Contact(s) identifié(s)</h2>
    <table>
      <thead>
        <tr>
          <th>Rôle</th>
          <th>Nom</th>
          <th>Téléphone</th>
          <th>Email</th>
          <th>Décisionnaire ?</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Gérant / Propriétaire</td><td></td><td></td><td></td><td>[ &nbsp; ] Oui &nbsp; [ &nbsp; ] Non</td></tr>
        <tr><td>Responsable achats</td><td></td><td></td><td></td><td>[ &nbsp; ] Oui &nbsp; [ &nbsp; ] Non</td></tr>
        <tr><td>Chef cuisinier</td><td></td><td></td><td></td><td>[ &nbsp; ] Oui &nbsp; [ &nbsp; ] Non</td></tr>
        <tr><td>Autre</td><td></td><td></td><td></td><td>[ &nbsp; ] Oui &nbsp; [ &nbsp; ] Non</td></tr>
      </tbody>
    </table>
    <p><strong>Meilleur moment pour contacter :</strong> [ &nbsp; ] Matin (avant 12h) &nbsp;&nbsp; [ &nbsp; ] Après-midi (14h–17h) &nbsp;&nbsp; [ &nbsp; ] Soir &nbsp;&nbsp; [ &nbsp; ] WhatsApp uniquement</p>

    <h2>SECTION 3 — Situation d'approvisionnement actuelle</h2>
    <p><strong>Comment vous approvisionnez-vous ?</strong></p>
    <p>[ &nbsp; ] Je vais moi-même au marché (Tilène, Castors, Sandaga…)<br/>
       [ &nbsp; ] J'envoie un employé au marché chaque matin<br/>
       [ &nbsp; ] Un fournisseur / grossiste me livre directement<br/>
       [ &nbsp; ] J'achète en gros chez un commerçant fixe<br/>
       [ &nbsp; ] Je passe par une application / commande en ligne</p>

    <p><strong>Fréquence d'achat :</strong> [ &nbsp; ] Chaque jour &nbsp;&nbsp; [ &nbsp; ] 3–4 fois/semaine &nbsp;&nbsp; [ &nbsp; ] 1–2 fois/semaine &nbsp;&nbsp; [ &nbsp; ] Moins souvent</p>

    <table>
      <thead>
        <tr>
          <th>Produit</th>
          <th>Acheté ?</th>
          <th>Quantité / Fréquence</th>
          <th>Fournisseur actuel</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Riz (brisé, long)</td><td>[ &nbsp; ]</td><td></td><td></td></tr>
        <tr><td>Huile végétale</td><td>[ &nbsp; ]</td><td></td><td></td></tr>
        <tr><td>Oignon</td><td>[ &nbsp; ]</td><td></td><td></td></tr>
        <tr><td>Pomme de terre</td><td>[ &nbsp; ]</td><td></td><td></td></tr>
        <tr><td>Concentré de tomate</td><td>[ &nbsp; ]</td><td></td><td></td></tr>
        <tr><td>Poulet / Viande</td><td>[ &nbsp; ]</td><td></td><td></td></tr>
        <tr><td>Poisson (thiof, yaboy…)</td><td>[ &nbsp; ]</td><td></td><td></td></tr>
        <tr><td>Légumes frais</td><td>[ &nbsp; ]</td><td></td><td></td></tr>
        <tr><td>Gaz (bouteille 12kg)</td><td>[ &nbsp; ]</td><td></td><td></td></tr>
        <tr><td>Eau minérale</td><td>[ &nbsp; ]</td><td></td><td></td></tr>
      </tbody>
    </table>

    <p><strong>Budget marché estimé par mois :</strong><br/>
    [ &nbsp; ] &lt; 100 000 FCFA &nbsp;&nbsp; [ &nbsp; ] 100 000 – 300 000 FCFA &nbsp;&nbsp; [ &nbsp; ] 300 000 – 600 000 FCFA &nbsp;&nbsp; [ &nbsp; ] &gt; 600 000 FCFA</p>

    <h2>SECTION 4 — Problèmes vécus aujourd'hui</h2>
    <p>[ &nbsp; ] Temps perdu au marché &nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Prix instables / augmentations<br/>
       [ &nbsp; ] Qualité impure / irrégulière &nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Ruptures de stock imprévues<br/>
       [ &nbsp; ] Transport coûteux / difficile &nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Fournisseur peu fiable<br/>
       [ &nbsp; ] Manque de temps pour aller au marché &nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] Difficulté de gestion des stocks</p>

    <h2>SECTION 5 — Connaissance & Réceptivité NDUGUMi</h2>
    <p><strong>Connaissez-vous l'application NDUGUMi ?</strong><br/>
    [ &nbsp; ] Non, jamais entendu parler &nbsp;&nbsp; [ &nbsp; ] Entendu parler, pas essayé &nbsp;&nbsp; [ &nbsp; ] Téléchargée non utilisée &nbsp;&nbsp; [ &nbsp; ] Déjà utilisateur</p>
    <p><strong>Première réaction après présentation :</strong><br/>
    [ &nbsp; ] Très intéressé &nbsp;&nbsp; [ &nbsp; ] Intéressé &nbsp;&nbsp; [ &nbsp; ] Neutre &nbsp;&nbsp; [ &nbsp; ] Sceptique &nbsp;&nbsp; [ &nbsp; ] Pas intéressé</p>

    <h2>SECTION 6 — Synthèse & Suite à donner (Usage Interne CRM)</h2>
    <table>
      <tbody>
        <tr><td><strong>Statut CRM :</strong></td><td>[ &nbsp; ] Nouveau &nbsp;&nbsp; [ &nbsp; ] Contacté &nbsp;&nbsp; [ &nbsp; ] Intéressé &nbsp;&nbsp; [ &nbsp; ] RDV &nbsp;&nbsp; [ &nbsp; ] Refusé &nbsp;&nbsp; [ &nbsp; ] Injoignable</td></tr>
        <tr><td><strong>Prochaine action :</strong></td><td>[ &nbsp; ] Rappel &nbsp;&nbsp; [ &nbsp; ] Visite démo &nbsp;&nbsp; [ &nbsp; ] WhatsApp &nbsp;&nbsp; [ &nbsp; ] Inscription &nbsp;&nbsp; [ &nbsp; ] Aucune</td></tr>
        <tr><td><strong>Date de relance :</strong></td><td>____ / ____ / 2026</td></tr>
        <tr><td><strong>Agent commercial :</strong></td><td>________________________________________</td></tr>
        <tr><td><strong>Notes :</strong></td><td><br/><br/></td></tr>
      </tbody>
    </table>
  `
  downloadWordDoc('NDUGUMi_Fiche_Enquete_Terrain.doc', 'Fiche d\'enquête terrain NDUGUMi', html)
}

function generateQuestionnaireWord() {
  const html = `
    <div class="banner">
      <h1>NDUGUMi — Équipe Commerciale</h1>
      <p>Questionnaire de Qualification Rapide (Format Modifiable Word)</p>
    </div>

    <div class="box">
      <strong>💬 ACCROCHE DE TERRAIN :</strong><br/>
      <em>« Bonjour ! Je suis {Prénom} de NDUGUMi. Nous aidons les restaurants de {Quartier} à commander leur marché directement depuis leur téléphone — sans se déplacer, avec livraison incluse. J'aurais juste 5 minutes ? »</em>
    </div>

    <h2>Q1 — Comment vous approvisionnez-vous aujourd'hui en produits de marché ?</h2>
    <table>
      <thead>
        <tr>
          <th>Réponse entendue</th>
          <th>Signal</th>
          <th>Argument NDUGUMi à préparer</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>« Je vais moi-même au marché »</td><td>✅ Fort</td><td>Commandez en 2 min depuis votre téléphone sans fatigue</td></tr>
        <tr><td>« J'envoie un employé chaque matin »</td><td>✅ Bon</td><td>Évitez le coût caché et gardez le contrôle direct</td></tr>
        <tr><td>« J'ai un fournisseur qui me livre »</td><td>⚠️ Challenger</td><td>Creuser prix, délais de livraison et produits manquants</td></tr>
        <tr><td>« On est très bien organisé »</td><td>⚠️ Résistant</td><td>Positionner NDUGUMi comme filet de sécurité secours</td></tr>
      </tbody>
    </table>

    <h2>Q2 — C'est quoi votre plus grand problème dans vos achats de marché ?</h2>
    <table>
      <thead>
        <tr>
          <th>Réponse entendue</th>
          <th>Argument NDUGUMi</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>« Le temps perdu au marché »</td><td>Commandez en 2 minutes depuis votre cuisine</td></tr>
        <tr><td>« Les prix qui changent tout le temps »</td><td>Nos prix sont transparents, fixes et affichés</td></tr>
        <tr><td>« L'employé ramène ce qu'il veut »</td><td>Vous choisissez exactement les marques et qualités</td></tr>
        <tr><td>« Parfois il manque des produits »</td><td>Stock garanti et livraison rapide sous 24h</td></tr>
        <tr><td>« Le transport coûte cher »</td><td>Livraison directe au restaurant incluse</td></tr>
      </tbody>
    </table>

    <h2>Q3, Q4 & Q5 — Qualification & Utilisation</h2>
    <p><strong>Q3 — Utilisez-vous WhatsApp pour votre business ?</strong><br/>
    [ &nbsp; ] Oui quotidiennement (Profil idéal) &nbsp;&nbsp; [ &nbsp; ] Oui mais peu &nbsp;&nbsp; [ &nbsp; ] Non / basique</p>

    <p><strong>Q4 — Combien de fois par semaine allez-vous au marché ?</strong><br/>
    [ &nbsp; ] Chaque jour (Douleur max ⭐⭐⭐) &nbsp;&nbsp; [ &nbsp; ] 3-4 fois/semaine &nbsp;&nbsp; [ &nbsp; ] 1-2 fois &nbsp;&nbsp; [ &nbsp; ] Rarement</p>

    <p><strong>Q5 — Connaissez-vous NDUGUMi ?</strong><br/>
    [ &nbsp; ] Non &nbsp;&nbsp; [ &nbsp; ] Oui mais pas testé &nbsp;&nbsp; [ &nbsp; ] Déjà utilisateur</p>

    <h2>Réponses aux objections les plus fréquentes</h2>
    <table>
      <thead>
        <tr>
          <th>Objection</th>
          <th>Réponse NDUGUMi</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>« C'est trop cher »</td><td>Calculez : transport + temps perdu = NDUGUMi est plus économique</td></tr>
        <tr><td>« Je ne sais pas utiliser les applis »</td><td>Notre agent vous inscrit gratuitement et montre le fonctionnement en 5 min</td></tr>
        <tr><td>« Mon fournisseur me convient »</td><td>Gardez-le et utilisez NDUGUMi comme solution de secours sans engagement</td></tr>
        <tr><td>« J'ai pas le temps »</td><td>« Puis-je revenir jeudi à 15h pour 5 minutes de démo ? »</td></tr>
      </tbody>
    </table>

    <h2>Grille de Scoring Rapide (0 à 12 points)</h2>
    <table>
      <thead>
        <tr>
          <th>Score</th>
          <th>Statut CRM</th>
          <th>Priorité</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>9 – 12 pts</td><td>Intéressé → Planifier démo immédiate</td><td>🔴 Haute</td></tr>
        <tr><td>5 – 8 pts</td><td>Contacté → Relance sous 7 jours</td><td>🟡 Normale</td></tr>
        <tr><td>0 – 4 pts</td><td>Contacté → Relance sous 30 jours</td><td>🟢 Basse</td></tr>
      </tbody>
    </table>

    <h2>Mémo Rapide Saisie CRM</h2>
    <table>
      <tbody>
        <tr><td><strong>Établissement :</strong> ________________________</td><td><strong>Date :</strong> ____/____/2026</td></tr>
        <tr><td><strong>Contact / Tél :</strong> ________________________</td><td><strong>Score :</strong> _____ / 12</td></tr>
        <tr><td><strong>Prochaine action :</strong> ________________________</td><td><strong>Agent :</strong> __________________</td></tr>
      </tbody>
    </table>
  `
  downloadWordDoc('NDUGUMi_Questionnaire_Qualification_Rapide.doc', 'Questionnaire de qualification NDUGUMi', html)
}

function generateStrategieCommercialeWord() {
  const html = `
    <div class="banner">
      <h1>NDUGUMi — Équipe Commerciale</h1>
      <p>Guide de Stratégie Commerciale Terrain (Format Modifiable Word)</p>
    </div>

    <h2>1. Proposition de Valeur NDUGUMi</h2>
    <table>
      <thead>
        <tr>
          <th>Ce que le restaurant GAGNE</th>
          <th>Ce qu'il arrête de PERDRE</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>⏱ Temps libéré — plus de déplacement au marché</td><td>💸 Coût du transport aller-retour quotidien</td></tr>
        <tr><td>📱 Commande simple depuis le téléphone</td><td>🕐 1 à 3 heures perdues chaque matin</td></tr>
        <tr><td>📦 Livraison directement en cuisine</td><td>🤦 Erreurs / oublis de l'employé envoyé</td></tr>
        <tr><td>💰 Prix transparents et stables affichés</td><td>📉 Marchandage épuisant, incertitude des prix</td></tr>
        <tr><td>🔁 Historique et suivi des dépenses</td><td>🗒 Gestion manuelle sur cahier / mémoire</td></tr>
      </tbody>
    </table>

    <h2>2. Les 4 Profils de Restaurateurs à Dakar</h2>
    <table>
      <thead>
        <tr>
          <th>Profil</th>
          <th>Description & Cible</th>
          <th>Pitch Conseillé</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>PROFIL 1 — Le Gérant Débordé ⭐⭐⭐</strong></td>
          <td>Fait tout lui-même (marché, cuisine, caisse). Cible prioritaire.</td>
          <td>« Je vois que vous gérez tout vous-même. NDUGUMi vous fait gagner 2h chaque matin. »</td>
        </tr>
        <tr>
          <td><strong>PROFIL 2 — Le Patron Qui Délègue ⭐⭐</strong></td>
          <td>Envoie un employé faire le marché chaque jour.</td>
          <td>« Avec NDUGUMi, c'est vous qui choisissez les produits et prix depuis votre téléphone. »</td>
        </tr>
        <tr>
          <td><strong>PROFIL 3 — Le Restaurateur Organisé ⭐</strong></td>
          <td>A déjà un fournisseur habituel.</td>
          <td>« Gardez votre fournisseur. NDUGUMi est votre secours en cas d'urgence ou manque. »</td>
        </tr>
        <tr>
          <td><strong>PROFIL 4 — Le Réfractaire au Numérique</strong></td>
          <td>N'utilise pas de smartphone.</td>
          <td>Laisser une carte et revenir dans 3 mois sans insister.</td>
        </tr>
      </tbody>
    </table>

    <h2>3. Le Cycle de Vente en 5 Étapes</h2>
    <ol>
      <li><strong>Repérage terrain :</strong> Identifier les prospects dans la zone grâce à la Carte CRM.</li>
      <li><strong>Premier contact (5-7 min) :</strong> Qualifier sans interrompre le service (éviter 11h30-14h).</li>
      <li><strong>Démo / Présentation (15-30 min) :</strong> Montrer l'application sur smartphone et calculer l'économie.</li>
      <li><strong>Inscription & 1ère commande :</strong> Accompagner le gérant pour passer une première commande test.</li>
      <li><strong>Suivi & Fidélisation :</strong> Appel systématique à J+1 après la première livraison.</li>
    </ol>

    <h2>4. Organisation d'une Journée Type</h2>
    <table>
      <thead>
        <tr>
          <th>Horaire</th>
          <th>Étape</th>
          <th>Objectif</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>07h00 – 09h00</td><td>Préparation</td><td>Consultation CRM, liste des visites, itinéraire GPS</td></tr>
        <tr><td>09h00 – 11h30</td><td>🔥 Tournée terrain 1</td><td>6 à 8 nouveaux contacts (1ers passages)</td></tr>
        <tr><td>11h30 – 14h00</td><td>⛔ Pause Service</td><td>Service dans les restaurants — Ne pas déranger !</td></tr>
        <tr><td>14h00 – 17h30</td><td>🔥 Visites de fond</td><td>3 à 5 démos approfondies & inscriptions</td></tr>
        <tr><td>17h30 – 18h30</td><td>Administratif</td><td>Mise à jour CRM, relances WhatsApp et bilan</td></tr>
      </tbody>
    </table>

    <h2>5. Objectifs Journaliers Minimum</h2>
    <ul>
      <li>Nouveaux prospects contactés : <strong>8 à 12</strong></li>
      <li>Démonstrations réalisées : <strong>2 à 4</strong></li>
      <li>Inscriptions & 1ères commandes : <strong>1 à 2</strong></li>
      <li>Relances effectuées (appels + WhatsApp) : <strong>10+</strong></li>
    </ul>

    <h2>6. Erreurs à Éviter sur le Terrain</h2>
    <table>
      <thead>
        <tr>
          <th>❌ Erreur fréquente</th>
          <th>✅ Bonne pratique</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Arriver pendant le service (11h30–14h)</td><td>Vérifier l'heure et repasser entre 14h et 16h</td></tr>
        <tr><td>Lire le questionnaire comme un formulaire sec</td><td>Poser les questions dans une discussion naturelle</td></tr>
        <tr><td>Parler trop, écouter peu</td><td>Pratiquer l'écoute active (70% écoute, 30% parole)</td></tr>
        <tr><td>Ne pas remplir le CRM le jour même</td><td>Enregistrer les notes et relances avant 19h</td></tr>
      </tbody>
    </table>
  `
  downloadWordDoc('NDUGUMi_Strategie_Commerciale.doc', 'Stratégie commerciale NDUGUMi', html)
}

/* ─────────────────────────────────────────────
   Composant principal — Page Ressources
───────────────────────────────────────────── */

const DOCS = [
  {
    id: 'fiche',
    icon: '📋',
    titre: 'Fiche d\'enquête terrain',
    sous_titre: 'Visite approfondie — 10 à 15 minutes',
    description:
      'Document complet à remplir lors d\'une visite terrain. Couvre l\'identification de l\'établissement, l\'approvisionnement actuel, les problèmes vécus, la réceptivité à NDUGUMi, et la synthèse commerciale.',
    sections: [
      'Identification de l\'établissement (type, zone, capacité)',
      'Contacts et décisionnaires',
      'Situation d\'approvisionnement (produits, fréquence, budget)',
      'Problèmes vécus aujourd\'hui',
      'Connaissance et réaction à NDUGUMi',
      'Observations terrain (usage interne)',
      'Synthèse & suite à donner → statuts CRM',
    ],
    color: '#7a1f1f',
    downloadPdf: generateFicheEnquete,
    downloadWord: generateFicheEnqueteWord,
  },
  {
    id: 'questionnaire',
    icon: '❓',
    titre: 'Questionnaire de qualification rapide',
    sous_titre: 'Premier contact — 5 à 7 minutes debout',
    description:
      'Guide conversationnel pour qualifier rapidement un prospect. Inclut les bonnes questions, l\'interprétation des réponses, les réponses aux objections et une grille de scoring 0–12 pour prioriser les relances.',
    sections: [
      'Accroche d\'introduction',
      '5 questions clés de qualification',
      'Guide d\'interprétation des réponses',
      'Réponses aux objections les plus fréquentes',
      'Grille de scoring 0–12',
      'Mémo rapide de saisie CRM',
    ],
    color: '#c0793a',
    downloadPdf: generateQuestionnaire,
    downloadWord: generateQuestionnaireWord,
  },
  {
    id: 'strategie',
    icon: '🚀',
    titre: 'Stratégie commerciale',
    sous_titre: 'Guide opérationnel complet',
    description:
      'Manuel de référence pour l\'équipe commerciale. Couvre les 4 profils de restaurateurs dakarois, le cycle de vente en 5 étapes, l\'organisation d\'une journée type, les techniques de persuasion adaptées et les KPIs.',
    sections: [
      'Proposition de valeur NDUGUMi',
      'Les 4 profils de restaurateurs à Dakar',
      'Le cycle de vente en 5 étapes',
      'Organisation d\'une journée type',
      'Techniques terrain adaptées (preuve sociale, calcul économies…)',
      'Objectifs journaliers et KPIs',
      'Erreurs à éviter',
    ],
    color: '#232a3b',
    downloadPdf: generateStrategieCommerciale,
    downloadWord: generateStrategieCommercialeWord,
  },
]

/* ── Templates WhatsApp de prospection (pour info) ── */
const WA_TEMPLATES = [
  {
    titre: 'Après visite — sans inscription',
    corps: `Bonjour {contact}, c'est {agent} de NDUGUMi.
Merci pour notre échange de ce jour. 

NDUGUMi vous permet de commander vos produits de marché (riz, huile, oignon, poisson...) depuis votre téléphone, avec livraison incluse 🚚

Pour essayer gratuitement : ndugumi.com

Je repasserai vous voir prochainement 🙏`,
  },
  {
    titre: 'Relance — sans réponse (7 jours)',
    corps: `Bonjour {contact}, je me permets de revenir vers vous pour NDUGUMi — {etablissement}.

Plusieurs restaurants de {quartier} ont commencé à utiliser notre service ce mois-ci et sont très satisfaits.

Souhaitez-vous qu'on fixe 10 minutes cette semaine pour une démonstration rapide ?`,
  },
  {
    titre: 'Après 1ère livraison réussie',
    corps: `Bonjour {contact} ! J'espère que votre commande NDUGUMi s'est bien passée 😊

N'hésitez pas à me dire si tout était bien — qualité, délai, quantités reçues.

Et dès que vous avez besoin de réapprovisionner, pensez à NDUGUMi ! 🛒`,
  },
]

export default function Ressources() {
  const [activeTab, setActiveTab] = useState<'docs' | 'wa'>('docs')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  function copyTemplate(corps: string, idx: number) {
    navigator.clipboard.writeText(corps).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    })
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ressources terrain</h1>
          <p className="page-subtitle">
            Fiches d'enquête, questionnaires et stratégie commerciale — téléchargeables en PDF et Word modifiable
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['docs', '📄 Documents (PDF & Word)'], ['wa', '💬 Templates WhatsApp']] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'btn' : 'btn secondary'}
            style={{ fontSize: 13 }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab : Documents PDF & Word ── */}
      {activeTab === 'docs' && (
        <>
          {/* Bannière explicative */}
          <div
            className="panel"
            style={{
              background: 'linear-gradient(135deg, #232a3b 0%, #303a52 100%)',
              color: '#fff',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 36 }}>📁</div>
              <div>
                <h3 style={{ color: '#fff', margin: '0 0 6px' }}>Kit terrain NDUGUMi</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#c7cede', maxWidth: 600 }}>
                  3 documents conçus pour les commerciaux sur le terrain à Dakar et en banlieue.
                  Chaque document est disponible en PDF prêt à imprimer et en format <strong>Microsoft Word (.doc) modifiable</strong>.
                  Ils s'articulent avec les statuts du CRM pour un suivi parfait.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {DOCS.map((doc) => (
              <div
                key={doc.id}
                className="panel"
                style={{ borderTop: `4px solid ${doc.color}`, display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{doc.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: doc.color }}>{doc.titre}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>{doc.sous_titre}</div>
                  </div>
                </div>

                <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  {doc.description}
                </p>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Contenu
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                    {doc.sections.map((s) => (
                      <li key={s} style={{ marginBottom: 3, color: 'var(--text)' }}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    className="btn"
                    style={{ background: doc.color, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', padding: '8px 10px', fontSize: 12 }}
                    onClick={doc.downloadPdf}
                    title="Télécharger au format PDF imprimable"
                  >
                    📄 Télécharger PDF
                  </button>
                  <button
                    className="btn secondary"
                    style={{ borderColor: doc.color, color: doc.color, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', padding: '8px 10px', fontSize: 12, fontWeight: 700 }}
                    onClick={doc.downloadWord}
                    title="Télécharger au format Word (.doc) modifiable"
                  >
                    📝 Télécharger Word
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Lien vers Workflow */}
          <div className="panel" style={{ background: '#faf7f2', marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <strong>💡 Comment utiliser ces documents ?</strong>
                <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '4px 0 0' }}>
                  Utilisez le <strong>questionnaire rapide</strong> au 1er contact → la <strong>fiche d'enquête</strong> lors de la visite approfondie → saisir les infos dans le CRM → sélectionner le bon statut. Consultez le <strong>Parcours client</strong> pour voir comment chaque étape s'enchaîne.
                </p>
              </div>
              <a href="/workflow">
                <button className="btn secondary small">Voir le Parcours client ↗</button>
              </a>
            </div>
          </div>
        </>
      )}

      {/* ── Tab : Templates WhatsApp ── */}
      {activeTab === 'wa' && (
        <>
          <div className="panel" style={{ background: '#e8f5e9', marginBottom: 16, borderLeft: '4px solid #1f8a4c' }}>
            <p style={{ margin: 0, fontSize: 12.5, color: '#1a5c34' }}>
              <strong>💡 Comment utiliser ces modèles ?</strong> Copiez le message, personnalisez les champs entre {'{}'} et collez-le dans WhatsApp.
              Pour l'envoi en masse avec personnalisation automatique, utilisez la page{' '}
              <a href="/communication" style={{ color: 'var(--primary)', fontWeight: 600 }}>Communication ↗</a>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {WA_TEMPLATES.map((t, idx) => (
              <div key={idx} className="panel" style={{ borderLeft: '4px solid #25d366' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>💬 {t.titre}</span>
                    <span className="zone-tag" style={{ marginLeft: 10 }}>WhatsApp</span>
                  </div>
                  <button
                    className="btn secondary small"
                    onClick={() => copyTemplate(t.corps, idx)}
                    style={copiedIdx === idx ? { background: '#e8f5e9', color: '#1f8a4c', border: '1px solid #1f8a4c' } : {}}
                  >
                    {copiedIdx === idx ? '✅ Copié !' : '📋 Copier'}
                  </button>
                </div>
                <div
                  style={{
                    background: '#fafafa',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 12.5,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    color: 'var(--text)',
                    lineHeight: 1.6,
                  }}
                >
                  {t.corps}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
                  Placeholders disponibles : <code style={{ background: '#f0e9de', padding: '1px 5px', borderRadius: 4 }}>{'{contact}'}</code>{' '}
                  <code style={{ background: '#f0e9de', padding: '1px 5px', borderRadius: 4 }}>{'{agent}'}</code>{' '}
                  <code style={{ background: '#f0e9de', padding: '1px 5px', borderRadius: 4 }}>{'{etablissement}'}</code>{' '}
                  <code style={{ background: '#f0e9de', padding: '1px 5px', borderRadius: 4 }}>{'{quartier}'}</code>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <a href="/communication">
              <button className="btn">
                Gérer tous les modèles & envois dans Communication ↗
              </button>
            </a>
          </div>
        </>
      )}
    </div>
  )
}
