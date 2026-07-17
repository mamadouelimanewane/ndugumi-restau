/**
 * Formate en date locale (pas UTC) : toISOString() décale d'un jour dès que le fuseau du
 * navigateur est en avance sur UTC (ex. UTC+8), ce qui désynchronise la grille des dates
 * stockées "yyyy-mm-dd" (elles-mêmes sans fuseau, à traiter comme des dates civiles).
 */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export { WEEKDAY_LABELS }

/** Grille de 6 semaines (Lun→Dim) couvrant le mois, avec les jours de bord des mois adjacents. */
export function getMonthMatrix(monthStart: Date): Date[][] {
  const first = startOfMonth(monthStart)
  const firstWeekday = (first.getDay() + 6) % 7 // 0 = lundi
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - firstWeekday)

  const weeks: Date[][] = []
  const cursor = new Date(gridStart)
  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
