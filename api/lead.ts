import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurées côté serveur')
  }
  return createClient(url, key)
}

// Endpoint public (formulaire d'intérêt restaurant, sans authentification) : protège contre l'abus
// via le même rate-limiting que les endpoints IA (increment_rate_limit, table api_rate_limits).
async function checkRateLimit(req: any, res: any): Promise<boolean> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return true

  try {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
    const now = Date.now()
    const minuteBucket = Math.floor(now / 60000)
    const supabase = createClient(url, key)
    const { data: ipCount } = await supabase.rpc('increment_rate_limit', {
      p_key: `lead:ip:${ip}:${minuteBucket}`,
      p_window_start: new Date(minuteBucket * 60000).toISOString(),
    })
    if ((ipCount ?? 0) > 5) {
      res.status(429).json({ error: 'Trop de soumissions depuis cette connexion, réessayez dans une minute.' })
      return false
    }
  } catch (e) {
    console.error('Erreur rate-limit lead (ignorée)', e)
  }
  return true
}

export default async function handler(req: any, res: any) {
  try {
    const supabase = getAdminClient()

    if (req.method === 'POST') {
      if (!(await checkRateLimit(req, res))) return

      const body = req.body as { etablissement?: string; telephone?: string; quartier?: string; message?: string }
      const etablissement = (body.etablissement || '').trim()
      const telephone = (body.telephone || '').trim()
      if (!etablissement || !telephone) {
        res.status(400).json({ error: 'Établissement et téléphone sont obligatoires.' })
        return
      }

      const { error } = await supabase.from('public_leads').insert({
        etablissement: etablissement.slice(0, 200),
        telephone: telephone.slice(0, 60),
        quartier: (body.quartier || '').trim().slice(0, 120) || null,
        message: (body.message || '').trim().slice(0, 1000) || null,
      })
      if (error) throw error
      res.status(200).json({ ok: true })
      return
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('public_leads')
        .select('*')
        .eq('converted', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      res.status(200).json({ leads: data ?? [] })
      return
    }

    if (req.method === 'PATCH') {
      const body = req.body as { id?: string; restaurantId?: number }
      if (!body.id) {
        res.status(400).json({ error: 'Paramètre "id" manquant' })
        return
      }
      const { error } = await supabase
        .from('public_leads')
        .update({ converted: true, restaurant_id: body.restaurantId ?? null })
        .eq('id', body.id)
      if (error) throw error
      res.status(200).json({ ok: true })
      return
    }

    res.status(405).json({ error: 'Méthode non autorisée' })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur inconnue' })
  }
}
