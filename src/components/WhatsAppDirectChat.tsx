import { useState, useMemo } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { DirectWhatsAppMessage } from '../types'

interface WhatsAppDirectChatProps {
  restaurantId: number
  etablissement: string
  telephone: string
}

export default function WhatsAppDirectChat({ restaurantId, etablissement, telephone }: WhatsAppDirectChatProps) {
  const directWhatsAppMessages = useCrmStore((s) => s.directWhatsAppMessages)
  const sendDirectWhatsAppMessage = useCrmStore((s) => s.sendDirectWhatsAppMessage)
  const currentAgent = useCrmStore((s) => s.currentAgent)

  const [inputMessage, setInputMessage] = useState('')
  const [botActive, setBotActive] = useState(false)

  const chatHistory = useMemo(() => {
    return Object.values(directWhatsAppMessages)
      .filter((m) => m.restaurantId === restaurantId)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [directWhatsAppMessages, restaurantId])

  function handleSend() {
    if (!inputMessage.trim()) return
    const agent = currentAgent || 'Commercial'
    sendDirectWhatsAppMessage(restaurantId, inputMessage.trim(), agent, 'sortant')
    setInputMessage('')
  }

  function handleSimulateIncoming() {
    sendDirectWhatsAppMessage(restaurantId, `Bonjour ! Pouvez-vous nous livrer 3 sacs de riz et 2 bidons d'huile aujourd'hui ?`, 'Client', 'entrant')
    if (botActive) {
      setTimeout(() => {
        sendDirectWhatsAppMessage(restaurantId, `🤖 [Agent WhatsApp 24/7 NDUGUMi] : Bonjour ! Votre commande de 3 sacs de riz (45 000 FCFA) et 2 bidons d'huile (44 000 FCFA) est bien reçue. Livraison prévue avant 11h. Merci !`, 'Agent Autonome IA', 'sortant')
      }, 1000)
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 420, background: '#efeae2' }}>
      {/* Header WhatsApp */}
      <div style={{ background: '#075e54', color: '#fff', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <div>
          <strong style={{ fontSize: 14 }}>💬 WhatsApp Direct API — {etablissement}</strong>
          <div style={{ fontSize: 11, opacity: 0.8 }}>{telephone || 'Sans numéro'}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className="btn small secondary"
            style={{ fontSize: 11, background: botActive ? '#25d366' : 'rgba(255,255,255,0.2)', color: '#fff', borderColor: 'transparent' }}
            onClick={() => setBotActive(!botActive)}
          >
            {botActive ? '🤖 Chatbot IA Actif 24/7' : '🤖 Activer Chatbot 24/7'}
          </button>
          <button className="btn small secondary" style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', color: '#fff', borderColor: 'transparent' }} onClick={handleSimulateIncoming}>
            ⚡ Simuler Message Client
          </button>
        </div>
      </div>

      {/* Zone de Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {chatHistory.length === 0 && (
          <div style={{ textAlign: 'center', margin: 'auto', color: '#667781', fontSize: 13 }}>
            Aucun message WhatsApp Direct échangé pour le moment.
          </div>
        )}

        {chatHistory.map((m) => {
          const isMe = m.direction === 'sortant'
          return (
            <div
              key={m.id}
              style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                background: isMe ? '#dcf8c6' : '#ffffff',
                padding: '8px 12px',
                borderRadius: 8,
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 11, color: isMe ? '#075e54' : '#128c7e', marginBottom: 2 }}>
                {isMe ? m.agent : etablissement}
              </div>
              <div>{m.texte}</div>
              <div style={{ textAlign: 'right', fontSize: 10, color: '#667781', marginTop: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                <span>{new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                {isMe && <span style={{ color: '#34b7f1' }}>✓✓</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Zone de Saisie */}
      <div style={{ background: '#f0f2f5', padding: 10, display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Écrire un message WhatsApp..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, padding: 8, borderRadius: 20, border: '1px solid var(--border)', fontSize: 13 }}
        />
        <button className="btn primary" onClick={handleSend} style={{ borderRadius: 20, background: '#128c7e', borderColor: '#128c7e' }}>
          Envoyer ➔
        </button>
      </div>
    </div>
  )
}
