export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(h))
}

export interface RoutePoint {
  id: number
  coords: [number, number]
}

export interface RouteStop extends RoutePoint {
  distanceFromPrevKm: number
}

/**
 * Ordonne les points par plus proche voisin (heuristique simple, pas un TSP optimal, mais
 * suffisant pour planifier une tournée terrain à quelques dizaines d'arrêts).
 */
export function nearestNeighborRoute(points: RoutePoint[], start: [number, number]): RouteStop[] {
  const remaining = [...points]
  const ordered: RouteStop[] = []
  let current = start
  while (remaining.length > 0) {
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i].coords)
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    const [next] = remaining.splice(bestIdx, 1)
    ordered.push({ ...next, distanceFromPrevKm: bestDist })
    current = next.coords
  }
  return ordered
}
