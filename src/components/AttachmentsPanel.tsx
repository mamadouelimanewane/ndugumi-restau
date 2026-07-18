import { useEffect, useRef, useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { saveAttachmentBlob, getAttachmentBlob, deleteAttachmentBlob } from '../utils/attachmentsDb'
import type { Attachment, AttachmentKind } from '../types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function kindIcon(kind: AttachmentKind): string {
  if (kind === 'photo') return '🖼️'
  if (kind === 'audio') return '🎙️'
  return '📄'
}

function mimeToKind(mime: string): AttachmentKind {
  if (mime.startsWith('image/')) return 'photo'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}

function AttachmentRow({ attachment, onDelete }: { attachment: Attachment; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    getAttachmentBlob(attachment.id).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachment.id])

  return (
    <div className="note-item" style={{ borderLeftColor: 'var(--accent)' }}>
      <div className="note-meta">
        <span>
          {kindIcon(attachment.kind)} <strong>{attachment.nom}</strong>{' '}
          <span style={{ color: 'var(--text-dim)' }}>
            · {formatSize(attachment.taille)} · {attachment.agent} ·{' '}
            {new Date(attachment.createdAt).toLocaleString('fr-FR')}
          </span>
        </span>
        <button className="btn secondary small" onClick={onDelete} style={{ padding: '2px 8px' }}>
          Supprimer
        </button>
      </div>
      {url && attachment.kind === 'photo' && (
        <img src={url} alt={attachment.nom} style={{ maxWidth: 220, maxHeight: 160, borderRadius: 6, marginTop: 6 }} />
      )}
      {url && attachment.kind === 'audio' && (
        <audio controls src={url} style={{ marginTop: 6, width: '100%' }} />
      )}
      {url && attachment.kind === 'document' && (
        <a href={url} download={attachment.nom} className="btn small secondary" style={{ marginTop: 6, display: 'inline-block' }}>
          Télécharger
        </a>
      )}
      {!url && <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>Chargement…</div>}
    </div>
  )
}

export default function AttachmentsPanel({ restaurantId, agent }: { restaurantId: number; agent: string }) {
  const prospects = useCrmStore((s) => s.prospects)
  const addAttachmentMeta = useCrmStore((s) => s.addAttachmentMeta)
  const removeAttachmentMeta = useCrmStore((s) => s.removeAttachmentMeta)

  const attachments = prospects[restaurantId]?.attachments ?? []
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recordError, setRecordError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      const kind = mimeToKind(file.type)
      const id = addAttachmentMeta(restaurantId, kind, file.name, file.type || 'application/octet-stream', file.size, agent)
      await saveAttachmentBlob(id, file)
    }
    e.target.value = ''
  }

  function handleDelete(attachmentId: string) {
    if (!confirm('Supprimer cette pièce jointe ?')) return
    removeAttachmentMeta(restaurantId, attachmentId)
    deleteAttachmentBlob(attachmentId)
  }

  async function handleStartRecording() {
    setRecordError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const nom = `Note vocale ${new Date().toLocaleString('fr-FR')}.webm`
        const id = addAttachmentMeta(restaurantId, 'audio', nom, 'audio/webm', blob.size, agent)
        await saveAttachmentBlob(id, blob)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch (err: any) {
      setRecordError("Micro indisponible ou accès refusé. Vérifiez les permissions du navigateur.")
    }
  }

  function handleStopRecording() {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setIsRecording(false)
  }

  return (
    <div className="panel">
      <h3>Pièces jointes ({attachments.length})</h3>
      {attachments.map((a) => (
        <AttachmentRow key={a.id} attachment={a} onDelete={() => handleDelete(a.id)} />
      ))}
      {attachments.length === 0 && <div className="empty-state">Aucune pièce jointe pour ce restaurant.</div>}

      <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn secondary small" onClick={() => fileInputRef.current?.click()}>
          + Photo / document
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          multiple
          style={{ display: 'none' }}
          onChange={handleFilesSelected}
        />
        {!isRecording ? (
          <button className="btn secondary small" onClick={handleStartRecording}>
            🎙️ Enregistrer une note vocale
          </button>
        ) : (
          <button className="btn small" style={{ background: 'var(--danger)' }} onClick={handleStopRecording}>
            ⏹️ Arrêter l'enregistrement
          </button>
        )}
      </div>
      {recordError && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{recordError}</div>}
    </div>
  )
}
