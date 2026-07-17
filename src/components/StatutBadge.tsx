import { STATUT_COLORS, STATUT_LABELS, type Statut } from '../types'

export default function StatutBadge({ statut }: { statut: Statut }) {
  return (
    <span className="badge" style={{ background: STATUT_COLORS[statut] }}>
      {STATUT_LABELS[statut]}
    </span>
  )
}
