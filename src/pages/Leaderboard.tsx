import { useMemo } from 'react'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { CLIENT_STATUTS } from '../types'

export default function Leaderboard() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const agents = useCrmStore((s) => s.agents)
  const agentGoals = useCrmStore((s) => s.agentGoals)
  const setAgentGoal = useCrmStore((s) => s.setAgentGoal)

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])

  const agentStats = useMemo(() => {
    const realAgents = agents.filter((a) => a !== 'Non assigné')
    return realAgents.map((agent) => {
      const assigned = joined.filter((j) => j.crm.agent === agent)
      const signees = assigned.filter((j) => CLIENT_STATUTS.includes(j.crm.statut)).length
      const totalNotes = assigned.reduce((acc, j) => acc + j.crm.notes.length, 0)
      const caEstime = assigned.reduce((acc, j) => acc + (j.crm.deal.volumeEstimeMensuel || 0), 0)

      const goal = agentGoals[agent] || {
        agent,
        objectifSignaturesMensuel: 5,
        objectifVisitesHebdo: 20,
        objectifCaMensuel: 1500000,
      }

      const scorePoints = signees * 100 + totalNotes * 10 + Math.floor(caEstime / 10000)

      const badges = []
      if (signees >= 5) badges.push({ id: 'top-closer', titre: '🔥 Top Closer', icon: '🏆', desc: '5+ signatures ce mois' })
      if (totalNotes >= 15) badges.push({ id: 'pro-relance', titre: '📞 Roi du Téléphone', icon: '⚡', desc: '15+ relances effectuées' })
      if (caEstime >= 1000000) badges.push({ id: 'millionnaire', titre: '💰 Millionnaire FCFA', icon: '💎', desc: '1M+ FCFA générés' })

      return {
        agent,
        assignedCount: assigned.length,
        signees,
        totalNotes,
        caEstime,
        scorePoints,
        goal,
        badges,
      }
    }).sort((a, b) => b.scorePoints - a.scorePoints)
  }, [agents, joined, agentGoals])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏆 Challenge & Leaderboard Commercial</h1>
          <p className="page-subtitle">Gamification de l'équipe, classements, objectifs et remises de badges</p>
        </div>
      </div>

      {/* Podium Top 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {agentStats.slice(0, 3).map((stat, idx) => {
          const medal = idx === 0 ? '🥇 1er Place' : idx === 1 ? '🥈 2ème Place' : '🥉 3ème Place'
          const bg = idx === 0 ? 'linear-gradient(135deg, #fef08a 0%, #ca8a04 100%)' : idx === 1 ? 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)' : 'linear-gradient(135deg, #ffedd5 0%, #c2410c 100%)'
          return (
            <div key={stat.agent} className="panel" style={{ background: bg, color: '#1e293b', border: 'none', textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{medal}</div>
              <h2 style={{ fontSize: 24, margin: '8px 0 4px' }}>{stat.agent}</h2>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{stat.scorePoints.toLocaleString()} Points</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>
                {stat.signees} client(s) signé(s) · {stat.caEstime.toLocaleString()} FCFA
              </div>
            </div>
          )
        })}
      </div>

      {/* Tableau complet */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Commercial</th>
              <th>Score Points</th>
              <th>Clients Signés</th>
              <th>Relances & Echanges</th>
              <th>Volume CA (FCFA)</th>
              <th>Objectif Mensuel</th>
              <th>Badges Gagnés</th>
            </tr>
          </thead>
          <tbody>
            {agentStats.map((stat, idx) => {
              const progressCa = Math.min(100, Math.round((stat.caEstime / stat.goal.objectifCaMensuel) * 100))
              return (
                <tr key={stat.agent}>
                  <td style={{ fontWeight: 800, textAlign: 'center', fontSize: 16 }}>#{idx + 1}</td>
                  <td><strong>{stat.agent}</strong></td>
                  <td><span className="badge" style={{ background: '#f3e8ff', color: '#6b21a8', fontWeight: 800 }}>{stat.scorePoints} pts</span></td>
                  <td>{stat.signees} / {stat.assignedCount}</td>
                  <td>{stat.totalNotes} échanges</td>
                  <td>{stat.caEstime.toLocaleString()} FCFA</td>
                  <td style={{ width: 160 }}>
                    <div style={{ fontSize: 11, marginBottom: 2 }}>{progressCa}% atteint ({stat.caEstime.toLocaleString()} FCFA)</div>
                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progressCa}%`, background: progressCa >= 100 ? 'var(--ok)' : 'var(--accent)' }} />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {stat.badges.map((b) => (
                        <span key={b.id} title={b.desc} className="badge" style={{ background: '#fffbe6', color: '#b78103', fontSize: 11 }}>
                          {b.icon} {b.titre}
                        </span>
                      ))}
                      {stat.badges.length === 0 && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>En cours...</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
