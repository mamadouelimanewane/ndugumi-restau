// Rappels via l'API Notification du navigateur — ne fonctionnent que pendant que l'application
// est ouverte (onglet au premier plan ou en arrière-plan) : sans serveur ni base de données
// centrale (toutes les données restent en local sur l'appareil), il est impossible de déclencher
// une vraie notification "push" quand l'application/le navigateur est totalement fermé.

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.requestPermission()
}

export async function showReminderNotification(title: string, body: string): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' })
        return
      }
    }
    new Notification(title, { body, icon: '/icons/icon-192.png' })
  } catch {
    // Échec silencieux : un rappel raté n'est pas bloquant pour l'utilisation du CRM.
  }
}
