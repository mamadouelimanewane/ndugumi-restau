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
      model: 'deepseek-v4-flash',
      thinking: { type: 'disabled' },
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

  if (!(await checkRateLimit(req, res, 'ai-score'))) return

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
