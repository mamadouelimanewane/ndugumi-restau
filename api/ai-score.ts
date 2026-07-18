import { callDeepSeek, NDUGUMI_CONTEXT } from './_lib/deepseek'

interface RequestBody {
  etablissement: string
  quartier: string
  statut: string
  hasContact: boolean
  tags: string[]
  notes: { date: string; type: string; texte: string }[]
  overdueTasks: number
  overdueRelance: boolean
  quartierClientsCount: number
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' })
    return
  }

  try {
    const body = req.body as RequestBody

    const notesText = body.notes
      .slice(0, 8)
      .map((n) => `- [${n.date.slice(0, 10)}] (${n.type}) ${n.texte}`)
      .join('\n')

    const userPrompt = `Évalue la probabilité de conversion de ce prospect (le faire adopter NDUGUMi), sur la base de son
profil. Réponds uniquement en JSON avec les clés "score" (entier de 0 à 100), "raison" (1-2 phrases en français
expliquant le score), et "prochaineAction" (1 phrase concrète, en français, sur la meilleure action à mener maintenant).

Établissement : ${body.etablissement}
Quartier : ${body.quartier} (${body.quartierClientsCount} client(s) NDUGUMi déjà actif(s) dans ce quartier)
Statut commercial : ${body.statut}
Contact identifié (nom/téléphone d'un responsable) : ${body.hasContact ? 'oui' : 'non'}
Tags : ${body.tags.join(', ') || 'aucun'}
Tâches en retard : ${body.overdueTasks}
Relance en retard : ${body.overdueRelance ? 'oui' : 'non'}

Historique des interactions :
${notesText || 'Aucune interaction enregistrée.'}`

    const raw = await callDeepSeek(
      [
        { role: 'system', content: NDUGUMI_CONTEXT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.3, maxTokens: 300, json: true }
    )

    const parsed = JSON.parse(raw) as { score?: number; raison?: string; prochaineAction?: string }
    const score = Math.max(0, Math.min(100, Math.round(parsed.score ?? 0)))
    res.status(200).json({ score, raison: parsed.raison ?? '', prochaineAction: parsed.prochaineAction ?? '' })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur inconnue' })
  }
}
