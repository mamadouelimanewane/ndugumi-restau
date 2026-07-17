export interface PhoneLink {
  raw: string
  digits: string
  telHref: string
  waHref: string
}

function toInternationalDigits(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('221')) return digits
  if (digits.length === 9) return '221' + digits
  if (digits.length >= 8) return '221' + digits.slice(-9)
  return null
}

/** Numéro international (sans "+") le plus probable pour un champ pouvant contenir plusieurs numéros. */
export function firstInternationalDigits(phone: string): string | null {
  if (!phone || phone.toLowerCase().startsWith('non communiqu')) return null
  const first = phone.split('/')[0].trim()
  return toInternationalDigits(first)
}

/** Lien wa.me avec message pré-rempli (encodé), pour le premier numéro valide trouvé. */
export function waLinkWithText(phone: string, text: string): string | null {
  const intl = firstInternationalDigits(phone)
  if (!intl) return null
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`
}

/** Un champ téléphone peut contenir plusieurs numéros séparés par "/" — on renvoie un lien par numéro valide. */
export function parsePhoneLinks(phone: string): PhoneLink[] {
  if (!phone || phone.toLowerCase().startsWith('non communiqu')) return []
  return phone
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const intl = toInternationalDigits(part)
      if (!intl) return null
      return {
        raw: part,
        digits: intl,
        telHref: `tel:+${intl}`,
        waHref: `https://wa.me/${intl}`,
      }
    })
    .filter((x): x is PhoneLink => x !== null)
}
