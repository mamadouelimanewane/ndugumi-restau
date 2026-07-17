// Coordonnées approximatives du centre de chaque quartier / commune (WGS84).
// Utilisées pour positionner les restaurants sur la carte à l'échelle du quartier :
// nous n'avons pas d'adresse géocodée précise pour la plupart des établissements,
// donc chaque marqueur est une approximation, pas une localisation exacte.
export const QUARTIER_COORDS: Record<string, [number, number]> = {
  // Dakar intra-muros
  'Dakar-Plateau': [14.6708, -17.4313],
  'Almadies / Ngor': [14.7458, -17.5133],
  'Fann - Point E - Amitié': [14.6929, -17.4626],
  Yoff: [14.7517, -17.4838],
  'Mermoz - Sacré-Cœur': [14.7106, -17.4726],
  'Sicap Liberté': [14.7196, -17.459],
  'Hann-Bel Air': [14.7157, -17.4238],
  'Dieuppeul-Derklé': [14.7157, -17.4547],
  Ouakam: [14.7167, -17.4833],
  'Parcelles Assainies': [14.755, -17.4392],
  "Patte d'Oie": [14.7285, -17.455],
  'Gueule Tapée - Fass - Colobane': [14.6875, -17.452],
  Médina: [14.6789, -17.4467],
  'Grand Yoff': [14.7245, -17.4507],
  HLM: [14.7024, -17.4514],
  'Nord Foire': [14.7423, -17.4778],
  'Cité Keur Gorgui': [14.7157, -17.4713],
  'Sicap Baobabs': [14.705, -17.4614],

  // Banlieue
  'Pikine (+ Thiaroye)': [14.7549, -17.39],
  Guédiawaye: [14.7692, -17.4067],
  'Rufisque (+ Jaxaay)': [14.7167, -17.2667],
  'Keur Massar / Jaxaay': [14.777, -17.319],
  'Diamniadio / Bargny / Sébikotane': [14.7167, -17.1833],
  Malika: [14.7961, -17.3417],
}

export const DAKAR_CENTER: [number, number] = [14.72, -17.42]

// Décalage déterministe (basé sur l'id) pour éviter que tous les restaurants
// d'un même quartier soient exactement superposés sur la carte.
export function jitteredCoords(quartier: string, id: number): [number, number] {
  const base = QUARTIER_COORDS[quartier] ?? DAKAR_CENTER
  const angle = (id * 137.508 * Math.PI) / 180 // angle d'or, répartition homogène
  const radius = 0.004 + ((id * 37) % 100) / 100 / 250 // ~0.3 à 0.8 km
  const dLat = Math.cos(angle) * radius
  const dLng = Math.sin(angle) * radius * 1.15 // correction grossière de la longitude à cette latitude
  return [base[0] + dLat, base[1] + dLng]
}
