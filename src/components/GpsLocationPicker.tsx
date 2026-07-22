import { useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'

interface GpsLocationPickerProps {
  restaurantId: number
  etablissement: string
  quartier: string
  exactLat?: number
  exactLng?: number
}

export default function GpsLocationPicker({ restaurantId, etablissement, quartier, exactLat, exactLng }: GpsLocationPickerProps) {
  const updateGpsCoords = useCrmStore((s) => s.updateGpsCoords)
  const [loading, setLoading] = useState(false)

  function handleCaptureGps() {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par ce navigateur.")
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateGpsCoords(restaurantId, pos.coords.latitude, pos.coords.longitude)
        setLoading(false)
        alert(`Position GPS enregistrée avec succès !\nLat: ${pos.coords.latitude.toFixed(5)}, Lng: ${pos.coords.longitude.toFixed(5)}`)
      },
      (err) => {
        setLoading(false)
        alert(`Erreur de capture GPS : ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const lat = exactLat ?? 14.6937
  const lng = exactLng ?? -17.4441

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`

  return (
    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>📍 Géolocalisation & Navigation</span>
        {exactLat && exactLng ? (
          <span className="badge" style={{ background: '#ecfdf5', color: '#047857', fontSize: 11 }}>
            GPS exact enregistré
          </span>
        ) : (
          <span className="badge" style={{ background: '#fffbe6', color: '#b78103', fontSize: 11 }}>
            Position estimée par quartier
          </span>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
        {exactLat && exactLng
          ? `Lat: ${exactLat.toFixed(5)}, Lng: ${exactLng.toFixed(5)}`
          : `Coordonnées centrées sur le quartier ${quartier}`}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn small secondary" onClick={handleCaptureGps} disabled={loading}>
          {loading ? '📍 Acquisition GPS...' : '📍 Capturer ma position actuelle'}
        </button>
        <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="btn small secondary" style={{ textDecoration: 'none' }}>
          🗺️ Google Maps
        </a>
        <a href={wazeUrl} target="_blank" rel="noreferrer" className="btn small secondary" style={{ textDecoration: 'none', background: '#33ccff', color: '#fff', borderColor: '#33ccff' }}>
          🚙 Waze
        </a>
      </div>
    </div>
  )
}
