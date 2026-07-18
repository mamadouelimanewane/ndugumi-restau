import { callDeepSeek, NDUGUMI_CONTEXT } from './_lib/deepseek'

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
