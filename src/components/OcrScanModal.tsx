import { useState, useRef } from 'react'
import { Zone } from '../types'

interface OcrScanModalProps {
  onClose: () => void
  onApply: (data: { etablissement: string; telephone: string; quartier: string; zone: Zone; tags: string[] }) => void
}

export default function OcrScanModal({ onClose, onApply }: OcrScanModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [extractedData, setExtractedData] = useState<{
    etablissement: string
    telephone: string
    quartier: string
    zone: Zone
    tags: string[]
  } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setExtractedData(null)
  }

  async function handleScan() {
    if (!selectedFile) return
    setIsScanning(true)

    // Simulation d'extraction OCR Vision IA DeepSeek
    setTimeout(() => {
      const fileName = selectedFile.name.toLowerCase()
      let result = {
        etablissement: "Restaurant La Teranga Chez Awa",
        telephone: "77 654 32 10",
        quartier: "Médina",
        zone: "Dakar intra-muros" as Zone,
        tags: ["Thiéboudiène", "Plat du jour", "Fast-food local"],
      }

      if (fileName.includes('dibiterie') || fileName.includes('viande')) {
        result = {
          etablissement: "Dibiterie Mbao & Frères",
          telephone: "78 123 45 67",
          quartier: "Mbao",
          zone: "Banlieue" as Zone,
          tags: ["Dibiterie", "Mouton", "Grillades"],
        }
      } else if (fileName.includes('fast') || fileName.includes('burger')) {
        result = {
          etablissement: "Dakar Snack Express",
          telephone: "76 987 65 43",
          quartier: "Almadies",
          zone: "Dakar intra-muros" as Zone,
          tags: ["Fast-food", "Livraison", "Sandwicherie"],
        }
      }

      setExtractedData(result)
      setIsScanning(false)
    }, 1800)
  }

  function handleConfirm() {
    if (extractedData) {
      onApply(extractedData)
      onClose()
    }
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
        style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>📷 Scanner OCR IA (Cartes, Devantures, Menus)</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer la fenêtre">✕</button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Prenez en photo une carte de visite, un menu ou la devanture d'un restaurant. L'IA extrait automatiquement les coordonnées et produits consommés.
        </p>

        <div style={{ border: '2px dashed var(--border)', padding: 20, textAlign: 'center', borderRadius: 8, background: '#fafafa', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
          {previewUrl ? (
            <img src={previewUrl} alt="Aperçu photo" style={{ maxHeight: 200, objectFit: 'contain', borderRadius: 6 }} />
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Cliquez pour choisir une photo ou prendre un cliché</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Format JPG, PNG supporté</div>
            </div>
          )}
        </div>

        {selectedFile && !extractedData && (
          <button className="btn" onClick={handleScan} disabled={isScanning}>
            {isScanning ? '🔍 Analyse Vision IA en cours...' : '✨ Analyser la photo par IA'}
          </button>
        )}

        {!extractedData && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn secondary" onClick={onClose}>Annuler / Fermer</button>
          </div>
        )}

        {extractedData && (
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 15, color: 'var(--primary)' }}>✅ Données Extraites par IA</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>Établissement</label>
                <input
                  type="text"
                  value={extractedData.etablissement}
                  onChange={(e) => setExtractedData({ ...extractedData, etablissement: e.target.value })}
                  style={{ width: '100%', padding: 6, fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>Téléphone</label>
                <input
                  type="text"
                  value={extractedData.telephone}
                  onChange={(e) => setExtractedData({ ...extractedData, telephone: e.target.value })}
                  style={{ width: '100%', padding: 6, fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>Quartier</label>
                <input
                  type="text"
                  value={extractedData.quartier}
                  onChange={(e) => setExtractedData({ ...extractedData, quartier: e.target.value })}
                  style={{ width: '100%', padding: 6, fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>Zone</label>
                <select
                  value={extractedData.zone}
                  onChange={(e) => setExtractedData({ ...extractedData, zone: e.target.value as Zone })}
                  style={{ width: '100%', padding: 6, fontSize: 13 }}
                >
                  <option value="Dakar intra-muros">Dakar intra-muros</option>
                  <option value="Banlieue">Banlieue</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>Tags Métier Déduits</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {extractedData.tags.map((t) => (
                  <span key={t} className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn secondary" onClick={() => setExtractedData(null)}>Réessayer</button>
              <button className="btn secondary" onClick={onClose}>Fermer</button>
              <button className="btn primary" onClick={handleConfirm}>Créer / Mettre à jour la fiche</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
