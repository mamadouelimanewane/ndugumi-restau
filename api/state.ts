import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurées côté serveur')
  }
  return createClient(url, key)
}

export default async function handler(req: any, res: any) {
  const id = typeof req.query?.id === 'string' ? req.query.id : Array.isArray(req.query?.id) ? req.query.id[0] : undefined
  if (!id) {
    res.status(400).json({ error: 'Paramètre "id" manquant' })
    return
  }

  try {
    const supabase = getAdminClient()

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('app_state').select('data').eq('id', id).single()
      if (error) {
        if (error.code === 'PGRST116') {
          res.status(200).json({ data: null })
          return
        }
        throw error
      }
      res.status(200).json({ data: data?.data ?? null })
      return
    }

    if (req.method === 'PUT') {
      const body = req.body as { data: unknown }
      const { error } = await supabase
        .from('app_state')
        .upsert({ id, data: body.data, updated_at: new Date().toISOString() })
      if (error) throw error
      res.status(200).json({ ok: true })
      return
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('app_state').delete().eq('id', id)
      if (error) throw error
      res.status(200).json({ ok: true })
      return
    }

    res.status(405).json({ error: 'Méthode non autorisée' })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur inconnue' })
  }
}
