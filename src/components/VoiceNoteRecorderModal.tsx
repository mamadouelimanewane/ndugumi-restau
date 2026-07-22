import { useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'

interface VoiceNoteRecorderModalProps {
  restaurantId: number
  etablissement: string
  onClose: () => void
}

export default function VoiceNoteRecorderModal({ restaurantId, etablissement, onClose }: VoiceNoteRecorderModalProps) {
  const addNote = useCrmStore((s) => s.addNote)
  const setRelance = useCrmStore((s) => s.setRelance)
  const currentAgent = useCrmStore((s) => s.currentAgent)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcriptionResult, setTranscriptionResult] = useState<{
    langue: string
    texteBrut: string
    resumeIA: string
    objections: string[]
    relanceSuggereeDate: string | null
  } | null>(null)

  function handleStartRecording() {
    setIsRecording(true)
    setRecordingTime(0)
    const interval = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= 15) {
          clearInterval(interval)
          handleStopRecording()
          return 15
        }
        return prev + 1
      })
    }, 1000)
  }

  function handleStopRecording() {
    setIsRecording(false)
    setIsProcessing(true)

    // Simulation de transcription IA multilingue (Wolof / Français)
    setTimeout(() => {
      const isWolofSim = Math.random() > 0.4
      let res = {
        langue: 'Wolof / Français (Mixte)',
        texteBrut: `Mangi wone fi ci restaurant ${etablissement}. Gérant bi dafa wax ne riz parfumé bi dafa nex lool. Mu ngi soxla 4 sacs de riz 25kg ak 2 bidons d'huile pour alarba (mercredi) bi.`,
        resumeIA: `Visite terrain concluante : Le gérant est très satisfait du riz parfumé NDUGUMi. Il passe une commande de 4 sacs de riz 25kg + 2 bidons d'huile pour livraison ce mercredi.`,
        objections: [`Demande une livraison garantie avant 11h le matin`],
        relanceSuggereeDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      }

      if (!isWolofSim) {
        res = {
          langue: 'Français',
          texteBrut: `Discussion très positive avec le gérant de ${etablissement}. Il aimerait tester nos cartons de poulet et 1 sac d'oignon. Il demande si on peut lui faire une remise sur la livraison.`,
          resumeIA: `Échange commercial positif : Intérêt marqué pour le poulet congelé et les oignons 25kg. Demande de geste commercial sur les frais de livraison.`,
          objections: [`Sensibilité aux frais de livraison`],
          relanceSuggereeDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        }
      }

      setTranscriptionResult(res)
      setIsProcessing(false)
    }, 2000)
  }

  function handleSaveToCrm() {
    if (!transcriptionResult) return
    const agent = currentAgent || 'Commercial'
    const noteText = `[🎙️ Note Vocale IA - ${transcriptionResult.langue}]\n${transcriptionResult.resumeIA}\n\n• Audio original : "${transcriptionResult.texteBrut}"`
    addNote(restaurantId, 'visite', noteText, agent)

    if (transcriptionResult.relanceSuggereeDate) {
      setRelance(restaurantId, transcriptionResult.relanceSuggereeDate)
    }

    alert("Note vocale et relance enregistrées dans la fiche prospect !")
    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>🎙️ Note Vocale IA (Wolof & Français)</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer la fenêtre">✕</button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Enregistrez un compte-rendu vocal oralement sur le terrain (en Wolof ou Français). L'IA transcrit le message, synthétise les besoins et programme la relance.
        </p>

        <div style={{ textAlign: 'center', padding: 30, background: '#f8fafc', borderRadius: 12, border: '1px dashed var(--border)' }}>
          {!isRecording && !isProcessing && !transcriptionResult && (
            <button className="btn primary" onClick={handleStartRecording} style={{ borderRadius: '50%', width: 80, height: 80, fontSize: 32, padding: 0 }}>
              🎙️
            </button>
          )}

          {isRecording && (
            <div>
              <div style={{ fontSize: 40, color: 'var(--danger)', animation: 'pulse 1s infinite' }}>🔴</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>Enregistrement en cours... {recordingTime}s</div>
              <button className="btn secondary" onClick={handleStopRecording} style={{ marginTop: 12 }}>
                ⏹️ Arrêter l'enregistrement
              </button>
            </div>
          )}

          {isProcessing && (
            <div>
              <div style={{ fontSize: 32 }}>✨</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>Transcription & Analyse IA DeepSeek en cours...</div>
            </div>
          )}
        </div>

        {!transcriptionResult && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn secondary" onClick={onClose}>Annuler / Fermer</button>
          </div>
        )}

        {transcriptionResult && (
          <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>
                🌐 Langue : {transcriptionResult.langue}
              </span>
              {transcriptionResult.relanceSuggereeDate && (
                <span className="badge" style={{ background: '#fef3c7', color: '#b45309' }}>
                  📅 Relance automatique : {transcriptionResult.relanceSuggereeDate}
                </span>
              )}
            </div>

            <h4 style={{ margin: '8px 0 4px', color: '#166534' }}>Résumé Exécutif IA :</h4>
            <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, fontWeight: 500 }}>{transcriptionResult.resumeIA}</p>

            <h4 style={{ margin: '12px 0 4px', color: '#166534' }}>Transcription Orale :</h4>
            <p style={{ fontSize: 12, fontStyle: 'italic', color: '#4b5563', margin: 0 }}>"{transcriptionResult.texteBrut}"</p>

            <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn secondary" onClick={() => setTranscriptionResult(null)}>Réenregistrer</button>
              <button className="btn primary" onClick={handleSaveToCrm}>💾 Enregistrer dans le CRM</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
