import { useEffect, useState } from 'react'

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  async function handleInstallClick() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('L utilisateur a accepté l installation PWA')
    }
    setDeferredPrompt(null)
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
        color: '#ffffff',
        padding: '12px 20px',
        borderRadius: 12,
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 26 }}>📲</span>
        <div>
          <strong style={{ fontSize: 15, display: 'block' }}>
            Installer NDUGUMi Restau sur votre Écran d'Accueil
          </strong>
          <span style={{ fontSize: 12, opacity: 0.9 }}>
            Accédez au CRM en 1-clic sur le terrain, même sans connexion Internet !
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={handleInstallClick}
          style={{
            background: '#ffffff',
            color: '#15803d',
            border: 'none',
            fontWeight: 800,
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Installer l'Application
        </button>
        <button
          onClick={() => setShowBanner(false)}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            border: 'none',
            padding: '8px 12px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Ignorer
        </button>
      </div>
    </div>
  )
}
