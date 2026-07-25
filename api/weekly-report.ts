import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurées côté serveur')
  }
  return createClient(url, key)
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Calcule les KPIs de la semaine écoulée directement depuis le blob app_state — pas d'appel au
// front (ce endpoint tourne côté serveur, déclenché par le Vercel Cron défini dans vercel.json).
function computeWeeklyKpis(state: any, start: Date, end: Date) {
  const restaurants = state.restaurants || {}
  const prospects = state.prospects || {}
  const orders = state.orders || {}

  let newProspects = 0
  let newSignings = 0
  let interactions = 0
  const interactionsByType: Record<string, number> = {}

  for (const id of Object.keys(restaurants)) {
    const p = prospects[id]
    if (!p) continue
    if (p.createdAt && inRange(p.createdAt, start, end)) newProspects++
    for (const h of p.statutHistory || []) {
      if (h.statut === 'signe' && h.date && inRange(h.date, start, end)) newSignings++
    }
    for (const n of p.notes || []) {
      if (n.date && inRange(n.date, start, end)) {
        interactions++
        interactionsByType[n.type] = (interactionsByType[n.type] || 0) + 1
      }
    }
  }

  let revenue = 0
  let orderCount = 0
  for (const o of Object.values(orders) as any[]) {
    const dateStr = (o.creeLe || '').replace(' ', 'T')
    if (dateStr && inRange(dateStr, start, end)) {
      revenue += o.grandTotal || 0
      orderCount++
    }
  }

  const totalRestaurants = Object.keys(restaurants).length
  const totalClients = Object.values(prospects).filter((p: any) =>
    ['signe', 'client_actif'].includes(p.statut)
  ).length

  return {
    totalRestaurants,
    totalClients,
    newProspects,
    newSignings,
    interactions,
    interactionsByType,
    orderCount,
    revenue,
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' })
    return
  }

  try {
    const supabase = getAdminClient()
    const action = req.query?.action

    if (action === 'generate') {
      const { data: stateRow, error: stateErr } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', 'restau-crm-storage')
        .single()
      if (stateErr) throw stateErr

      const end = new Date()
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
      const periodStart = toDateOnly(start)
      const periodEnd = toDateOnly(end)

      const kpis = computeWeeklyKpis(stateRow?.data?.state || {}, start, end)

      const { data: inserted, error: insertErr } = await supabase
        .from('weekly_reports')
        .upsert(
          { period_start: periodStart, period_end: periodEnd, data: kpis, created_at: new Date().toISOString() },
          { onConflict: 'period_start' }
        )
        .select()
        .single()
      if (insertErr) throw insertErr

      res.status(200).json({ ok: true, report: inserted })
      return
    }

    // Par défaut : liste des rapports déjà générés (consommé par la page Rapports du CRM)
    const { data, error } = await supabase
      .from('weekly_reports')
      .select('*')
      .order('period_start', { ascending: false })
      .limit(12)
    if (error) throw error
    res.status(200).json({ reports: data ?? [] })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur inconnue' })
  }
}
