// Regroupe list/add/ocr/analyze dans un seul fichier (routage par ?action=) pour rester sous la
// limite de 12 fonctions serverless du plan Vercel Hobby — même pattern que api/weekly-report.ts.

import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurées côté serveur')
  }
  return createClient(url, key)
}

async function checkRateLimit(req: any, res: any, endpoint: string, dayLimit = 300): Promise<boolean> {
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
    if ((ipCount ?? 0) > 20) {
      res.status(429).json({ error: 'Trop de requêtes depuis cette connexion, réessayez dans une minute.' })
      return false
    }

    const { data: dayCount } = await supabase.rpc('increment_rate_limit', {
      p_key: `${endpoint}:day:${dayBucket}`,
      p_window_start: new Date(dayBucket * 86400000).toISOString(),
    })
    if ((dayCount ?? 0) > dayLimit) {
      res.status(429).json({ error: 'Quota quotidien atteint, réessayez demain.' })
      return false
    }
  } catch (e) {
    console.error('Erreur rate-limit (ignorée)', e)
  }
  return true
}

async function callDeepSeekOnce(messages: { role: 'system' | 'user'; content: string }[], maxTokens: number): Promise<string> {
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
      temperature: 0.3,
      max_tokens: maxTokens,
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

// Une réponse vide arrive occasionnellement (constaté sur la veille web, ~1/3 des appels) sans
// rapport avec le contenu envoyé — une seconde tentative suffit systématiquement en pratique.
async function callDeepSeek(messages: { role: 'system' | 'user'; content: string }[], maxTokens: number): Promise<string> {
  try {
    return await callDeepSeekOnce(messages, maxTokens)
  } catch (e: any) {
    if (e?.message === 'Réponse DeepSeek vide') {
      return await callDeepSeekOnce(messages, maxTokens)
    }
    throw e
  }
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('Réponse IA incomplète ou mal formée — réessayez.')
  }
}

// Veille web réelle via Perplexity (modèles "sonar" : recherche web en direct + synthèse) —
// DeepSeek ne supporte aucune recherche web (vérifié empiriquement), Perplexity comble ce manque.
async function callPerplexity(question: string): Promise<{ content: string; citations: string[] }> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY non configurée côté serveur')
  }

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content:
            'Tu réponds uniquement avec des prix réels trouvés sur le web, avec leur source. Si tu ne trouves pas de prix fiable et récent, dis-le clairement plutôt que d\'inventer un chiffre.',
        },
        { role: 'user', content: question },
      ],
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Erreur Perplexity (${res.status}) : ${text.slice(0, 300)}`)
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; citations?: string[] }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Réponse Perplexity vide')
  return { content, citations: data.citations ?? [] }
}

const WEB_WATCH_PRODUCTS = [
  { produit: 'Riz brisé parfumé', unite: 'sac 25kg' },
  { produit: 'Huile végétale', unite: 'bidon 20L' },
  { produit: 'Oignon', unite: 'sac 25kg' },
  { produit: 'Pomme de terre', unite: 'sac 25kg' },
  { produit: 'Concentré de tomate', unite: 'carton' },
  { produit: 'Sucre', unite: 'sac 50kg' },
]

async function handleWebWatch(req: any, res: any) {
  const supabase = getAdminClient()
  const results: any[] = []

  for (const { produit, unite } of WEB_WATCH_PRODUCTS) {
    try {
      const question = `Quel est le prix actuel (le plus récent possible) du produit "${produit}" (${unite}) à Dakar, Sénégal ? Cherche sur Auchan.sn en priorité, et sur d'autres sources web fiables sur les prix des marchés de Dakar (Tilène, Castors, Sandaga) si disponible. Réponds avec le prix en FCFA le plus précis trouvé et le nom du site/source où tu l'as trouvé. Si aucun prix fiable n'est trouvé, dis-le clairement.`
      const { content, citations } = await callPerplexity(question)

      const extractPrompt = `Voici la réponse d'une recherche web sur le prix de "${produit}" à Dakar :
"""
${content.slice(0, 1500)}
"""
Réponds UNIQUEMENT en JSON : {"prix": number ou null si aucun prix fiable trouvé, "source": string (nom du site/enseigne mentionné, sinon "Web")}. N'invente aucun prix qui ne soit pas explicitement mentionné dans le texte ci-dessus.`
      const raw = await callDeepSeek([{ role: 'user', content: extractPrompt }], 150)
      const parsed = safeJsonParse(raw) as { prix?: number | null; source?: string }

      if (parsed.prix && parsed.prix > 0) {
        const { error } = await supabase.from('market_prices').insert({
          produit,
          categorie: null,
          prix: parsed.prix,
          unite,
          source: `${parsed.source || 'Web'} (veille IA)`,
          methode: 'web',
          releve_par: 'Système (Perplexity)',
        })
        if (error) throw error
        results.push({ produit, ok: true, prix: parsed.prix, source: parsed.source, citations })
      } else {
        results.push({ produit, ok: false, reason: 'Aucun prix fiable trouvé' })
      }
    } catch (e: any) {
      results.push({ produit, ok: false, error: e?.message })
    }
  }

  res.status(200).json({ results })
}

async function handleOcr(req: any, res: any) {
  if (!(await checkRateLimit(req, res, 'market-prices-ocr'))) return

  const body = req.body as { ocrText?: string }
  const ocrText = (body.ocrText || '').trim()
  if (!ocrText) {
    res.status(400).json({ error: 'Aucun texte détecté sur la photo (OCR vide). Essayez une photo plus nette.' })
    return
  }

  const prompt = `Voici le texte brut extrait par OCR d'une photo prise sur le terrain à Dakar : étiquette de prix,
ticket de caisse, ou pancarte de marché (Tilène, Castors, Sandaga, supermarché...). Le texte peut contenir des
erreurs de reconnaissance : fais de ton mieux, mais n'invente rien qui ne soit pas suggéré par le texte.

Texte OCR brut :
"""
${ocrText.slice(0, 2000)}
"""

Réponds UNIQUEMENT en JSON avec les clés suivantes (peut contenir PLUSIEURS lignes de produits) :
- "lignes": tableau de {"produit": string, "prix": number, "unite": string (ex: "kg", "sac 25kg", "litre", "pièce"), "categorie": string (une catégorie courte : "Céréales", "Huiles", "Légumes", "Fruits", "Viandes", "Poissons", "Fruits de mer", "Fromagerie", "Épicerie", "Boissons", "Produits locaux", ou autre pertinente)}
- "sourceProbable": nom du lieu/enseigne si visible sur le texte (ex: "Auchan", "Marché Tilène"), sinon chaîne vide

Ne renvoie que des lignes où un prix numérique est clairement identifiable dans le texte — n'invente aucune ligne.`

  const raw = await callDeepSeek([{ role: 'user', content: prompt }], 500)
  const parsed = safeJsonParse(raw) as {
    lignes?: { produit?: string; prix?: number; unite?: string; categorie?: string }[]
    sourceProbable?: string
  }

  const lignes = (parsed.lignes ?? [])
    .filter((l) => l.produit && typeof l.prix === 'number' && l.prix > 0)
    .map((l) => ({ produit: l.produit!, prix: l.prix!, unite: l.unite || 'unité', categorie: l.categorie || '' }))

  res.status(200).json({ lignes, sourceProbable: parsed.sourceProbable || '' })
}

async function handleAnalyze(req: any, res: any) {
  if (!(await checkRateLimit(req, res, 'market-prices-analyze', 100))) return

  const body = req.body as {
    entries: { produit: string; prix: number; unite: string; source: string; methode: string; created_at: string }[]
  }
  const entries = body.entries || []
  if (entries.length === 0) {
    res.status(400).json({ error: 'Aucun relevé à analyser.' })
    return
  }

  const dataText = entries
    .slice(0, 150)
    .map((e) => `- ${e.produit} | ${e.prix} FCFA / ${e.unite} | source: ${e.source} | ${e.created_at.slice(0, 10)}`)
    .join('\n')

  const prompt = `Voici l'historique réel des relevés de prix collectés par une équipe commerciale à Dakar
(marchés locaux, supermarchés, saisis manuellement ou via photo). Chaque ligne est un relevé réel, pas une
invention :

${dataText}

Analyse ces données et réponds UNIQUEMENT en JSON avec la clé "produits", un tableau d'objets, un par produit
distinct présent dans les données ci-dessus :
{"produit": string, "tendance": "hausse"|"baisse"|"stable", "variationApprox": string (ex: "+8%", "-3%", "0%",
calculée en comparant le relevé le plus ancien et le plus récent de ce produit dans les données fournies),
"recoupement": string (1-2 phrases comparant les différentes sources trouvées pour ce produit dans les données),
"conseil": string (1 phrase d'action concrète pour un commercial NDUGUMi, basée uniquement sur ces vraies données)}

Ne calcule une tendance/variation que si au moins 2 relevés du même produit existent dans les données ; sinon
mets "tendance":"stable" et "variationApprox":"" et concentre le conseil sur le seul relevé disponible. Ne
mentionne aucune source ou donnée qui n'apparaît pas explicitement dans la liste ci-dessus.`

  const raw = await callDeepSeek([{ role: 'user', content: prompt }], 900)
  const parsed = safeJsonParse(raw) as { produits?: any[] }
  res.status(200).json({ produits: parsed.produits ?? [] })
}

export default async function handler(req: any, res: any) {
  try {
    const action = req.query?.action

    if (req.method === 'POST' && action === 'ocr') return await handleOcr(req, res)
    if (req.method === 'POST' && action === 'analyze') return await handleAnalyze(req, res)
    if (req.method === 'GET' && action === 'webwatch') return await handleWebWatch(req, res)

    const supabase = getAdminClient()

    if (req.method === 'GET') {
      const produit = req.query?.produit
      let query = supabase.from('market_prices').select('*').order('created_at', { ascending: false }).limit(500)
      if (produit) query = query.ilike('produit', `%${produit}%`)
      const { data, error } = await query
      if (error) throw error
      res.status(200).json({ entries: data ?? [] })
      return
    }

    if (req.method === 'POST') {
      if (!(await checkRateLimit(req, res, 'market-prices'))) return

      const body = req.body as {
        produit?: string
        categorie?: string
        prix?: number
        unite?: string
        source?: string
        methode?: 'manuel' | 'photo_ocr' | 'web'
        relevePar?: string
      }
      const produit = (body.produit || '').trim()
      const unite = (body.unite || '').trim()
      const source = (body.source || '').trim()
      const prix = Number(body.prix)

      if (!produit || !unite || !source || !Number.isFinite(prix) || prix <= 0) {
        res.status(400).json({ error: 'Produit, prix, unité et source sont obligatoires (prix > 0).' })
        return
      }

      const { data, error } = await supabase
        .from('market_prices')
        .insert({
          produit: produit.slice(0, 150),
          categorie: (body.categorie || '').trim().slice(0, 80) || null,
          prix,
          unite: unite.slice(0, 60),
          source: source.slice(0, 120),
          methode: body.methode || 'manuel',
          releve_par: (body.relevePar || '').trim().slice(0, 80) || null,
        })
        .select()
        .single()
      if (error) throw error
      res.status(200).json({ entry: data })
      return
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id
      if (!id) {
        res.status(400).json({ error: 'Paramètre "id" manquant' })
        return
      }
      const { error } = await supabase.from('market_prices').delete().eq('id', id)
      if (error) throw error
      res.status(200).json({ ok: true })
      return
    }

    res.status(405).json({ error: 'Méthode non autorisée' })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur inconnue' })
  }
}
