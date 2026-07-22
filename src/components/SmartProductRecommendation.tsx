import { useMemo } from 'react'
import { useCrmStore } from '../store/useCrmStore'

interface SmartProductRecommendationProps {
  tags: string[]
  etablissement: string
}

export default function SmartProductRecommendation({ tags, etablissement }: SmartProductRecommendationProps) {
  const products = useCrmStore((s) => s.products)
  const productList = useMemo(() => Object.values(products), [products])

  const recommendations = useMemo(() => {
    const textTags = tags.join(' ').toLowerCase()
    const recs = []

    if (textTags.includes('thiéboudiène') || textTags.includes('plat du jour') || textTags.includes('poisson')) {
      recs.push({
        specialite: 'Thiéboudiène / Plats Sénégalais',
        icon: '🍲',
        package: ['Riz brisé parfumé 25kg', 'Poisson thiof/yaboy (caisse)', 'Concentré de tomate (carton)', 'Huile végétale bidon 20L'],
        argument: 'Package clé-en-main le plus commandé par les restaurants de Thiéboudiène à Dakar.',
      })
    }

    if (textTags.includes('dibiterie') || textTags.includes('grillade') || textTags.includes('mouton')) {
      recs.push({
        specialite: 'Dibiterie & Grillades',
        icon: '🥩',
        package: ['Oignon sac 25kg', 'Poulet entier carton (10 pcs)', 'Huile végétale bidon 20L'],
        argument: 'Forts besoins quotidiens en oignon et volailles. Prix dégressif à partir de 5 sacs d\'oignons.',
      })
    }

    if (textTags.includes('fast-food') || textTags.includes('burger') || textTags.includes('sandwicherie')) {
      recs.push({
        specialite: 'Fast-Food & Snack',
        icon: '🍔',
        package: ['Pomme de terre sac 25kg', 'Huile végétale bidon 20L', 'Poulet entier carton (10 pcs)'],
        argument: 'Huile et pommes de terre pour frites livrées quotidiennement avec garantie de fraîcheur.',
      })
    }

    if (recs.length === 0) {
      recs.push({
        specialite: 'Restauration Générale',
        icon: '🍽️',
        package: ['Riz brisé parfumé 25kg', 'Huile végétale bidon 20L', 'Oignon sac 25kg', 'Sucre sac 50kg'],
        argument: 'Les 4 incontournables de base pour tout établissement de restauration à Dakar.',
      })
    }

    return recs
  }, [tags])

  return (
    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>🍲</span>
        <strong style={{ fontSize: 13, color: 'var(--primary)' }}>Recommandations Produits IA (Smart Cross-Sell)</strong>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {recommendations.map((rec, idx) => (
          <div key={idx} style={{ background: '#fff', padding: 12, borderRadius: 6, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-dark)', marginBottom: 4 }}>
              {rec.icon} Spécialité détectée : {rec.specialite}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{rec.argument}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {rec.package.map((p, i) => (
                <span key={i} className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 11 }}>
                  + {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
