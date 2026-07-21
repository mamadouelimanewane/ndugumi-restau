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
    download: generateFicheEnquete,
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
    download: generateQuestionnaire,
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
    download: generateStrategieCommerciale,
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
            Fiches d'enquête, questionnaires et stratégie commerciale — téléchargeables en PDF
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['docs', '📄 Documents PDF'], ['wa', '💬 Templates WhatsApp']] as const).map(([tab, label]) => (
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

      {/* ── Tab : Documents PDF ── */}
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
                  Chaque PDF est prêt à imprimer et à utiliser lors des visites de prospection.
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

                <button
                  className="btn"
                  style={{ marginTop: 'auto', background: doc.color, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
                  onClick={doc.download}
                >
                  ⬇️ Télécharger le PDF
                </button>
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
