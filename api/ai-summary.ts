// Note : le code d'appel DeepSeek est dupliqué dans chacun des 3 fichiers api/ai-*.ts
// (plutôt qu'importé d'un fichier partagé) car Vercel exclut du déploiement tout fichier/dossier
// préfixé par "_" dans /api — un import vers un tel fichier partagé fait planter la fonction
// au chargement du module (constaté en production : FUNCTION_INVOCATION_FAILED).

interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

interface CallOptions {
  temperature?: number
  maxTokens?: number
  json?: boolean
}

async function callDeepSeek(messages: ChatMessage[], opts: CallOptions = {}): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY non configurée côté serveur')
  }

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: opts.temperature ?? 0.5,
      max_tokens: opts.maxTokens ?? 600,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Erreur DeepSeek (${res.status}) : ${text.slice(0, 300)}`)
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Réponse DeepSeek vide')
  return content
}

const NDUGUMI_CONTEXT =
  "Contexte : NDUGUMi est une application mobile de livraison à Dakar (Sénégal). Les restaurants sont des CLIENTS " +
  "qui utilisent l'application pour commander leur « marché » (produits alimentaires : riz, huile, légumes, viandes, " +
  "poissons…) avec livraison incluse dans le prix — ils ne vendent PAS sur la plateforme. Tu écris pour une équipe " +
  "commerciale interne qui prospecte ces restaurants à Dakar et en banlieue pour les faire adopter l'application."

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
