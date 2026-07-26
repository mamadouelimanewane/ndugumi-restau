import { useState } from 'react'

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explication: string
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: "Quelle est la meilleure réponse lorsque le gérant dit : 'Je préfère envoyer mon cuisinier acheter au marché Castors' ?",
    options: [
      "Lui dire que Castors est trop loin.",
      "Calculer le temps perdu (4h/voyage) et les frais de taxi (5 000 FCFA/trajet), puis montrer l'économie de livraison gratuite NDUGUMi.",
      "Baisser le prix des sacs de riz de 50%.",
      "Quitter le restaurant sans insister.",
    ],
    correctIndex: 1,
    explication: "Démontrer le coût caché du transport et du temps perdu en cuisine est l'argument le plus puissant !",
  },
  {
    question: "En Wolof, comment dit-on 'La livraison est gratuite et directe au restaurant' ?",
    options: [
      "Li dafa seer lool.",
      "Livraison bi amul fay te dafay gnew ba ci bir cusine bi.",
      "Damay dém marché Castors.",
      "Jerejef ci liggeey bi.",
    ],
    correctIndex: 1,
    explication: "'Livraison bi amul fay' signifie livraison gratuite sans frais supplémentaires !",
  },
  {
    question: "Quel est l'avantage principal de la fonction 'Abonnement Récurrent' pour un restaurant ?",
    options: [
      "Obtenir une remise sur le café.",
      "S'assurer de ne jamais tomber en rupture de riz ou d'huile avant le service de midi sans avoir à repasser commande.",
      "Accéder à de la musique gratuite.",
      "Rien du tout.",
    ],
    correctIndex: 1,
    explication: "L'abonnement évite la hantise du coup de feu sans stock en cuisine !",
  },
]

interface ChatEntry {
  question: string
  reponse: string
}

export default function Academie() {
  const [activeTab, setActiveTab] = useState<'arguments' | 'wolof' | 'quiz' | 'assistant'>('arguments')
  const [quizScores, setQuizScores] = useState<Record<number, number>>({})
  const [showResults, setShowResults] = useState(false)

  const [chatQuestion, setChatQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  async function handleAskAssistant() {
    const question = chatQuestion.trim()
    if (!question) return
    setChatLoading(true)
    setChatError(null)
    try {
      const res = await fetch('/api/ai-academie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      if (!res.ok) {
        setChatError(data.error || 'Erreur lors de la génération de la réponse.')
        return
      }
      setChatHistory((prev) => [...prev, { question, reponse: data.reponse }])
      setChatQuestion('')
    } catch (e: any) {
      setChatError(e?.message || 'Impossible de contacter le serveur.')
    } finally {
      setChatLoading(false)
    }
  }

  function handleSelectAnswer(questionIdx: number, optionIdx: number) {
    setQuizScores({ ...quizScores, [questionIdx]: optionIdx })
  }

  const scoreCount = Object.keys(quizScores).reduce((acc, qIdx) => {
    const q = QUIZ_QUESTIONS[Number(qIdx)]
    return quizScores[Number(qIdx)] === q.correctIndex ? acc + 1 : acc
  }, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🎓 Académie Commerciale & Quiz de Formation Terrain</h1>
          <p className="page-subtitle">
            Arguments de vente, réponse aux objections, vocabulaire Wolof terrain et test de connaissances
          </p>
        </div>
      </div>

      {/* Onglets de Navigation Académie */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <button className={activeTab === 'arguments' ? 'btn' : 'btn secondary'} onClick={() => setActiveTab('arguments')}>
          📚 Réponses aux Objections (Pitch)
        </button>
        <button className={activeTab === 'wolof' ? 'btn' : 'btn secondary'} onClick={() => setActiveTab('wolof')}>
          🗣️ Lexique Wolof Commercial
        </button>
        <button className={activeTab === 'quiz' ? 'btn' : 'btn secondary'} onClick={() => setActiveTab('quiz')}>
          🏆 Test de Connaissances / Quiz
        </button>
        <button className={activeTab === 'assistant' ? 'btn' : 'btn secondary'} onClick={() => setActiveTab('assistant')}>
          🤖 Assistant IA
        </button>
      </div>

      {/* TAB 1 : ARGUMENTS & OBJECTIONS */}
      {activeTab === 'arguments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel" style={{ borderLeft: '4px solid #7a1f1f' }}>
            <h3 style={{ color: '#7a1f1f', margin: '0 0 8px' }}>❌ Objection 1 : "Le marché Tilène / Castors est moins cher !"</h3>
            <div style={{ fontSize: 13, background: '#f9fafb', padding: 12, borderRadius: 6 }}>
              <strong>💡 Réponse NDUGUMi :</strong><br />
              *"Monsieur le Gérant, au marché Tilène, le sac de riz est affiché à 22 500 FCFA. Mais ajoutez-y 4 000 FCFA de transporteur/taxi et 3 heures de temps de travail de votre cuisinier. Chez NDUGUMi, le sac est livré dans votre cuisine à 21 500 FCFA tout compris. Vous gagnez 5 000 FCFA par sac et votre cuisinier reste en cuisine pour préparer le service."*
            </div>
          </div>

          <div className="panel" style={{ borderLeft: '4px solid #7a1f1f' }}>
            <h3 style={{ color: '#7a1f1f', margin: '0 0 8px' }}>❌ Objection 2 : "Je n'ai pas le temps de commander sur une application."</h3>
            <div style={{ fontSize: 13, background: '#f9fafb', padding: 12, borderRadius: 6 }}>
              <strong>💡 Réponse NDUGUMi :</strong><br />
              *"Justement ! Nous configurons votre abonnement récurrent en 1 minute. Chaque lundi à 8h, votre panier type est préparé automatiquement. Il vous suffit de répondre VALIDER sur WhatsApp."*
            </div>
          </div>

          <div className="panel" style={{ borderLeft: '4px solid #7a1f1f' }}>
            <h3 style={{ color: '#7a1f1f', margin: '0 0 8px' }}>❌ Objection 3 : "Et si la qualité du poisson ou des légumes ne me convient pas ?"</h3>
            <div style={{ fontSize: 13, background: '#f9fafb', padding: 12, borderRadius: 6 }}>
              <strong>💡 Réponse NDUGUMi :</strong><br />
              *"Garantie 100% Satisfait ou Remplacé en 1 heure. Si un sac ou une caisse ne correspond pas à vos exigences à la livraison, le livreur vous le remplace immédiatement."*
            </div>
          </div>
        </div>
      )}

      {/* TAB 2 : LEXIQUE WOLOF */}
      {activeTab === 'wolof' && (
        <div className="panel">
          <h3>🗣️ Expressions Clés en Wolof Commercial</h3>
          <table className="data-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Expression en Wolof</th>
                <th>Traduction en Français</th>
                <th>Utilisation Terrain</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>"Ndougou bi dafa yomb te dafa féèg"</strong></td>
                <td>Le marché est facile et très frais.</td>
                <td>Pour rassurer sur la fraîcheur des arrivages de la Vallée.</td>
              </tr>
              <tr>
                <td><strong>"Livraison bi amul fay, ba ci biir cuisine bi"</strong></td>
                <td>La livraison est 100% gratuite jusque dans la cuisine.</td>
                <td>Pour éliminer l'objection des frais de transport.</td>
              </tr>
              <tr>
                <td><strong>"So beugé wàññi sa dépense, NDUGUMi moy solution bi"</strong></td>
                <td>Si tu veux réduire tes dépenses, NDUGUMi est la solution.</td>
                <td>Phrase d'accroche d'ouverture de visite.</td>
              </tr>
              <tr>
                <td><strong>"Fay par Wave wala Orange Money yomb na"</strong></td>
                <td>Le paiement par Wave ou Orange Money est très simple.</td>
                <td>Pour faciliter la conclusion de la vente.</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3 : QUIZ INTERACTIF */}
      {activeTab === 'quiz' && (
        <div className="panel">
          <h3>🏆 Test de Connaissances Commerciales NDUGUMi</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
            Répondez aux 3 questions ci-dessous pour tester votre maîtrise des arguments de vente terrain.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 16 }}>
            {QUIZ_QUESTIONS.map((q, qIdx) => (
              <div key={qIdx} style={{ background: '#f9fafb', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
                <strong style={{ fontSize: 14, color: '#7a1f1f' }}>Question {qIdx + 1} : {q.question}</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {q.options.map((opt, optIdx) => (
                    <label key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`q-${qIdx}`}
                        checked={quizScores[qIdx] === optIdx}
                        onChange={() => handleSelectAnswer(qIdx, optIdx)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                {showResults && (
                  <div style={{ marginTop: 8, fontSize: 12, color: quizScores[qIdx] === q.correctIndex ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {quizScores[qIdx] === q.correctIndex ? '✅ Correct ! ' : '❌ Incorrect. '} {q.explication}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn primary" onClick={() => setShowResults(true)}>
              📊 Valider & Voir le Score
            </button>
            {showResults && (
              <strong style={{ fontSize: 16, color: scoreCount === QUIZ_QUESTIONS.length ? '#16a34a' : '#0284c7' }}>
                Score : {scoreCount} / {QUIZ_QUESTIONS.length} {scoreCount === QUIZ_QUESTIONS.length ? '🥇 Excellent (Certifié Commercial Expert !)' : '👍 Bon effort !'}
              </strong>
            )}
          </div>
        </div>
      )}

      {/* TAB 4 : ASSISTANT IA */}
      {activeTab === 'assistant' && (
        <div className="panel">
          <h3>🤖 Assistant IA — Réponses aux Objections & Wolof</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 12 }}>
            Posez une question terrain (ex : "que répondre si le client dit que Sandaga est moins cher ?") —
            l'assistant s'appuie uniquement sur les fiches ci-dessus, sans inventer d'argument.
          </p>

          {chatHistory.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {chatHistory.map((c, i) => (
                <div key={i} style={{ background: '#f9fafb', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#7a1f1f', marginBottom: 6 }}>❓ {c.question}</div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{c.reponse}</div>
                </div>
              ))}
            </div>
          )}

          {chatError && (
            <div style={{ fontSize: 12.5, color: 'var(--danger, #c0392b)', marginBottom: 10 }}>{chatError}</div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !chatLoading) handleAskAssistant() }}
              placeholder="Ex : comment répondre si le client dit qu'il n'a pas le temps de commander sur l'appli ?"
              style={{ flex: '1 1 320px' }}
            />
            <button className="btn primary" onClick={handleAskAssistant} disabled={chatLoading || !chatQuestion.trim()}>
              {chatLoading ? 'Réflexion…' : 'Demander'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
