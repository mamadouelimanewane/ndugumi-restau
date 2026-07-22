import { useState } from 'react'

interface CompetitorPriceComparerModalProps {
  etablissement: string
  onClose: () => void
}

export default function CompetitorPriceComparerModal({ etablissement, onClose }: CompetitorPriceComparerModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
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

  function handleAnalyzeReceipt() {
    if (!selectedFile) return
    setIsAnalyzing(true)

    // Simulation d'extraction Vision IA des prix concurrents
    setTimeout(() => {
      setComparisonResult({
        fournisseurConcurrent: 'Grossiste Marché Tilène / Concurrent',
        lignes: [
          { produit: 'Riz brisé parfumé 25kg', prixConcurrent: 16500, prixNdugumi: 15000, economie: 1500 },
          { produit: 'Huile végétale bidon 20L', prixConcurrent: 24000, prixNdugumi: 22000, economie: 2000 },
          { produit: 'Oignon sac 25kg', prixConcurrent: 10500, prixNdugumi: 9000, economie: 1500 },
          { produit: 'Poulet entier carton (10 pcs)', prixConcurrent: 34500, prixNdugumi: 32000, economie: 2500 },
        ],
        economieTotaleFCFA: 7500,
        pourcentageEconomie: 8.7,
      })
      setIsAnalyzing(false)
    }, 2000)
  }

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}>
      <div className="panel" style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>📸 Comparateur Tarifaire Concurrence Vision IA</h2>
          <button className="sidebar-close-btn" onClick={onClose}>✕</button>
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
            {isAnalyzing ? '🔍 Analyse des prix par Vision IA...' : '✨ Comparer les Prix par IA'}
          </button>
        )}

        {comparisonResult && (
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
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

            <div style={{ marginTop: 16, padding: 12, background: '#ecfdf5', borderRadius: 6, fontSize: 13, color: '#065f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💡 **Argument de Closing** : Pour ce restaurant, passer chez NDUGUMi représente ~<strong>{(comparisonResult.economieTotaleFCFA * 4).toLocaleString()} FCFA d'économie par mois</strong>.</span>
              <button className="btn small primary" onClick={onClose}>Fermer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
