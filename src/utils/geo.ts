/**
 * Extrait des coordonnées GPS depuis une saisie libre : soit un couple "lat, lng" collé
 * directement (ex: copié via "Copier les coordonnées" dans Google Maps), soit une URL Google
 * Maps (ex: https://www.google.com/maps/@14.6937,-17.4441,17z ou ?q=14.6937,-17.4441 ou une URL
 * de fiche lieu contenant "!3d14.69!4d-17.44"). Les liens raccourcis (maps.app.goo.gl/... ou
 * goo.gl/maps/...) ne peuvent pas être résolus côté navigateur sans requête réseau — non supportés,
 * demander à l'utilisateur le lien complet ou "Copier les coordonnées" à la place.
 */
export function parseGoogleMapsCoords(input: string): { lat: number; lng: number } | null {
  const text = input.trim()
  if (!text) return null

  const tryPair = (latStr: string, lngStr: string): { lat: number; lng: number } | null => {
    const lat = parseFloat(latStr)
    const lng = parseFloat(lngStr)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
    return { lat, lng }
  }

  // "@lat,lng,zoom" (URL de navigation Google Maps)
  const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (atMatch) {
    const r = tryPair(atMatch[1], atMatch[2])
    if (r) return r
  }

  // "!3dlat!4dlng" (URL de fiche lieu Google Maps)
  const bangMatch = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (bangMatch) {
    const r = tryPair(bangMatch[1], bangMatch[2])
    if (r) return r
  }

  // "?q=lat,lng" ou "&ll=lat,lng"
  const queryMatch = text.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (queryMatch) {
    const r = tryPair(queryMatch[1], queryMatch[2])
    if (r) return r
  }

  // Simple "lat, lng" ou "lat lng" collé tel quel
  const plainMatch = text.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/)
  if (plainMatch) {
    const r = tryPair(plainMatch[1], plainMatch[2])
    if (r) return r
  }

  return null
}
