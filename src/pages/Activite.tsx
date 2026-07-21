import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { extractActivities, ActivityEvent, NoteActivity, StatutActivity, CampaignSendActivity } from '../utils/activity'
import { STATUT_LABELS, STATUT_COLORS } from '../types'

export default function Activite() {
  const { restaurants, prospects, campaigns, campaignSends, agents } = useCrmStore()
  
  const [agentFilter, setAgentFilter] = useState<string>('tous')
  const [typeFilter, setTypeFilter] = useState<string>('tous')
  const [daysFilter, setDaysFilter] = useState<string>('0')

  const allActivities = useMemo(() => {
    // If daysFilter is 0 or 1, we still fetch a small number (e.g., 7 days) and filter exactly in frontend
    const daysToFetch = parseInt(daysFilter) <= 7 ? 7 : parseInt(daysFilter)
    return extractActivities(restaurants, prospects, campaigns, campaignSends, daysToFetch)
  }, [restaurants, prospects, campaigns, campaignSends, daysFilter])

  const filteredActivities = useMemo(() => {
    const todayPrefix = new Date().toISOString().split('T')[0]
    
    return allActivities.filter((a: ActivityEvent) => {
      if (agentFilter !== 'tous' && a.agent !== agentFilter) return false;
      if (typeFilter !== 'tous' && a.type !== typeFilter) return false;
      
      if (daysFilter === '0') {
        if (!a.date.startsWith(todayPrefix)) return false;
      } else if (daysFilter === '1') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yPrefix = yesterday.toISOString().split('T')[0];
        if (!a.date.startsWith(yPrefix)) return false;
      }
      return true;
    })
  }, [allActivities, agentFilter, typeFilter, daysFilter])

  const kpiEvents = filteredActivities.length
  const kpiNotes = filteredActivities.filter(a => a.type === 'note').length
  const kpiStatuts = filteredActivities.filter(a => a.type === 'statut_change').length



  const renderNoteIcon = (type: string) => {
    switch (type) {
      case 'whatsapp': return '🟢'
      case 'appel': return '📞'
      case 'visite': return '🚶'
      case 'email': return '✉️'
      default: return '📝'
    }
  }

  const renderDetail = (a: ActivityEvent) => {
    if (a.type === 'note') {
      const n = a as NoteActivity
      return (
        <div style={{ marginTop: '0.2rem' }}>
          <span>{renderNoteIcon(n.noteType)} </span>
          <span style={{ color: 'var(--text-dim)' }}>{n.texte}</span>
        </div>
      )
    }
    if (a.type === 'statut_change') {
      const s = a as StatutActivity
      const color = STATUT_COLORS[s.nouveauStatut] || 'var(--text-dim)'
      return (
        <div style={{ marginTop: '0.2rem' }}>
          <span>🔄 a passé le statut à </span>
          <span className="badge" style={{ backgroundColor: color + '33', color, marginLeft: '0.25rem' }}>
            {STATUT_LABELS[s.nouveauStatut]}
          </span>
        </div>
      )
    }
    if (a.type === 'campaign_send') {
      const c = a as CampaignSendActivity
      return (
        <div style={{ marginTop: '0.2rem' }}>
          <span>🚀 a envoyé le message via campagne <strong style={{ color: 'var(--text)' }}>{c.campaignName}</strong></span>
        </div>
      )
    }
    return null
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Journal d'Activité</h1>
          <p className="page-subtitle">Suivez toutes les actions réalisées sur les prospects</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="kpi-card">
          <div className="kpi-label">Événements affichés</div>
          <div className="kpi-value">{kpiEvents}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Notes/Appels</div>
          <div className="kpi-value">{kpiNotes}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Statuts changés</div>
          <div className="kpi-value">{kpiStatuts}</div>
        </div>
      </div>

      <div className="filters-bar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Période :</label>
          <select value={daysFilter} onChange={(e) => setDaysFilter(e.target.value)} style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}>
            <option value="0">Aujourd'hui</option>
            <option value="1">Hier</option>
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Type :</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}>
            <option value="tous">Tous</option>
            <option value="note">Note / Appel</option>
            <option value="statut_change">Statut</option>
            <option value="campaign_send">Envoi de campagne</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Agent :</label>
          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}>
            <option value="tous">Tous</option>
            {agents && agents.map((agent: any) => (
            <option key={agent} value={agent}>{agent}</option>
          ))}</select>
        </div>
      </div>

      <div className="panel" style={{ padding: '1.5rem' }}>
        {filteredActivities.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', textAlign: 'center', margin: '2rem 0' }}>Aucun événement trouvé pour ces critères.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {filteredActivities.map((a: ActivityEvent, i: number) => (
              <div key={a.id || i} style={{ display: 'flex', gap: '1.5rem', borderBottom: i < filteredActivities.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: i < filteredActivities.length - 1 ? '1.5rem' : 0 }}>
                <div style={{ minWidth: '120px', color: 'var(--text-dim)', fontSize: '0.9rem', paddingTop: '2px', textAlign: 'right' }}>
                  <div style={{ fontWeight: 500 }}>{new Date(a.date).toLocaleDateString()}</div>
                  <div>{new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '0.25rem', fontSize: '1.05rem' }}>
                    <strong style={{ color: 'var(--text)' }}>{a.agent}</strong> sur{' '}
                    <Link to={`/prospects/${a.restaurantId}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                      {a.restaurantName}
                    </Link>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginLeft: '0.5rem', backgroundColor: 'var(--sidebar-bg)', padding: '0.1rem 0.4rem', borderRadius: '12px' }}>
                      {a.quartier}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.95rem' }}>
                    {renderDetail(a)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
