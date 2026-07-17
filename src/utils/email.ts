/**
 * mailto: attend un encodage RFC 3986 (espace = %20), pas l'encodage "form" utilisé par
 * URLSearchParams (espace = "+") — sinon certains clients mail affichent des "+" littéraux
 * dans le corps du message au lieu d'espaces.
 */
export function mailtoLink(email: string, subject: string, body: string): string | null {
  const trimmed = email.trim()
  if (!trimmed || !trimmed.includes('@')) return null
  const parts: string[] = []
  if (subject) parts.push(`subject=${encodeURIComponent(subject)}`)
  if (body) parts.push(`body=${encodeURIComponent(body)}`)
  const query = parts.length ? `?${parts.join('&')}` : ''
  return `mailto:${trimmed}${query}`
}
