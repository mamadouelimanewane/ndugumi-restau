// Note : le code d'appel DeepSeek (et le rate-limiter ci-dessous) est dupliqué dans chacun des
// 4 fichiers api/ai-*.ts (plutôt qu'importé d'un fichier partagé) car Vercel exclut du déploiement
// tout fichier/dossier préfixé par "_" dans /api — un import vers un tel fichier partagé fait
// planter la fonction au chargement du module (constaté en production : FUNCTION_INVOCATION_FAILED).

import { createClient } from '@supabase/supabase-js'

// Endpoint IA public sans authentification : protège contre l'abus de coûts DeepSeek
// (pas contre une fuite de données, ces routes ne lisent/écrivent aucune donnée sensible).
async function checkRateLimit(req: any, res: any, endpoint: string): Promise<boolean> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return true // pas de DB dispo : on laisse passer plutôt que de casser la fonctionnalité

  try {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
    const now = Date.now()
    const minuteBucket = Math.floor(now / 60000)
    const dayBucket = Math.floor(now / 86400000)
    const supabase = createClient(url, key)

    const { data: ipCount } = await supabase.rpc('increment_rate_limit', {
      p_key: `${endpoint}:ip:${ip}:${minuteBucket}`,
      p_window_start: new Date(minuteBucket * 60000).toISOString(),
    })
    if ((ipCount ?? 0) > 15) {
      res.status(429).json({ error: 'Trop de requêtes IA depuis cette connexion, réessayez dans une minute.' })
      return false
    }

    const { data: dayCount } = await supabase.rpc('increment_rate_limit', {
      p_key: `${endpoint}:day:${dayBucket}`,
      p_window_start: new Date(dayBucket * 86400000).toISOString(),
    })
    if ((dayCount ?? 0) > 300) {
      res.status(429).json({ error: 'Quota IA quotidien atteint pour cette fonctionnalité, réessayez demain.' })
      return false
    }
  } catch (e) {
    console.error('Erreur rate-limit (ignorée, requête autorisée)', e)
  }

  return true
}

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

  if (!(await checkRateLimit(req, res, 'ai-voice'))) return

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
