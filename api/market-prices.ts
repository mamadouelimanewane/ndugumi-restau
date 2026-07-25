// Regroupe list/add/ocr/analyze/webwatch dans un seul fichier (routage par ?action=) pour rester
// sous la limite de 12 fonctions serverless du plan Vercel Hobby — même pattern que
// api/weekly-report.ts.

import { createClient } from '@supabase/supabase-js'

// Durée max demandée pour cette fonction (utile pour ?action=webwatch, qui traite une longue
// liste de produits) — Vercel plafonne selon le plan (jusqu'à 60s sur Hobby).
export const config = { maxDuration: 60 }

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

// Liste large couvrant les besoins réels d'un restaurant à Dakar (pas seulement le catalogue
// NDUGUMi) — étendue sur demande explicite pour couvrir toutes les catégories alimentaires.
const WEB_WATCH_PRODUCTS = [
  // Céréales & féculents
  { produit: 'Riz brisé parfumé', unite: 'sac 25kg', categorie: 'Céréales' },
  { produit: 'Riz parfumé entier', unite: 'sac 25kg', categorie: 'Céréales' },
  { produit: 'Mil', unite: 'sac 50kg', categorie: 'Céréales' },
  { produit: 'Pain de boulangerie', unite: 'unité (baguette)', categorie: 'Céréales' },
  { produit: 'Spaghetti / pâtes alimentaires', unite: 'carton', categorie: 'Céréales' },
  { produit: 'Couscous', unite: 'sac 25kg', categorie: 'Céréales' },
  // Huiles
  { produit: 'Huile végétale', unite: 'bidon 20L', categorie: 'Huiles' },
  { produit: "Huile d'arachide", unite: 'bidon 20L', categorie: 'Huiles' },
  // Légumes
  { produit: 'Oignon', unite: 'sac 25kg', categorie: 'Légumes' },
  { produit: 'Pomme de terre', unite: 'sac 25kg', categorie: 'Légumes' },
  { produit: 'Ail', unite: 'kg', categorie: 'Légumes' },
  { produit: 'Gingembre', unite: 'kg', categorie: 'Légumes' },
  { produit: 'Chou', unite: 'kg', categorie: 'Légumes' },
  { produit: 'Carotte', unite: 'kg', categorie: 'Légumes' },
  { produit: 'Aubergine', unite: 'kg', categorie: 'Légumes' },
  { produit: 'Gombo', unite: 'kg', categorie: 'Légumes' },
  { produit: 'Poivron', unite: 'kg', categorie: 'Légumes' },
  { produit: 'Manioc', unite: 'kg', categorie: 'Légumes' },
  // Fruits
  { produit: 'Banane', unite: 'kg', categorie: 'Fruits' },
  { produit: 'Mangue', unite: 'kg', categorie: 'Fruits' },
  { produit: 'Orange', unite: 'kg', categorie: 'Fruits' },
  { produit: 'Citron', unite: 'kg', categorie: 'Fruits' },
  // Viandes
  { produit: 'Poulet entier congelé', unite: 'carton 10 pièces', categorie: 'Viandes' },
  { produit: 'Bœuf', unite: 'kg', categorie: 'Viandes' },
  { produit: 'Mouton', unite: 'kg', categorie: 'Viandes' },
  // Poissons
  { produit: 'Thiof', unite: 'kg', categorie: 'Poissons' },
  { produit: 'Yaboy (sardinelle)', unite: 'kg', categorie: 'Poissons' },
  { produit: 'Capitaine', unite: 'kg', categorie: 'Poissons' },
  // Fruits de mer
  { produit: 'Crevettes', unite: 'kg', categorie: 'Fruits de mer' },
  // Fromagerie
  { produit: 'Fromage La Vache qui rit', unite: 'carton', categorie: 'Fromagerie' },
  { produit: 'Lait en poudre', unite: 'carton', categorie: 'Fromagerie' },
  { produit: 'Beurre', unite: 'kg', categorie: 'Fromagerie' },
  { produit: 'Margarine', unite: 'kg', categorie: 'Fromagerie' },
  { produit: 'Emmental râpé', unite: 'kg', categorie: 'Fromagerie' },
  { produit: 'Yaourt', unite: 'carton', categorie: 'Fromagerie' },
  { produit: 'Crème fraîche/crème liquide', unite: 'litre', categorie: 'Fromagerie' },
  // Épicerie (issus notamment du catalogue Auchan importé le 21/07/2026)
  { produit: 'Concentré de tomate', unite: 'carton', categorie: 'Épicerie' },
  { produit: 'Sucre', unite: 'sac 50kg', categorie: 'Épicerie' },
  { produit: 'Cube Maggi/Jumbo', unite: 'carton', categorie: 'Épicerie' },
  { produit: 'Sel', unite: 'sac', categorie: 'Épicerie' },
  { produit: 'Lentilles', unite: 'kg', categorie: 'Épicerie' },
  { produit: 'Farine de blé', unite: 'sac 50kg', categorie: 'Épicerie' },
  { produit: 'Café soluble', unite: 'carton', categorie: 'Épicerie' },
  // Boissons
  { produit: 'Eau minérale', unite: 'pack de 12', categorie: 'Boissons' },
  { produit: 'Jus de fruits', unite: 'carton', categorie: 'Boissons' },
  { produit: 'Eau gazeuse', unite: 'carton', categorie: 'Boissons' },
  // Combustible
  { produit: 'Bouteille de gaz 12kg', unite: 'bouteille', categorie: 'Combustible' },
  // Produits locaux
  { produit: 'Bissap séché', unite: 'kg', categorie: 'Produits locaux' },
  { produit: 'Nététou', unite: 'kg', categorie: 'Produits locaux' },
]

async function processOneWebWatchProduct(
  supabase: ReturnType<typeof getAdminClient>,
  produit: string,
  unite: string,
  categorie: string
) {
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
        categorie,
        prix: parsed.prix,
        unite,
        source: `${parsed.source || 'Web'} (veille IA)`,
        methode: 'web',
        releve_par: 'Système (Perplexity)',
      })
      if (error) throw error
      return { produit, ok: true, prix: parsed.prix, source: parsed.source, citations }
    }
    return { produit, ok: false, reason: 'Aucun prix fiable trouvé' }
  } catch (e: any) {
    return { produit, ok: false, error: e?.message }
  }
}

// Traite les produits par petits lots en parallèle (pas un par un, pas tous à la fois) : la liste
// complète dépasserait largement la limite de durée d'une fonction serverless si elle était
// traitée séquentiellement (chaque produit fait 2 appels réseau — Perplexity puis DeepSeek —
// qui prennent chacun plusieurs secondes). Le lot peut aussi être restreint via ?offset=&limit=
// pour étaler manuellement le travail si la liste s'allonge encore.
function getIsoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

async function handleWebWatch(req: any, res: any) {
  const supabase = getAdminClient()
  const CRON_BATCH_SIZE = 16

  let offset: number
  let limit: number
  if (req.query?.offset !== undefined || req.query?.limit !== undefined) {
    // Appel explicite (bouton "Lancer la veille web IA", qui boucle lui-même sur plusieurs lots).
    offset = Number(req.query?.offset) || 0
    limit = Number(req.query?.limit) || WEB_WATCH_PRODUCTS.length
  } else {
    // Appel du Cron (une fois par semaine, sans paramètres) : traite un lot tournant plutôt que
    // toute la liste d'un coup — trop long pour une seule invocation serverless (limite ~60s).
    // Le lot change chaque semaine (basé sur le numéro de semaine ISO) pour couvrir progressivement
    // tous les produits au fil des semaines plutôt que de rafraîchir seulement les premiers.
    const totalBatches = Math.ceil(WEB_WATCH_PRODUCTS.length / CRON_BATCH_SIZE)
    const weekIndex = getIsoWeekNumber(new Date()) % totalBatches
    offset = weekIndex * CRON_BATCH_SIZE
    limit = CRON_BATCH_SIZE
  }
  const batch = WEB_WATCH_PRODUCTS.slice(offset, offset + limit)

  const CHUNK_SIZE = 8
  const results: any[] = []
  for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
    const chunk = batch.slice(i, i + CHUNK_SIZE)
    const chunkResults = await Promise.all(
      chunk.map(({ produit, unite, categorie }) => processOneWebWatchProduct(supabase, produit, unite, categorie))
    )
    results.push(...chunkResults)
  }

  res.status(200).json({ results, total: WEB_WATCH_PRODUCTS.length, processed: batch.length })
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
distinct présent dans les données ci-dessus. Réponses COURTES (moins de 15 mots par phrase) car la liste peut
être longue :
{"produit": string, "tendance": "hausse"|"baisse"|"stable", "variationApprox": string (ex: "+8%", "-3%", "0%",
calculée en comparant le relevé le plus ancien et le plus récent de ce produit dans les données fournies),
"recoupement": string (une phrase courte comparant les sources trouvées pour ce produit),
"conseil": string (une phrase courte d'action concrète pour un commercial NDUGUMi)}

Ne calcule une tendance/variation que si au moins 2 relevés du même produit existent dans les données ; sinon
mets "tendance":"stable" et "variationApprox":"" et concentre le conseil sur le seul relevé disponible. Ne
mentionne aucune source ou donnée qui n'apparaît pas explicitement dans la liste ci-dessus.`

  // max_tokens généreux : jusqu'à ~40 produits distincts à analyser en une seule réponse JSON.
  // Une limite trop basse ici s'est avérée provoquer soit une réponse vide, soit un JSON tronqué
  // (testé à 900 puis 3000 — toujours insuffisant avec des phrases longues sur ~35 produits).
  const raw = await callDeepSeek([{ role: 'user', content: prompt }], 4000)
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
