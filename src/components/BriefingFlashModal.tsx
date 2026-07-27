import { useState, useEffect } from 'react'
import { fetchAiBriefing, type AiBriefingResult } from '../utils/ai'

interface BriefingFlashModalProps {
  etablissement: string
  quartier: string
  statut: string
  agent: string
  notes: { date: string; texte: string; type: string }[]
  onClose: () => void
}

export default function BriefingFlashModal({ etablissement, quartier, statut, agent, notes, onClose }: BriefingFlashModalProps) {
  const [brief, setBrief] = useState<AiBriefingResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAiBriefing({ etablissement, quartier, statut, agent, notes })
      .then((res) => {
        if (!cancelled) setBrief(res)
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Erreur lors de la génération du briefing.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etablissement, quartier, statut])

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>📑 Briefing Commercial Flash IA (Pré-Visite)</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer la fenêtre">✕</button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Synthèse IA générée instantanément avant d'entrer dans l'établissement pour préparer la négociation.
        </p>

        {loading && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 32 }}>✨</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>Génération du Briefing Commercial IA pour {etablissement}...</div>
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13 }}>
            {error}
          </div>
        )}

        {brief && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <strong style={{ fontSize: 13, color: 'var(--primary)' }}>📌 Contexte & Profil</strong>
              <p style={{ fontSize: 13, margin: '4px 0 0', lineHeight: 1.4 }}>{brief.profil}</p>
            </div>

            <div style={{ background: '#fffbe6', padding: 12, borderRadius: 8, border: '1px solid #ffe58f' }}>
              <strong style={{ fontSize: 13, color: '#b78103' }}>⚠️ Objections Prévisibles du Gérant</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12.5, color: '#8c6b00', lineHeight: 1.5 }}>
                {brief.objections.map((o, idx) => (
                  <li key={idx}>{o}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: '#ecfdf5', padding: 12, borderRadius: 8, border: '1px solid #a7f3d0' }}>
              <strong style={{ fontSize: 13, color: '#047857' }}>🎯 3 Arguments de Vente à Dérouler</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: '#065f46', lineHeight: 1.6, fontWeight: 500 }}>
                {brief.argumentsCles.map((arg, idx) => (
                  <li key={idx}>{arg}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: '#e0f2fe', padding: 12, borderRadius: 8, border: '1px solid #7dd3fc' }}>
              <strong style={{ fontSize: 13, color: '#0369a1' }}>🎁 Offre de Closing Conseillée par l'IA</strong>
              <p style={{ fontSize: 13, margin: '4px 0 0', color: '#0c4a6e', fontWeight: 600 }}>{brief.offreConseillee}</p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn secondary" onClick={onClose}>Fermer</button>
              <button className="btn primary" onClick={onClose}>Prêt pour la visite 🚀</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
