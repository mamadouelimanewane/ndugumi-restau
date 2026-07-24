// Gestionnaire de Notifications Push Navigateur pour NDUGUMi Restau CRM

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    alert("Votre navigateur ne supporte pas les notifications push.")
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export function sendWebPushNotification(title: string, body: string, icon = '/pwa-192x192.png') {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.warn('Notifications non autorisées.')
    return
  }

  try {
    const notification = new Notification(title, {
      body,
      icon,
      badge: icon,
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch (e) {
    console.error('Erreur lors de l envoi de la notification push', e)
  }
}
