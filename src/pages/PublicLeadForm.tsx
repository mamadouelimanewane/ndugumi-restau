import { useState } from 'react'

export default function PublicLeadForm() {
  const [etablissement, setEtablissement] = useState('')
  const [telephone, setTelephone] = useState('')
  const [quartier, setQuartier] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!etablissement.trim() || !telephone.trim()) return
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etablissement, telephone, quartier, message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Une erreur est survenue.')
        setStatus('error')
        return
      }
      setStatus('sent')
    } catch (err) {
      setErrorMsg('Impossible de contacter le serveur. Vérifiez votre connexion.')
      setStatus('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 16 }}>
      <div className="panel" style={{ maxWidth: 460, width: '100%' }}>
        <h2 style={{ marginTop: 0, color: 'var(--primary-dark)' }}>🍽️ Devenir partenaire NDUGUMi</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Vous êtes restaurateur à Dakar ou en banlieue et souhaitez simplifier vos approvisionnements
          (riz, huile, légumes, viande, poisson…) avec livraison incluse ? Laissez vos coordonnées,
          notre équipe commerciale vous recontacte rapidement.
        </p>

        {status === 'sent' ? (
          <div style={{ background: '#e8f5e9', border: '1px solid #81c784', borderRadius: 8, padding: 16, marginTop: 12 }}>
            <strong style={{ color: '#1b5e20' }}>✅ Merci !</strong>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#1b5e20' }}>
              Votre demande a bien été enregistrée. Un membre de notre équipe vous contactera bientôt.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <label>Nom de l'établissement *</label>
              <input
                type="text"
                value={etablissement}
                onChange={(e) => setEtablissement(e.target.value)}
                placeholder="Ex : Restaurant Chez Awa"
                required
              />
            </div>
            <div className="field-row">
              <label>Téléphone *</label>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Ex : 77 123 45 67"
                required
              />
            </div>
            <div className="field-row">
              <label>Quartier</label>
              <input
                type="text"
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
                placeholder="Ex : Médina, Dakar"
              />
            </div>
            <div className="field-row">
              <label>Message (facultatif)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Une précision à nous transmettre ?"
                style={{ minHeight: 80 }}
              />
            </div>

            {status === 'error' && (
              <div style={{ color: 'var(--danger, #c0392b)', fontSize: 12.5, marginBottom: 8 }}>{errorMsg}</div>
            )}

            <button className="btn primary" type="submit" disabled={status === 'sending'} style={{ width: '100%' }}>
              {status === 'sending' ? 'Envoi…' : 'Envoyer ma demande'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
