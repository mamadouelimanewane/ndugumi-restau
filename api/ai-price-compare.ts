// Note : le code d'appel DeepSeek (et le rate-limiter ci-dessous) est dupliqué dans chacun des
// fichiers api/ai-*.ts (plutôt qu'importé d'un fichier partagé) car Vercel exclut du déploiement
// tout fichier/dossier préfixé par "_" dans /api — un import vers un tel fichier partagé fait
// planter la fonction au chargement du module (constaté en production : FUNCTION_INVOCATION_FAILED).
//
// Pas de Vision IA ici : testé empiriquement, l'API DeepSeek actuelle rejette tout content
// multimodal (image_url/image) — "unknown variant, expected `text`". Le texte de la facture est
// donc extrait côté navigateur par OCR réel (Tesseract.js, voir CompetitorPriceComparerModal.tsx),
// puis analysé ici par DeepSeek (texte uniquement).

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
      temperature: 0.2,
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

// Une réponse vide arrive occasionnellement (constaté sur d'autres endpoints IA de ce projet,
// ~1/3 des appels) sans rapport avec le contenu envoyé — une seconde tentative suffit en pratique.
async function callDeepSeek(messages: { role: 'system' | 'user'; content: string }[], maxTokens = 1500): Promise<string> {
  try {
    return await callDeepSeekOnce(messages, maxTokens)
  } catch (e: any) {
    if (e?.message === 'Réponse DeepSeek vide') {
      return await callDeepSeekOnce(messages, maxTokens)
    }
    throw e
  }
}

interface RequestBody {
  ocrText: string
  ndugumiProducts: { nom: string; prixUnitaire: number; unite: string }[]
}

interface DuplicatesRequestBody {
  produits: { id: string; nom: string; categorie: string; unite: string }[]
}

async function handleDuplicates(req: any, res: any) {
  if (!(await checkRateLimit(req, res, 'ai-price-compare-duplicates'))) return

  const body = req.body as DuplicatesRequestBody
  const produits = body.produits || []
  if (produits.length === 0) {
    res.status(400).json({ error: 'Catalogue vide.' })
    return
  }

  const listeText = produits.map((p) => `${p.id} | ${p.nom} | ${p.categorie} | ${p.unite}`).join('\n')

  const prompt = `Voici le catalogue produits réel d'une entreprise de livraison de marché à Dakar (id | nom | catégorie | unité), un produit par ligne :
"""
${listeText}
"""

Repère les groupes de produits qui semblent être des DOUBLONS ou quasi-doublons (même produit réel, nom
légèrement différent ou variante d'enseigne — ex: "Riz brisé parfumé" et "Auchan riz brisé parfumé" avec la
même unité, ou "Orange" et "Orange import" si ambigu). Ne signale QUE des groupes où tu es raisonnablement
confiant qu'il s'agit du même produit — deux produits différents avec juste un nom similaire ne comptent pas
(ex: "Riz brisé parfumé" et "Riz parfumé entier" sont différents, pas des doublons).

Réponds UNIQUEMENT en JSON avec la clé "groupes", un tableau de {"ids": string[] (2 ids ou plus, tirés
exactement de la liste ci-dessus), "raison": string (une phrase courte expliquant pourquoi ce sont des
doublons probables)}. Si aucun doublon probable, renvoie "groupes": [].`

  const raw = await callDeepSeek([{ role: 'user', content: prompt }], 2000)
  let parsed: { groupes?: { ids?: string[]; raison?: string }[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Réponse IA incomplète ou mal formée — réessayez.')
  }

  const validIds = new Set(produits.map((p) => p.id))
  const groupes = (parsed.groupes ?? [])
    .map((g) => ({ ids: (g.ids ?? []).filter((id) => validIds.has(id)), raison: g.raison || '' }))
    .filter((g) => g.ids.length >= 2)

  res.status(200).json({ groupes })
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' })
    return
  }

  try {
    if (req.query?.action === 'duplicates') return await handleDuplicates(req, res)

    if (!(await checkRateLimit(req, res, 'ai-price-compare'))) return

    const body = req.body as RequestBody
    const ocrText = (body.ocrText || '').trim()
    if (!ocrText) {
      res.status(400).json({ error: 'Aucun texte détecté sur la photo (OCR vide). Essayez une photo plus nette ou plus rapprochée.' })
      return
    }
    if (!Array.isArray(body.ndugumiProducts) || body.ndugumiProducts.length === 0) {
      res.status(400).json({ error: 'Liste de prix NDUGUMi manquante' })
      return
    }

    const priceListText = body.ndugumiProducts
      .map((p) => `- ${p.nom} (${p.unite}) : ${p.prixUnitaire} FCFA`)
      .join('\n')

    const prompt = `Voici le texte brut extrait par OCR d'une facture/reçu d'un fournisseur concurrent d'un
restaurant à Dakar. Le texte peut contenir des erreurs de reconnaissance (chiffres/lettres mal lus) : fais de
ton mieux, mais n'invente rien qui ne soit pas suggéré par le texte.

Texte OCR brut de la facture :
"""
${ocrText.slice(0, 3000)}
"""

Voici la liste des produits et prix ACTUELS de NDUGUMi (les seuls prix de référence à utiliser, ne calcule
jamais avec un prix NDUGUMi qui n'est pas dans cette liste) :
${priceListText}

Identifie dans le texte OCR chaque ligne de produit avec un prix. Pour CHAQUE ligne que tu peux raisonnablement
associer à un produit de la liste ci-dessus (même si le nom sur la facture est légèrement différent, ex:
"Riz 25kg" ↔ "Riz brisé parfumé 25kg"), calcule l'économie réalisée avec NDUGUMi.

Réponds UNIQUEMENT en JSON avec les clés :
- "fournisseurConcurrent": nom du fournisseur si présent dans le texte, sinon "Fournisseur non identifié"
- "lignes": tableau de {"produit": string, "prixConcurrent": number, "prixNdugumi": number, "economie": number}
  (economie = prixConcurrent - prixNdugumi, uniquement pour les lignes réellement présentes dans le texte OCR
  ET associées à un produit de la liste — n'invente aucune ligne)
- "economieTotaleFCFA": somme des économies de toutes les lignes
- "pourcentageEconomie": pourcentage moyen d'économie, arrondi à 1 décimale

Si aucune ligne ne peut être identifiée ET associée avec certitude, renvoie "lignes": [] et les totaux à 0 —
ne fabrique jamais de données qui ne sont pas réellement présentes dans le texte OCR.`

    const raw = await callDeepSeek([{ role: 'user', content: prompt }])
    let parsed: {
      fournisseurConcurrent?: string
      lignes?: { produit?: string; prixConcurrent?: number; prixNdugumi?: number; economie?: number }[]
      economieTotaleFCFA?: number
      pourcentageEconomie?: number
    }
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('Réponse IA incomplète ou mal formée — réessayez.')
    }

    const lignes = (parsed.lignes ?? [])
      .filter((l) => l.produit && typeof l.prixConcurrent === 'number' && typeof l.prixNdugumi === 'number')
      .map((l) => ({
        produit: l.produit!,
        prixConcurrent: l.prixConcurrent!,
        prixNdugumi: l.prixNdugumi!,
        economie: typeof l.economie === 'number' ? l.economie : l.prixConcurrent! - l.prixNdugumi!,
      }))

    res.status(200).json({
      fournisseurConcurrent: parsed.fournisseurConcurrent ?? 'Fournisseur non identifié',
      lignes,
      economieTotaleFCFA: lignes.reduce((sum, l) => sum + l.economie, 0),
      pourcentageEconomie: parsed.pourcentageEconomie ?? 0,
    })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur inconnue' })
  }
}
