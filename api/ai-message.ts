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
  statut: string
  tags: string[]
  canal: 'whatsapp' | 'email'
  objectif: string
  recentNotes: { date: string; texte: string }[]
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' })
    return
  }

  try {
    const body = req.body as RequestBody

    const notesText = body.recentNotes
      .slice(0, 5)
      .map((n) => `- [${n.date.slice(0, 10)}] ${n.texte}`)
      .join('\n')

    const canalInstruction =
      body.canal === 'email'
        ? "Rédige un EMAIL professionnel (réponds en JSON avec les clés \"sujet\" et \"corps\")."
        : "Rédige un message WHATSAPP court et chaleureux, adapté à un échange informel mais professionnel (réponds en JSON avec les clés \"sujet\" (chaîne vide) et \"corps\")."

    const userPrompt = `Restaurant : ${body.etablissement}, quartier ${body.quartier}.
Statut commercial actuel : ${body.statut}.
Tags : ${body.tags.join(', ') || 'aucun'}.
Objectif de ce message : ${body.objectif || "reprendre contact et faire avancer la relation commerciale"}.

Derniers échanges connus :
${notesText || 'Aucun échange enregistré.'}

${canalInstruction}
Le message doit être personnalisé (mentionner le restaurant et son contexte), en français, sans exagération
commerciale, et donner une raison claire de répondre ou d'agir. Ne signe pas avec un nom d'agent (ce sera ajouté
séparément). Réponds uniquement avec l'objet JSON demandé, sans texte autour.`

    const raw = await callDeepSeek(
      [
        { role: 'system', content: NDUGUMI_CONTEXT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 500, json: true }
    )

    const parsed = JSON.parse(raw) as { sujet?: string; corps?: string }
    res.status(200).json({ sujet: parsed.sujet ?? '', corps: parsed.corps ?? '' })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur inconnue' })
  }
}
