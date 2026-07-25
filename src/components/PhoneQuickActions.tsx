import { parsePhoneLinks } from '../utils/phone'

interface PhoneQuickActionsProps {
  phone: string
  /** Numéro WhatsApp dédié, si différent de `phone` (voir champ "whatsapp" du restaurant). */
  whatsappPhone?: string
}

export default function PhoneQuickActions({ phone, whatsappPhone }: PhoneQuickActionsProps) {
  const links = parsePhoneLinks(phone)
  const waLinks = whatsappPhone?.trim() ? parsePhoneLinks(whatsappPhone) : links
  if (links.length === 0 && waLinks.length === 0) return null

  return (
    <span style={{ display: 'inline-flex', gap: 6, marginLeft: 8 }}>
      {links.map((l) => (
        <span key={l.digits} style={{ display: 'inline-flex', gap: 4 }}>
          <a href={l.telHref} title={`Appeler ${l.raw}`}>
            <button className="btn secondary small" type="button" style={{ padding: '2px 8px' }}>
              📞
            </button>
          </a>
          <a href={l.smsHref} title={`SMS ${l.raw} (si pas de WhatsApp)`}>
            <button className="btn secondary small" type="button" style={{ padding: '2px 8px' }}>
              💌
            </button>
          </a>
        </span>
      ))}
      {waLinks.map((l) => (
        <a key={'wa-' + l.digits} href={l.waHref} target="_blank" rel="noopener noreferrer" title={`WhatsApp ${l.raw}`}>
          <button className="btn secondary small" type="button" style={{ padding: '2px 8px' }}>
            💬
          </button>
        </a>
      ))}
    </span>
  )
}
