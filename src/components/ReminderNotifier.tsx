import { useEffect } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects, isLate } from '../utils/joined'
import { getPermission, showReminderNotification } from '../utils/notifications'

const CHECK_INTERVAL_MS = 15 * 60 * 1000 // 15 min
const MIN_GAP_BETWEEN_NOTIFS_MS = 4 * 60 * 60 * 1000 // 4h — évite de spammer à chaque vérification
const LAST_NOTIF_KEY = 'restau-crm-last-reminder-at'

export default function ReminderNotifier() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const tasks = useCrmStore((s) => s.tasks)

  useEffect(() => {
    function checkAndNotify() {
      if (getPermission() !== 'granted') return

      const lastAt = Number(localStorage.getItem(LAST_NOTIF_KEY) ?? 0)
      if (Date.now() - lastAt < MIN_GAP_BETWEEN_NOTIFS_MS) return

      const joined = joinProspects(restaurants, prospects)
      const overdueRelances = joined.filter((j) => isLate(j.crm.prochaineRelance)).length
      const overdueTasks = Object.values(tasks).filter((t) => t.statut === 'a_faire' && isLate(t.dateEcheance)).length

      if (overdueRelances === 0 && overdueTasks === 0) return

      const parts: string[] = []
      if (overdueTasks > 0) parts.push(`${overdueTasks} tâche${overdueTasks > 1 ? 's' : ''} en retard`)
      if (overdueRelances > 0) parts.push(`${overdueRelances} relance${overdueRelances > 1 ? 's' : ''} en retard`)

      showReminderNotification('Restau CRM — Rappels', parts.join(' · '))
      localStorage.setItem(LAST_NOTIF_KEY, String(Date.now()))
    }

    checkAndNotify()
    const interval = setInterval(checkAndNotify, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [restaurants, prospects, tasks])

  return null
}
