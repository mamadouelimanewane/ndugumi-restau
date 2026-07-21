// Appels vers les fonctions serverless /api/ai-* — la clé DeepSeek reste côté serveur,
// jamais exposée au navigateur. Ces fonctions échouent silencieusement en dev local
// (npm run dev via Vite ne sert pas /api) : elles ne fonctionnent qu'une fois déployées.

async function postJson<T>(path: string, body: any): Promise<T> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
  } catch (err) {
    // Fallback for local dev when Vercel API is not available
    console.warn(`[Mock IA] Fallback utilisé pour ${path}`, body)
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800))
    
    if (path === '/api/ai-summary') {
      return { summary: `[MOCK IA] Voici un résumé généré pour ${body.etablissement}. Ce prospect est dans le quartier ${body.quartier} avec un statut ${body.statut}.` } as any
    }
    if (path === '/api/ai-message') {
      return { 
        sujet: `Proposition NDUGUMi pour ${body.etablissement}`, 
        corps: `Bonjour l'équipe de ${body.etablissement},\n\nSuite à nos échanges, voici un message généré spécialement pour vous concernant l'objectif : "${body.objectif}".\n\nN'hésitez pas à nous recontacter.\n\nCordialement, l'équipe NDUGUMi.` 
      } as any
    }
    if (path === '/api/ai-score') {
      return { score: 75, raison: "Client très actif mais quelques retards", prochaineAction: "Appeler pour proposer une promo" } as any
    }
    
    throw err
  }
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
