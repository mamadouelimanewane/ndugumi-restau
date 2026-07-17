import { parsePhoneLinks } from '../utils/phone'

export default function PhoneQuickActions({ phone }: { phone: string }) {
  const links = parsePhoneLinks(phone)
  if (links.length === 0) return null

  return (
    <span style={{ display: 'inline-flex', gap: 6, marginLeft: 8 }}>
      {links.map((l) => (
        <span key={l.digits} style={{ display: 'inline-flex', gap: 4 }}>
          <a href={l.telHref} title={`Appeler ${l.raw}`}>
            <button className="btn secondary small" type="button" style={{ padding: '2px 8px' }}>
              📞
            </button>
          </a>
          <a href={l.waHref} target="_blank" rel="noopener noreferrer" title={`WhatsApp ${l.raw}`}>
            <button className="btn secondary small" type="button" style={{ padding: '2px 8px' }}>
              💬
            </button>
          </a>
        </span>
      ))}
    </span>
  )
}
