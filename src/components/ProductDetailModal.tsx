import { useState, useRef } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import type { Product, ProductMedia } from '../types'

interface ProductDetailModalProps {
  productId: string
  onClose: () => void
}

export default function ProductDetailModal({ productId, onClose }: ProductDetailModalProps) {
  const product = useCrmStore((s) => s.products[productId])
  const updateProduct = useCrmStore((s) => s.updateProduct)
  const removeProduct = useCrmStore((s) => s.removeProduct)

  const [isEditing, setIsEditing] = useState(false)
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)
  const [showPitchModal, setShowPitchModal] = useState(false)
  const [aiPitch, setAiPitch] = useState('')
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Champs modifiables
  const [nom, setNom] = useState(product?.nom || '')
  const [categorie, setCategorie] = useState(product?.categorie || '')
  const [prixUnitaire, setPrixUnitaire] = useState(product?.prixUnitaire || 0)
  const [unite, setUnite] = useState(product?.unite || '')
  const [description, setDescription] = useState(product?.description || '')
  const [origine, setOrigine] = useState(product?.origine || '')
  const [stockDispo, setStockDispo] = useState(product?.stockDispo || 0)
  const [minimumCommande, setMinimumCommande] = useState(product?.minimumCommande || 1)
  const [fournisseur, setFournisseur] = useState(product?.fournisseur || '')

  if (!product) return null

  const medias = product.medias || []
  const activeMedia = medias[activeMediaIndex] || medias[0]

  function handleSaveInfo() {
    updateProduct(productId, {
      nom: nom.trim(),
      categorie: categorie.trim(),
      prixUnitaire: Number(prixUnitaire) || 0,
      unite: unite.trim(),
      description: description.trim(),
      origine: origine.trim(),
      stockDispo: Number(stockDispo) || 0,
      minimumCommande: Number(minimumCommande) || 1,
      fournisseur: fournisseur.trim(),
    })
    setIsEditing(false)
  }

  // Upload d'image ou vidéo (converti en Base64 pour persistence)
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const file = files[0]
    const isVideo = file.type.startsWith('video/')
    const reader = new FileReader()

    reader.onload = (event) => {
      const url = event.target?.result as string
      const newMedia: ProductMedia = {
        id: `media-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        url,
        type: isVideo ? 'video' : 'image',
        name: file.name,
        size: file.size,
      }

      const updatedMedias = [...medias, newMedia]
      updateProduct(productId, { medias: updatedMedias })
      setActiveMediaIndex(updatedMedias.length - 1)
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    reader.readAsDataURL(file)
  }

  // Téléchargement d'un média (Image ou Vidéo)
  function handleDownloadMedia(media: ProductMedia) {
    const a = document.createElement('a')
    a.href = media.url
    a.download = media.name || `${product.nom.replace(/\s+/g, '_')}_media`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Suppression d'un média
  function handleRemoveMedia(index: number) {
    if (confirm('Supprimer ce fichier média ?')) {
      const updatedMedias = medias.filter((_, i) => i !== index)
      updateProduct(productId, { medias: updatedMedias })
      if (activeMediaIndex >= updatedMedias.length) {
        setActiveMediaIndex(Math.max(0, updatedMedias.length - 1))
      }
    }
  }

  // Génération du pitch commercial par l'IA
  function generatePitch() {
    setIsGeneratingPitch(true)
    setShowPitchModal(true)

    setTimeout(() => {
      const pitchText = `🛒 *OFFRE SPÉCIALE NDUGUMi — ${product.nom.toUpperCase()}*

📍 *Provenance / Qualité* : ${product.origine || 'Qualité Supérieure Garantie'}
💰 *Prix unitaire* : ${product.prixUnitaire.toLocaleString('fr-FR')} FCFA par ${product.unite}
📦 *Commande minimum* : ${product.minimumCommande || 1} ${product.unite}
📊 *Stock dispo* : ${product.stockDispo ? `${product.stockDispo} ${product.unite}s en stock` : 'Disponible immédiatement'}

📝 *Description* :
${product.description || 'Produit frais sélectionné pour les restaurants exigeants de Dakar.'}

🚚 *Avantages NDUGUMi* :
• Livraison rapide directement en cuisine
• Prix fixes et stables
• Paiement à la livraison

👉 Répondez à ce message pour commander en 1 clic !`

      setAiPitch(pitchText)
      setIsGeneratingPitch(false)
    }, 600)
  }

  function copyPitch() {
    navigator.clipboard.writeText(aiPitch).then(() => {
      alert('📋 Pitch commercial copié dans le presse-papier !')
    })
  }

  function sharePitchWhatsApp() {
    const encoded = encodeURIComponent(aiPitch)
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank')
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 820,
          maxHeight: '92vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: 'var(--panel-bg, #ffffff)',
        }}
      >
        {/* En-tête de la Fiche Produit */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🏷️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>
                {product.nom}
              </h2>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <span className="zone-tag">{product.categorie}</span>
                {product.origine && <span className="zone-tag" style={{ background: '#e0f2fe', color: '#0369a1' }}>📍 {product.origine}</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn secondary small" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? '✖️ Annuler modification' : '✏️ Modifier fiche'}
            </button>
            <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
              ✕
            </button>
          </div>
        </div>

        {/* Section 1 : Visionneuse d'images & vidéos */}
        <div style={{ display: 'grid', gridTemplateColumns: medias.length > 0 ? '1fr 240px' : '1fr', gap: 16 }}>
          {/* Lecteur / Visualiseur principal */}
          <div style={{ background: '#111827', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, position: 'relative' }}>
            {activeMedia ? (
              activeMedia.type === 'video' ? (
                <video
                  controls
                  src={activeMedia.url}
                  style={{ width: '100%', maxHeight: 320, objectFit: 'contain' }}
                />
              ) : (
                <img
                  src={activeMedia.url}
                  alt={product.nom}
                  style={{ width: '100%', maxHeight: 320, objectFit: 'contain' }}
                />
              )
            ) : (
              <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📷 🎬</div>
                <div>Aucune image ou vidéo associée</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Importez des visuels ou vidéos pour présenter le produit aux clients</div>
              </div>
            )}

            {/* Boutons d'action sur le média actif */}
            {activeMedia && (
              <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', gap: 6, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: 6 }}>
                <button
                  className="btn small"
                  style={{ background: '#10b981', color: '#fff', fontSize: 11, padding: '4px 8px' }}
                  onClick={() => handleDownloadMedia(activeMedia)}
                  title="Télécharger ce fichier image ou vidéo"
                >
                  ⬇️ Télécharger
                </button>
                <button
                  className="btn secondary small"
                  style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444', fontSize: 11, padding: '4px 8px' }}
                  onClick={() => handleRemoveMedia(activeMediaIndex)}
                  title="Supprimer ce média"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>

          {/* Liste des miniatures & Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>
              MÉDIAS DU PRODUIT ({medias.length})
            </div>

            {/* Bouton d'upload File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              className="btn primary small"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? 'Chargement...' : '📤 Ajouter Image / Vidéo'}
            </button>

            {/* Miniatures */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxHeight: 210, overflowY: 'auto' }}>
              {medias.map((m, idx) => (
                <div
                  key={m.id}
                  onClick={() => setActiveMediaIndex(idx)}
                  style={{
                    height: 60,
                    borderRadius: 6,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: activeMediaIndex === idx ? '2px solid var(--primary, #7a1f1f)' : '1px solid var(--border)',
                    position: 'relative',
                    background: '#000',
                  }}
                >
                  {m.type === 'video' ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>
                      ▶️
                    </div>
                  ) : (
                    <img src={m.url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2 : Édition ou Affichage des Détails du Produit */}
        {isEditing ? (
          <div className="panel" style={{ background: '#fafafa', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>✏️ Modifier les détails de la fiche produit</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div className="field-row">
                <label>Nom du produit</label>
                <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
              <div className="field-row">
                <label>Catégorie</label>
                <input type="text" value={categorie} onChange={(e) => setCategorie(e.target.value)} />
              </div>
              <div className="field-row">
                <label>Prix Unitaire (FCFA)</label>
                <input type="number" value={prixUnitaire} onChange={(e) => setPrixUnitaire(Number(e.target.value))} />
              </div>
              <div className="field-row">
                <label>Unité de vente (ex: sac 25kg, kg, carton)</label>
                <input type="text" value={unite} onChange={(e) => setUnite(e.target.value)} />
              </div>
              <div className="field-row">
                <label>Origine / Provenance</label>
                <input type="text" value={origine} onChange={(e) => setOrigine(e.target.value)} placeholder="Ex: Vallée du Fleuve" />
              </div>
              <div className="field-row">
                <label>Stock disponible</label>
                <input type="number" value={stockDispo} onChange={(e) => setStockDispo(Number(e.target.value))} />
              </div>
              <div className="field-row">
                <label>Minimum de commande</label>
                <input type="number" value={minimumCommande} onChange={(e) => setMinimumCommande(Number(e.target.value))} />
              </div>
              <div className="field-row">
                <label>Fournisseur / Grossiste</label>
                <input type="text" value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} placeholder="Ex: Grossiste Tilène" />
              </div>
            </div>
            <div className="field-row" style={{ marginTop: 10 }}>
              <label>Description du produit</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: '100%', padding: 8, fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn secondary" onClick={() => setIsEditing(false)}>Annuler</button>
              <button className="btn primary" onClick={handleSaveInfo}>Enregistrer la fiche</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div className="panel" style={{ background: '#fcfbf9' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>PRIX & CONDITIONNEMENT</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary, #7a1f1f)', marginTop: 4 }}>
                {product.prixUnitaire.toLocaleString('fr-FR')} FCFA
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>par {product.unite}</div>
            </div>

            <div className="panel" style={{ background: '#fcfbf9' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>STOCK & LOGISTIQUE</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                📦 Stock : {product.stockDispo ? `${product.stockDispo} ${product.unite}` : 'Dispo sous 24h'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                🛒 Min. commande : {product.minimumCommande || 1} {product.unite}
              </div>
            </div>

            <div className="panel" style={{ background: '#fcfbf9' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>FOURNISSEUR & ORIGINE</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                📍 {product.origine || 'Dakar / Importation'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                🏬 {product.fournisseur || 'Fournisseur agréé NDUGUMi'}
              </div>
            </div>
          </div>
        )}

        {/* Description complète */}
        {!isEditing && product.description && (
          <div className="panel" style={{ background: '#faf8f5' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
              DESCRIPTION DU PRODUIT
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>
              {product.description}
            </div>
          </div>
        )}

        {/* Section 3 : Actions Commerciales & Pitch IA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <button className="btn secondary" onClick={generatePitch}>
            🪄 Générer Pitch Commercial WhatsApp IA
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn secondary"
              style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}
              onClick={() => {
                if (confirm(`Supprimer définitivement « ${product.nom} » ?`)) {
                  removeProduct(productId)
                  onClose()
                }
              }}
            >
              🗑️ Supprimer
            </button>
            <button className="btn primary" onClick={onClose}>
              Fermer la fiche
            </button>
          </div>
        </div>

        {/* Modal du Pitch IA WhatsApp */}
        {showPitchModal && (
          <div className="panel" style={{ background: '#e8f5e9', border: '1px solid #81c784', marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ color: '#1b5e20', fontSize: 13 }}>💬 Pitch Commercial WhatsApp Généré :</strong>
              <button className="btn secondary small" onClick={() => setShowPitchModal(false)}>Fermer</button>
            </div>

            {isGeneratingPitch ? (
              <p style={{ fontSize: 12.5, color: '#2e7d32' }}>Génération du pitch en cours...</p>
            ) : (
              <>
                <textarea
                  rows={8}
                  value={aiPitch}
                  onChange={(e) => setAiPitch(e.target.value)}
                  style={{ width: '100%', padding: 10, fontFamily: 'monospace', fontSize: 12, borderRadius: 6, border: '1px solid #a5d6a7' }}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end' }}>
                  <button className="btn secondary small" onClick={copyPitch}>
                    📋 Copier
                  </button>
                  <button className="btn small" style={{ background: '#25d366', borderColor: '#1f8a4c', color: '#fff' }} onClick={sharePitchWhatsApp}>
                    📲 Partager sur WhatsApp
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
