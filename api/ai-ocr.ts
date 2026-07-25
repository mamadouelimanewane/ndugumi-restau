// Note : le code d'appel DeepSeek (et le rate-limiter ci-dessous) est dupliqué dans chacun des
// fichiers api/ai-*.ts (plutôt qu'importé d'un fichier partagé) car Vercel exclut du déploiement
// tout fichier/dossier préfixé par "_" dans /api — un import vers un tel fichier partagé fait
// planter la fonction au chargement du module (constaté en production : FUNCTION_INVOCATION_FAILED).
//
// Pas de Vision IA ici : testé empiriquement, l'API DeepSeek actuelle rejette tout content
// multimodal (image_url/image), quel que soit le format essayé — "unknown variant, expected
// `text`". Le texte est donc extrait côté navigateur par OCR réel (Tesseract.js, voir
// OcrScanModal.tsx), puis structuré ici par DeepSeek (texte uniquement).

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

async function callDeepSeek(messages: { role: 'system' | 'user'; content: string }[]): Promise<string> {
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
      temperature: 0.2,
      max_tokens: 400,
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

interface RequestBody {
  ocrText: string
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' })
    return
  }

  if (!(await checkRateLimit(req, res, 'ai-ocr'))) return

  try {
    const body = req.body as RequestBody
    const ocrText = (body.ocrText || '').trim()
    if (!ocrText) {
      res.status(400).json({ error: 'Aucun texte détecté sur la photo (OCR vide). Essayez une photo plus nette.' })
      return
    }

    const prompt = `Voici le texte brut extrait par OCR d'une photo (carte de visite, devanture ou menu d'un
restaurant à Dakar/Sénégal). Le texte peut contenir des erreurs de reconnaissance (lettres mal lues, mots
coupés) : fais de ton mieux pour interpréter malgré ça, mais n'invente rien qui ne soit pas suggéré par le texte.

Texte OCR brut :
"""
${ocrText.slice(0, 3000)}
"""

Réponds UNIQUEMENT en JSON avec les clés suivantes :
- "etablissement": nom du restaurant si identifiable (chaîne vide sinon)
- "telephone": numéro de téléphone si présent dans le texte (chaîne vide sinon — n'invente rien)
- "quartier": quartier ou ville mentionné (chaîne vide sinon)
- "zone": "Dakar intra-muros" ou "Banlieue" — déduis du quartier si possible, sinon "Dakar intra-muros"
- "tags": tableau de 2 à 4 mots-clés courts sur le type de cuisine/établissement déduits du texte (ex: "Dibiterie", "Fast-food", "Thiéboudiène")`

    const raw = await callDeepSeek([{ role: 'user', content: prompt }])
    let parsed: {
      etablissement?: string
      telephone?: string
      quartier?: string
      zone?: string
      tags?: string[]
    }
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('Réponse IA incomplète ou mal formée — réessayez.')
    }

    res.status(200).json({
      etablissement: parsed.etablissement ?? '',
      telephone: parsed.telephone ?? '',
      quartier: parsed.quartier ?? '',
      zone: parsed.zone === 'Banlieue' ? 'Banlieue' : 'Dakar intra-muros',
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 4) : [],
    })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur inconnue' })
  }
}
