import { callDeepSeek, NDUGUMI_CONTEXT } from './_lib/deepseek'

interface RequestBody {
  etablissement: string
  quartier: string
  zone: string
  statut: string
  agent: string
  prochaineRelance: string | null
  tags: string[]
  notes: { date: string; type: string; texte: string }[]
  tasks: { titre: string; dateEcheance: string; statut: string }[]
  ndugumiInscrit: boolean
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' })
    return
  }

  try {
    const body = req.body as RequestBody

    const notesText = body.notes
      .slice(0, 10)
      .map((n) => `- [${n.date.slice(0, 10)}] (${n.type}) ${n.texte}`)
      .join('\n')
    const tasksText = body.tasks
      .slice(0, 5)
      .map((t) => `- ${t.titre} (échéance ${t.dateEcheance}, ${t.statut})`)
      .join('\n')

    const userPrompt = `Voici la fiche d'un restaurant prospecté :
Établissement : ${body.etablissement}
Quartier / zone : ${body.quartier} (${body.zone})
Statut commercial : ${body.statut}
Agent assigné : ${body.agent || 'Non assigné'}
Prochaine relance prévue : ${body.prochaineRelance ?? 'aucune'}
Tags : ${body.tags.join(', ') || 'aucun'}
Utilise déjà NDUGUMi : ${body.ndugumiInscrit ? 'oui' : 'non'}

Historique des interactions (les plus récentes) :
${notesText || 'Aucune interaction enregistrée.'}

Tâches en cours :
${tasksText || 'Aucune tâche.'}

Rédige un résumé court (4 à 6 phrases, en français) pour qu'un commercial se remette dans le contexte avant
d'appeler ou de visiter ce restaurant : où en est-on, ce qui a été dit ou fait de notable, et quelle est la
meilleure prochaine action concrète à mener.`

    const summary = await callDeepSeek(
      [
        { role: 'system', content: NDUGUMI_CONTEXT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.4, maxTokens: 400 }
    )

    res.status(200).json({ summary: summary.trim() })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur inconnue' })
  }
}
