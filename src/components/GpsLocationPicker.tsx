import { useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { parseGoogleMapsCoords } from '../utils/geo'

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
  const [pasteInput, setPasteInput] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)

  function handleParsePaste() {
    const coords = parseGoogleMapsCoords(pasteInput)
    if (!coords) {
      setPasteError(
        "Coordonnées non reconnues. Collez soit un lien Google Maps complet (avec @lat,lng dans l'URL), soit des coordonnées \"lat, lng\" (ex: 14.6937, -17.4441) — les liens raccourcis (goo.gl/maps/...) ne sont pas supportés."
      )
      return
    }
    setPasteError(null)
    updateGpsCoords(restaurantId, coords.lat, coords.lng)
    setPasteInput('')
  }

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

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-dim)' }}>
          Ou coller un lien Google Maps / des coordonnées (ex: 14.6937, -17.4441)
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={pasteInput}
            onChange={(e) => { setPasteInput(e.target.value); setPasteError(null) }}
            placeholder="https://maps.google.com/... ou 14.6937, -17.4441"
            style={{ flex: 1, padding: 6, fontSize: 12.5 }}
          />
          <button className="btn small secondary" onClick={handleParsePaste} disabled={!pasteInput.trim()}>
            Localiser
          </button>
        </div>
        {pasteError && <div style={{ fontSize: 11.5, color: 'var(--danger, #c0392b)' }}>{pasteError}</div>}
      </div>
    </div>
  )
}
