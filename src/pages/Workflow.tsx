import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { STATUT_COLORS, STATUT_LABELS, type Statut } from '../types'

interface Stage {
  statut: Statut | null
  titre: string
  phase: string
  description: string
  actions: string[]
  module?: { to: string; label: string }
}

const STAGES: Stage[] = [
  {
    statut: 'nouveau',
    phase: '1. Identification',
    titre: 'Repérer le prospect',
    description: "Le restaurant est identifié (import, recherche terrain, carte) mais n'a pas encore été contacté.",
    actions: [
      'Vérifier les coordonnées (téléphone, quartier)',
      "Assigner un agent commercial",
      'Repérer sur la carte pour organiser une tournée',
    ],
    module: { to: '/carte', label: 'Ouvrir la carte' },
  },
  {
    statut: 'contacte',
    phase: '2. Premier contact',
    titre: 'Établir le contact',
    description: 'Un premier appel, message WhatsApp ou visite a été effectué.',
    actions: [
      "Utiliser un modèle de message « Premier contact »",
      'Identifier le bon interlocuteur (gérant, propriétaire)',
      'Enregistrer une interaction dans la fiche',
    ],
    module: { to: '/communication', label: 'Envoyer un message' },
  },
  {
    statut: 'interesse',
    phase: '3. Qualification',
    titre: "Évaluer l'intérêt",
    description: "Le restaurant montre de l'intérêt : comprendre ses besoins de marché (produits, fréquence).",
    actions: [
      'Enregistrer le contact principal',
      'Proposer un aperçu du catalogue produits',
      'Planifier un rendez-vous',
    ],
    module: { to: '/catalogue', label: 'Voir le catalogue' },
  },
  {
    statut: 'rdv',
    phase: '4. Présentation',
    titre: 'Rendez-vous',
    description: "Présentation détaillée de l'application NDUGUMi et de son fonctionnement.",
    actions: [
      "Montrer l'application (démonstration)",
      'Répondre aux objections',
      'Envoyer une proposition de produits par WhatsApp',
    ],
  },
  {
    statut: 'negociation',
    phase: '5. Négociation',
    titre: 'Finaliser les modalités',
    description: 'Discussion sur la fréquence de commande, les modalités de livraison.',
    actions: ['Clarifier les conditions', 'Fixer une date de démarrage prévisionnelle'],
  },
  {
    statut: 'signe',
    phase: '6. Signature',
    titre: 'Accord conclu',
    description: 'Le restaurant a accepté de devenir client NDUGUMi.',
    actions: [
      "Accompagner l'inscription sur l'application (Compte NDUGUMi)",
      'Renseigner la date de démarrage effectif',
    ],
    module: { to: '/ndugumi', label: 'Suivi NDUGUMi' },
  },
  {
    statut: 'client_actif',
    phase: '7. Gestion du client',
    titre: 'Client actif',
    description: "Le restaurant commande régulièrement son marché via l'application. Objectif : fidéliser et développer le volume.",
    actions: [
      'Suivre la santé du compte (bonne / à risque / churn)',
      'Proposer régulièrement de nouveaux produits',
      'Suivre le volume et la fréquence de commande',
    ],
    module: { to: '/rapports', label: 'Voir les rapports' },
  },
  {
    statut: 'client_inactif',
    phase: '8. Réactivation',
    titre: 'Client inactif',
    description: "Le restaurant a cessé de commander. À traiter en priorité pour comprendre pourquoi et relancer.",
    actions: [
      'Contacter pour comprendre la raison',
      "Proposer une offre de réactivation",
      'Mettre à jour la santé du compte',
    ],
  },
]

export default function Workflow() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const j of joined) m[j.crm.statut] = (m[j.crm.statut] ?? 0) + 1
    return m
  }, [joined])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Parcours client</h1>
          <p className="page-subtitle">
            De l'identification du prospect à la gestion du compte client — chaque étape correspond à un statut
            du CRM.
          </p>
        </div>
      </div>

      {STAGES.map((s, i) => (
        <div key={s.titre} className="panel" style={{ borderLeft: `5px solid ${s.statut ? STATUT_COLORS[s.statut] : '#8a94a6'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {s.phase}
              </div>
              <h3 style={{ margin: '4px 0 6px' }}>{s.titre}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 10px', maxWidth: 560 }}>{s.description}</p>
            </div>
            {s.statut && (
              <Link to={`/prospects?statut=${s.statut}`}>
                <div style={{ textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: STATUT_COLORS[s.statut] }}>
                    {counts[s.statut] ?? 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                    {STATUT_LABELS[s.statut]} →
                  </div>
                </div>
              </Link>
            )}
          </div>
          <ul style={{ margin: '4px 0 10px', paddingLeft: 18, fontSize: 12.5 }}>
            {s.actions.map((a) => (
              <li key={a} style={{ marginBottom: 3 }}>
                {a}
              </li>
            ))}
          </ul>
          {s.module && (
            <Link to={s.module.to}>
              <button className="btn secondary small">{s.module.label} ↗</button>
            </Link>
          )}
          {i < STAGES.length - 1 && (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 18, marginTop: 8 }}>↓</div>
          )}
        </div>
      ))}

      <div className="panel" style={{ background: '#faf7f2' }}>
        <h3>Statuts hors parcours principal</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
          <strong>Refusé</strong> ({counts['refuse'] ?? 0}) et <strong>Injoignable</strong> ({counts['injoignable'] ?? 0})
          sortent du parcours actif — à ne relancer que ponctuellement (nouveau contact, changement de gérance).
        </p>
        <Link to="/prospects">
          <button className="btn secondary small">Voir tous les prospects</button>
        </Link>
      </div>
    </div>
  )
}
