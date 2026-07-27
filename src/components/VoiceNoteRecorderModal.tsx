import { useRef, useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'

interface VoiceNoteRecorderModalProps {
  restaurantId: number
  etablissement: string
  onClose: () => void
}

interface AnalysisResult {
  langue: string
  resumeIA: string
  objections: string[]
  relanceSuggereeDate: string | null
}

// La reconnaissance vocale du navigateur (Web Speech API) ne fonctionne que dans Chrome/Edge —
// absente de Firefox et Safari. On la détecte au chargement plutôt qu'à l'usage pour proposer
// un repli clair (saisie manuelle du texte) plutôt qu'un bouton qui ne ferait rien.
function getSpeechRecognitionCtor(): (new () => any) | null {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

export default function VoiceNoteRecorderModal({ restaurantId, etablissement, onClose }: VoiceNoteRecorderModalProps) {
  const addNote = useCrmStore((s) => s.addNote)
  const setRelance = useCrmStore((s) => s.setRelance)
  const currentAgent = useCrmStore((s) => s.currentAgent)

  const speechSupported = useRef(!!getSpeechRecognitionCtor()).current
  const recognitionRef = useRef<any>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [manualText, setManualText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processError, setProcessError] = useState<string | null>(null)
  const [finalTranscript, setFinalTranscript] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)

  function handleStartRecording() {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    setLiveTranscript('')
    const recognition = new Ctor()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      setLiveTranscript(text)
    }
    recognition.onerror = () => {
      setIsRecording(false)
    }
    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  function handleStopRecording() {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  async function handleAnalyze(texte: string) {
    if (!texte.trim()) return
    setIsProcessing(true)
    setProcessError(null)
    setFinalTranscript(texte.trim())
    try {
      const res = await fetch('/api/ai-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptText: texte.trim(), etablissement }),
      })
      const data = await res.json()
      if (!res.ok) {
        setProcessError(data.error || "Erreur lors de l'analyse.")
        return
      }
      setAnalysis({
        langue: data.langue || 'Non détectée',
        resumeIA: data.resumeIA || '',
        objections: data.objections || [],
        relanceSuggereeDate: data.relanceSuggereeDate || null,
      })
    } catch (e: any) {
      setProcessError(e?.message || 'Impossible de contacter le serveur.')
    } finally {
      setIsProcessing(false)
    }
  }

  function handleSaveToCrm() {
    if (!analysis) return
    const agent = currentAgent || 'Commercial'
    const objectionsText = analysis.objections.length > 0 ? `\nObjection(s) : ${analysis.objections.join(' / ')}` : ''
    const noteText = `[🎙️ Note Vocale IA - ${analysis.langue}]\n${analysis.resumeIA}${objectionsText}\n\n• Transcription : "${finalTranscript}"`
    addNote(restaurantId, 'visite', noteText, agent)

    if (analysis.relanceSuggereeDate) {
      setRelance(restaurantId, analysis.relanceSuggereeDate)
    }

    alert('Note vocale et relance enregistrées dans la fiche prospect !')
    onClose()
  }

  function handleReset() {
    setLiveTranscript('')
    setManualText('')
    setFinalTranscript('')
    setAnalysis(null)
    setProcessError(null)
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
          <h2>🎙️ Note Vocale IA</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer la fenêtre">✕</button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          {speechSupported
            ? "Enregistrez un compte-rendu vocal oralement sur le terrain (reconnaissance vocale en français — le Wolof peut apparaître déformé phonétiquement, l'IA fait de son mieux pour en comprendre le sens). L'IA analyse ensuite le texte, synthétise les besoins et propose une relance."
            : "Votre navigateur ne supporte pas la reconnaissance vocale (fonctionne sur Chrome/Edge). Tapez directement le compte-rendu ci-dessous — l'IA l'analysera de la même façon."}
        </p>

        {!analysis && (
          <div style={{ textAlign: 'center', padding: 24, background: '#f8fafc', borderRadius: 12, border: '1px dashed var(--border)' }}>
            {speechSupported ? (
              <>
                {!isRecording && !isProcessing && (
                  <button className="btn primary" onClick={handleStartRecording} style={{ borderRadius: '50%', width: 80, height: 80, fontSize: 32, padding: 0 }}>
                    🎙️
                  </button>
                )}
                {isRecording && (
                  <div>
                    <div style={{ fontSize: 40, color: 'var(--danger)' }}>🔴</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>Enregistrement en cours…</div>
                    {liveTranscript && (
                      <p style={{ fontSize: 12.5, fontStyle: 'italic', marginTop: 10, textAlign: 'left', background: '#fff', padding: 8, borderRadius: 6 }}>
                        {liveTranscript}
                      </p>
                    )}
                    <button className="btn secondary" onClick={handleStopRecording} style={{ marginTop: 12 }}>
                      ⏹️ Arrêter l'enregistrement
                    </button>
                  </div>
                )}
                {!isRecording && liveTranscript && !isProcessing && (
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 12.5, fontStyle: 'italic', background: '#fff', padding: 8, borderRadius: 6 }}>{liveTranscript}</p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                      <button className="btn secondary" onClick={handleReset}>Recommencer</button>
                      <button className="btn primary" onClick={() => handleAnalyze(liveTranscript)}>✨ Analyser avec l'IA</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'left' }}>
                <textarea
                  rows={4}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Ex : Le gérant est intéressé, il veut 4 sacs de riz et 2 bidons d'huile pour mercredi..."
                  style={{ width: '100%', padding: 8, fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn primary" onClick={() => handleAnalyze(manualText)} disabled={!manualText.trim() || isProcessing}>
                    ✨ Analyser avec l'IA
                  </button>
                </div>
              </div>
            )}

            {isProcessing && (
              <div>
                <div style={{ fontSize: 32 }}>✨</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>Analyse IA DeepSeek en cours...</div>
              </div>
            )}
          </div>
        )}

        {processError && (
          <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13 }}>
            {processError}
          </div>
        )}

        {!analysis && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn secondary" onClick={onClose}>Annuler / Fermer</button>
          </div>
        )}

        {analysis && (
          <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>
                🌐 Langue : {analysis.langue}
              </span>
              {analysis.relanceSuggereeDate && (
                <span className="badge" style={{ background: '#fef3c7', color: '#b45309' }}>
                  📅 Relance automatique : {analysis.relanceSuggereeDate}
                </span>
              )}
            </div>

            <h4 style={{ margin: '8px 0 4px', color: '#166534' }}>Résumé Exécutif IA :</h4>
            <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, fontWeight: 500 }}>{analysis.resumeIA}</p>

            {analysis.objections.length > 0 && (
              <>
                <h4 style={{ margin: '12px 0 4px', color: '#166534' }}>Objections relevées :</h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5 }}>
                  {analysis.objections.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </>
            )}

            <h4 style={{ margin: '12px 0 4px', color: '#166534' }}>Transcription :</h4>
            <p style={{ fontSize: 12, fontStyle: 'italic', color: '#4b5563', margin: 0 }}>"{finalTranscript}"</p>

            <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn secondary" onClick={handleReset}>Recommencer</button>
              <button className="btn primary" onClick={handleSaveToCrm}>💾 Enregistrer dans le CRM</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
