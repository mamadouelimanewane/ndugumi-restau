interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

async function callDeepSeek(messages: ChatMessage[]): Promise<string> {
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
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: 'json_object' },
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' })
    return
  }

  try {
    const { transcriptText, etablissement } = req.body

    const userPrompt = `Analyse cette transcription vocale de terrain pour le restaurant "${etablissement}" (en Wolof ou Français).
Transcription : "${transcriptText}"

Réponds en JSON avec les clés suivantes :
- "langue": langue détectée (ex: "Wolof", "Français", "Wolof / Français mixte")
- "resumeIA": résumé professionnel et synthétique de la visite (2 phrases max en français)
- "relanceSuggereeDate": date ISO estimée sous forme yyyy-mm-dd si une relance ou livraison est mentionnée (sinon null)`

    const raw = await callDeepSeek([
      { role: 'system', content: "Tu es un assistant CRM commercial à Dakar." },
      { role: 'user', content: userPrompt },
    ])

    const parsed = JSON.parse(raw)
    res.status(200).json(parsed)
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur inconnue' })
  }
}
