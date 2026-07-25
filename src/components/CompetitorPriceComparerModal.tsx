import { useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { extractTextFromImage } from '../utils/ocr'

interface CompetitorPriceComparerModalProps {
  etablissement: string
  onClose: () => void
}

export default function CompetitorPriceComparerModal({ etablissement, onClose }: CompetitorPriceComparerModalProps) {
  const products = useCrmStore((s) => s.products)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [comparisonResult, setComparisonResult] = useState<{
    fournisseurConcurrent: string
    lignes: { produit: string; prixConcurrent: number; prixNdugumi: number; economie: number }[]
    economieTotaleFCFA: number
    pourcentageEconomie: number
  } | null>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setComparisonResult(null)
  }

  async function handleAnalyzeReceipt() {
    if (!selectedFile) return
    setIsAnalyzing(true)
    setAnalyzeError(null)

    try {
      const ocrText = await extractTextFromImage(selectedFile)
      const ndugumiProducts = Object.values(products).map((p) => ({
        nom: p.nom,
        prixUnitaire: p.prixUnitaire,
        unite: p.unite,
      }))
      const res = await fetch('/api/ai-price-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrText, ndugumiProducts }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAnalyzeError(data.error || "Erreur lors de l'analyse de la photo.")
        return
      }
      setComparisonResult(data)
    } catch (e: any) {
      setAnalyzeError(e?.message || 'Impossible de lire cette photo.')
    } finally {
      setIsAnalyzing(false)
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
        style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>📸 Comparateur Tarifaire Concurrence Vision IA</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer la fenêtre">✕</button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Scannez la facture ou le reçu d'un fournisseur concurrent apporté par le restaurant. L'IA compare ligne par ligne les prix avec NDUGUMi et calcule le gain annuel.
        </p>

        <div style={{ border: '2px dashed var(--border)', padding: 16, textAlign: 'center', borderRadius: 8, background: '#fafafa', cursor: 'pointer' }} onClick={() => document.getElementById('receipt-upload')?.click()}>
          <input id="receipt-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
          {previewUrl ? (
            <img src={previewUrl} alt="Facture concurrente" style={{ maxHeight: 180, objectFit: 'contain', borderRadius: 6 }} />
          ) : (
            <div>
              <div style={{ fontSize: 28, marginBottom: 4 }}>📄</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Cliquez pour charger la photo du reçu / de la facture concurrente</div>
            </div>
          )}
        </div>

        {selectedFile && !comparisonResult && (
          <button className="btn primary" onClick={handleAnalyzeReceipt} disabled={isAnalyzing}>
            {isAnalyzing ? '🔍 Lecture du texte puis analyse des prix par IA...' : '✨ Comparer les Prix par IA'}
          </button>
        )}

        {analyzeError && (
          <div style={{ color: 'var(--danger, #c0392b)', fontSize: 12.5 }}>{analyzeError}</div>
        )}

        {!comparisonResult && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn secondary" onClick={onClose}>Annuler / Fermer</button>
          </div>
        )}

        {comparisonResult && (
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '0 0 12px' }}>
              Suggestions générées par IA (DeepSeek) à partir de la photo — à vérifier avant de les présenter au restaurant.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--primary)' }}>Résultat de l'Analyse Comparative</h3>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Fournisseur : {comparisonResult.fournisseurConcurrent}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ok)' }}>-{comparisonResult.economieTotaleFCFA.toLocaleString()} FCFA</div>
                <div style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 600 }}>{comparisonResult.pourcentageEconomie}% d'économie avec NDUGUMi</div>
              </div>
            </div>

            {comparisonResult.lignes.length === 0 ? (
              <div className="empty-state">
                Aucune ligne de prix n'a pu être identifiée avec certitude sur cette photo (qualité de l'image, ou aucun produit ne correspond au catalogue NDUGUMi). Essayez une photo plus nette ou plus rapprochée.
              </div>
            ) : (
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Prix Concurrence</th>
                    <th>Prix NDUGUMi</th>
                    <th>Économie / Unité</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonResult.lignes.map((l, i) => (
                    <tr key={i}>
                      <td><strong>{l.produit}</strong></td>
                      <td style={{ color: '#991b1b', fontWeight: 600 }}>{l.prixConcurrent.toLocaleString()} FCFA</td>
                      <td style={{ color: '#047857', fontWeight: 700 }}>{l.prixNdugumi.toLocaleString()} FCFA</td>
                      <td style={{ color: '#047857', fontWeight: 800 }}>-{l.economie.toLocaleString()} FCFA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ marginTop: 16, padding: 12, background: '#ecfdf5', borderRadius: 6, fontSize: 13, color: '#065f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {comparisonResult.lignes.length > 0 ? (
                <span>💡 **Argument de Closing** : Sur la base de cette facture, passer chez NDUGUMi représenterait environ <strong>{(comparisonResult.economieTotaleFCFA * 4).toLocaleString()} FCFA d'économie estimée par mois</strong> (en supposant un rythme d'achat similaire).</span>
              ) : (
                <span>Réessayez avec une autre photo pour obtenir un argument chiffré.</span>
              )}
              <button className="btn small primary" onClick={onClose}>Fermer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
