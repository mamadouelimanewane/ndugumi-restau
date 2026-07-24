import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' })
    return
  }

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    res.status(200).json({ ok: false, message: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurées côté serveur" })
    return
  }

  try {
    const supabase = createClient(url, key)
    const { data, error } = await supabase.from('app_state').select('id, updated_at').limit(5)
    if (error) throw error
    res.status(200).json({ ok: true, count: data?.length || 0 })
  } catch (err: any) {
    res.status(200).json({ ok: false, message: err?.message || 'Erreur inconnue' })
  }
}
