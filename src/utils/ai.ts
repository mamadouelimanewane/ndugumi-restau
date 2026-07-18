// Appels vers les fonctions serverless /api/ai-* — la clé DeepSeek reste côté serveur,
// jamais exposée au navigateur. Ces fonctions échouent silencieusement en dev local
// (npm run dev via Vite ne sert pas /api) : elles ne fonctionnent qu'une fois déployées.

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error || `Erreur ${res.status}`)
  }
  return res.json() as Promise<T>
}

export interface AiSummaryInput {
  etablissement: string
  quartier: string
  zone: string
  statut: string
  agent: string
  prochaineRelance: string | null
  tags: string[]
  notes: { date: string; type: string; texte: string }[]
  tasks: { titre: string; dateEcheance: string; statut: string }[]
  ndugumiInscrit: boolean
}

export function fetchAiSummary(input: AiSummaryInput): Promise<{ summary: string }> {
  return postJson('/api/ai-summary', input)
}

export interface AiMessageInput {
  etablissement: string
  quartier: string
  statut: string
  tags: string[]
  canal: 'whatsapp' | 'email'
  objectif: string
  recentNotes: { date: string; texte: string }[]
}

export function fetchAiMessage(input: AiMessageInput): Promise<{ sujet: string; corps: string }> {
  return postJson('/api/ai-message', input)
}

export interface AiScoreInput {
  etablissement: string
  quartier: string
  statut: string
  hasContact: boolean
  tags: string[]
  notes: { date: string; type: string; texte: string }[]
  overdueTasks: number
  overdueRelance: boolean
  quartierClientsCount: number
}

export function fetchAiScore(
  input: AiScoreInput
): Promise<{ score: number; raison: string; prochaineAction: string }> {
  return postJson('/api/ai-score', input)
}
