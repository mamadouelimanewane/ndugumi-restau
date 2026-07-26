// Note : le code d'appel DeepSeek (et le rate-limiter ci-dessous) est dupliqué dans chacun des
// fichiers api/ai-*.ts (plutôt qu'importé d'un fichier partagé) car Vercel exclut du déploiement
// tout fichier/dossier préfixé par "_" dans /api — un import vers un tel fichier partagé fait
// planter la fonction au chargement du module (constaté en production : FUNCTION_INVOCATION_FAILED).

import { createClient } from '@supabase/supabase-js'

async function checkRateLimit(req: any, res: any, endpoint: string): Promise<boolean> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return true

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

async function callDeepSeekOnce(messages: { role: 'system' | 'user'; content: string }[]): Promise<string> {
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
      messages,
      temperature: 0.4,
      max_tokens: 500,
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

// Une réponse vide arrive occasionnellement (constaté sur d'autres endpoints IA de ce projet,
// ~1/3 des appels) sans rapport avec le contenu envoyé — une seconde tentative suffit en pratique.
async function callDeepSeek(messages: { role: 'system' | 'user'; content: string }[]): Promise<string> {
  try {
    return await callDeepSeekOnce(messages)
  } catch (e: any) {
    if (e?.message === 'Réponse DeepSeek vide') {
      return await callDeepSeekOnce(messages)
    }
    throw e
  }
}

// Contenu figé des fiches Académie (src/pages/Academie.tsx) recopié ici en contexte système —
// pas de récupération dynamique (le contenu est petit et change rarement), pour garder cet
// assistant strictement ancré sur les arguments/lexique réels déjà validés en interne.
const ACADEMIE_CONTEXT = `Tu es l'assistant commercial interne de NDUGUMi, une application de livraison de
marché pour restaurants à Dakar (Sénégal). Les restaurants sont des CLIENTS qui commandent leur "marché"
(riz, huile, légumes, viandes, poissons...) avec livraison incluse — ils ne vendent pas sur la plateforme.
Tu aides un commercial terrain à répondre vite à une question, en t'appuyant UNIQUEMENT sur les fiches de
formation officielles ci-dessous. Si la question sort de ce cadre, dis-le clairement plutôt que d'inventer un
argument ou un chiffre qui ne vient pas de ces fiches.

OBJECTIONS ET RÉPONSES OFFICIELLES :
1. "Le marché Tilène / Castors est moins cher !" → "Monsieur le Gérant, au marché Tilène, le sac de riz est
affiché à 22 500 FCFA. Mais ajoutez-y 4 000 FCFA de transporteur/taxi et 3 heures de temps de travail de votre
cuisinier. Chez NDUGUMi, le sac est livré dans votre cuisine à 21 500 FCFA tout compris. Vous gagnez 5 000 FCFA
par sac et votre cuisinier reste en cuisine pour préparer le service."
2. "Je n'ai pas le temps de commander sur une application." → "Nous configurons votre abonnement récurrent en 1
minute. Chaque lundi à 8h, votre panier type est préparé automatiquement. Il vous suffit de répondre VALIDER
sur WhatsApp."
3. "Et si la qualité du poisson ou des légumes ne me convient pas ?" → "Garantie 100% Satisfait ou Remplacé en
1 heure. Si un sac ou une caisse ne correspond pas à vos exigences à la livraison, le livreur vous le remplace
immédiatement."

LEXIQUE WOLOF COMMERCIAL :
- "Ndougou bi dafa yomb te dafa féèg" = Le marché est facile et très frais (rassurer sur la fraîcheur).
- "Livraison bi amul fay, ba ci biir cuisine bi" = La livraison est 100% gratuite jusque dans la cuisine
  (éliminer l'objection des frais de transport).
- "So beugé wàññi sa dépense, NDUGUMi moy solution bi" = Si tu veux réduire tes dépenses, NDUGUMi est la
  solution (phrase d'accroche d'ouverture de visite).
- "Fay par Wave wala Orange Money yomb na" = Le paiement par Wave ou Orange Money est très simple (pour
  faciliter la conclusion de la vente).

Réponds en français, de façon courte et directe (utilisable tel quel sur le terrain), en citant le lexique
Wolof pertinent si la question s'y prête.`

interface RequestBody {
  question: string
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' })
    return
  }

  if (!(await checkRateLimit(req, res, 'ai-academie'))) return

  try {
    const body = req.body as RequestBody
    const question = (body.question || '').trim()
    if (!question) {
      res.status(400).json({ error: 'Question vide.' })
      return
    }

    const reponse = await callDeepSeek([
      { role: 'system', content: ACADEMIE_CONTEXT },
      { role: 'user', content: question.slice(0, 500) },
    ])

    res.status(200).json({ reponse })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur inconnue' })
  }
}
