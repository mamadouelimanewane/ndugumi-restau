import { useMemo, useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { waLinkWithText } from '../utils/phone'

import { requestNotificationPermission, showReminderNotification } from '../utils/notifications'

interface SystemNotification {
  id: string
  type: 'relance' | 'impaye' | 'restock' | 'anniversaire'
  titre: string
  description: string
  restaurantId: number
  etablissement: string
  telephone: string
  priorite: 'haute' | 'moyenne' | 'normale'
  date: string
}

const SEED_NOTIFS: SystemNotification[] = [
  {
    id: 'notif-1',
    type: 'impaye',
    titre: '⚠️ Impayé en retard (8 jours)',
    description: 'La facture FAC-2026-0710 de Chez Katia (185 000 FCFA) dépasse l\'échéance de 8 jours.',
    restaurantId: 1,
    etablissement: 'Chez Katia',
    telephone: '+221 77 123 45 67',
    priorite: 'haute',
    date: 'Aujourd\'hui',
  },
  {
    id: 'notif-2',
    type: 'restock',
    titre: '🔮 Alerte Réapprovisionnement Prédit IA',
    description: 'Le Lagon 1 arrive au seuil critique de son stock de Riz brisé (estimé à 2 jours restants).',
    restaurantId: 2,
    etablissement: 'Le Lagon 1',
    telephone: '+221 77 234 56 78',
    priorite: 'haute',
    date: 'Aujourd\'hui',
  },
  {
    id: 'notif-3',
    type: 'relance',
    titre: '📞 Relance téléphonique programmée',
    description: 'Rappel prévu avec le gérant de Dibiterie Haoussa pour valider l\'offre d\'oignons.',
    restaurantId: 3,
    etablissement: 'Dibiterie Haoussa',
    telephone: '+221 77 345 67 89',
    priorite: 'moyenne',
    date: 'Aujourd\'hui 14h30',
  },
  {
    id: 'notif-4',
    type: 'anniversaire',
    titre: '🎉 1 An de Partenariat NDUGUMi !',
    description: 'Restaurant La Pointe fête ses 12 mois de commandes régulières sur NDUGUMi.',
    restaurantId: 4,
    etablissement: 'Restaurant La Pointe',
    telephone: '+221 77 456 78 90',
    priorite: 'normale',
    date: 'Hier',
  },
]

export default function Notifications() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const [notifs, setNotifs] = useState<SystemNotification[]>(SEED_NOTIFS)
  const [typeFilter, setTypeFilter] = useState<string>('')

  const filteredNotifs = notifs.filter((n) => {
    if (typeFilter && n.type !== typeFilter) return false
    return true
  })

  function handleDismiss(id: string) {
    setNotifs((prev) => prev.filter((n) => n.id !== id))
  }

  function handleActionWhatsapp(n: SystemNotification) {
    const text = `Bonjour ${n.etablissement}, c'est au sujet de : ${n.titre} — ${n.description}`
    const link = waLinkWithText(n.telephone, text)
    if (link) window.open(link, '_blank')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🔔 Centre de Notifications & Alertes Quotidiennes</h1>
          <p className="page-subtitle">
            Toutes les actions prioritaires de la journée centralisées en un seul endroit
          </p>
        </div>
        <button
          className="btn primary"
          onClick={async () => {
            const permission = await requestNotificationPermission()
            if (permission === 'granted') {
              showReminderNotification(
                '🔔 Alerte NDUGUMi Restau',
                'Les notifications push en direct sont désormais activées sur votre appareil !'
              )
            } else if (permission === 'unsupported') {
              alert("Votre navigateur ne supporte pas les notifications.")
            }
          }}
        >
          📲 Activer & Tester les Push Navigateur
        </button>
      </div>

      {/* Filtres de notification */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <button className={typeFilter === '' ? 'btn' : 'btn secondary'} onClick={() => setTypeFilter('')}>Toutes les alertes ({notifs.length})</button>
        <button className={typeFilter === 'impaye' ? 'btn' : 'btn secondary'} onClick={() => setTypeFilter('impaye')}>⚠️ Impayés</button>
        <button className={typeFilter === 'restock' ? 'btn' : 'btn secondary'} onClick={() => setTypeFilter('restock')}>🔮 Réappro IA</button>
        <button className={typeFilter === 'relance' ? 'btn' : 'btn secondary'} onClick={() => setTypeFilter('relance')}>📞 Relances</button>
        <button className={typeFilter === 'anniversaire' ? 'btn' : 'btn secondary'} onClick={() => setTypeFilter('anniversaire')}>🎉 Fêtes & Événements</button>
      </div>

      {/* Liste des notifications */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredNotifs.map((n) => (
          <div
            key={n.id}
            className="panel"
            style={{
              borderLeft: n.priorite === 'haute' ? '4px solid #dc2626' : n.priorite === 'moyenne' ? '4px solid #f59e0b' : '4px solid #3b82f6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <strong style={{ fontSize: 14 }}>{n.titre}</strong>
                <span className="zone-tag" style={{ fontSize: 10 }}>{n.date}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4 }}>
                {n.description}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn secondary small"
                style={{ color: '#25d366', borderColor: '#25d366', fontWeight: 700 }}
                onClick={() => handleActionWhatsapp(n)}
              >
                📲 Traiter sur WhatsApp
              </button>
              <button
                className="btn secondary small"
                onClick={() => handleDismiss(n.id)}
              >
                ✓ Marquer traité
              </button>
            </div>
          </div>
        ))}
        {filteredNotifs.length === 0 && (
          <div className="panel empty-state">
            Aucune alerte en attente pour le moment. Tout est à jour ! 🎉
          </div>
        )}
      </div>
    </div>
  )
}
