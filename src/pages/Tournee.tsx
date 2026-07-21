import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects, isLate, isToday } from '../utils/joined'
import { STATUT_COLORS, STATUT_LABELS, type Statut } from '../types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const Tournee: React.FC = () => {
  const currentAgent = useCrmStore((s) => s.currentAgent)
  const agents = useCrmStore((s) => s.agents)
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [zoneFilter, setZoneFilter] = useState<string>('')
  const [quartierFilter, setQuartierFilter] = useState<string>('')

  const activeAgent = selectedAgentId || currentAgent

  // Join data
  const joinedProspects = useMemo(() => {
    return joinProspects(restaurants, prospects)
  }, [restaurants, prospects])

  // Process data for the tour
  const tourData = useMemo(() => {
    if (!activeAgent) return { grouped: {}, stats: { total: 0, late: 0, today: 0, quarters: 0 } }

    let assigned = joinedProspects.filter((p) => p.crm.agent === activeAgent)
    
    // Applying filters
    if (zoneFilter) {
      assigned = assigned.filter((p) => p.zone === zoneFilter)
    }
    if (quartierFilter) {
      assigned = assigned.filter((p) => p.quartier === quartierFilter)
    }

    // Determine priority
    const getPriority = (p: typeof assigned[0]) => {
      const nextAction = p.crm.prochaineRelance
      if (nextAction && isLate(nextAction)) return 1
      if (nextAction && isToday(nextAction)) return 2
      if ((p.crm.statut === 'interesse' || p.crm.statut === 'rdv') && !nextAction) return 3
      if (p.crm.statut === 'contacte') return 4
      if (p.crm.statut === 'nouveau') return 5
      return 6
    }

    let tourProspects = assigned.filter((p) => getPriority(p) <= 5)
    
    tourProspects.sort((a, b) => getPriority(a) - getPriority(b))

    // Group by quartier
    const grouped: Record<string, typeof tourProspects> = {}
    let lateCount = 0
    let todayCount = 0

    tourProspects.forEach((p) => {
      const q = p.quartier || 'Sans quartier'
      if (!grouped[q]) grouped[q] = []
      grouped[q].push(p)
      
      const nextAction = p.crm.prochaineRelance
      if (nextAction && isLate(nextAction)) lateCount++
      if (nextAction && isToday(nextAction)) todayCount++
    })

    return {
      grouped,
      tourProspects,
      stats: {
        total: tourProspects.length,
        late: lateCount,
        today: todayCount,
        quarters: Object.keys(grouped).length
      }
    }
  }, [activeAgent, joinedProspects, zoneFilter, quartierFilter])

  // Get unique zones and quartiers for filters
  const uniqueZones = useMemo(() => Array.from(new Set(joinedProspects.filter((p) => p.crm.agent === activeAgent).map((p) => p.zone).filter(Boolean))), [joinedProspects, activeAgent])
  const uniqueQuartiers = useMemo(() => Array.from(new Set(joinedProspects.filter((p) => p.crm.agent === activeAgent && (!zoneFilter || p.zone === zoneFilter)).map((p) => p.quartier).filter(Boolean))), [joinedProspects, activeAgent, zoneFilter])

  const handlePrintPdf = () => {
    const doc = new jsPDF()
    const today = new Date().toLocaleDateString('fr-FR')
    
    // Header
    doc.setFillColor('#7a1f1f')
    doc.rect(0, 0, doc.internal.pageSize.width, 30, 'F')
    doc.setTextColor('#ffffff')
    doc.setFontSize(16)
    doc.text('NDUGUMi - Planning de Tournée', 14, 20)
    
    doc.setTextColor('#333333')
    doc.setFontSize(12)
    doc.text(`Agent : ${activeAgent || 'Inconnu'}`, 14, 40)
    doc.text(`Date : ${today}`, 14, 47)
    
    let y = 55
    let globalIndex = 1

    Object.entries(tourData.grouped).forEach(([quartier, items]) => {
      doc.setFontSize(14)
      doc.setTextColor('#7a1f1f')
      doc.text(`Quartier : ${quartier} (${items.length})`, 14, y)
      
      const tableData = items.map((p) => {
        const num = globalIndex++
        return [
          num.toString(),
          p.etablissement,
          p.telephone,
          STATUT_LABELS[p.crm.statut as Statut] || p.crm.statut,
          p.crm.prochaineRelance ? new Date(p.crm.prochaineRelance).toLocaleDateString('fr-FR') : '-'
        ]
      })

      autoTable(doc, {
        startY: y + 5,
        head: [['#', 'Établissement', 'Téléphone', 'Statut', 'Relance prévue']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [122, 31, 31] },
        margin: { left: 14, right: 14 }
      })
      
      y = (doc as any).lastAutoTable.finalY + 15
      
      if (y > doc.internal.pageSize.height - 30) {
        doc.addPage()
        y = 20
      }
    })

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(10)
      doc.setTextColor('#666666')
      doc.text(
        `NDUGUMi — Tournée du ${today}`,
        14,
        doc.internal.pageSize.height - 10
      )
    }

    doc.save(`Tournee_${today.replace(/\//g, '-')}.pdf`)
  }

  if (!currentAgent) {
    return (
      <div className="panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 className="page-title">Accès refusé</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: '1rem' }}>Vous devez être connecté pour voir la tournée.</p>
        <Link to="/agents" className="btn primary">Se connecter</Link>
      </div>
    )
  }

  const getDaysSinceContact = (p: typeof joinedProspects[0]) => {
    const dates = p.crm.notes.map((n) => new Date(n.date).getTime())
    const maxTime = Math.max(...dates, new Date(p.crm.createdAt).getTime())
    return Math.floor((Date.now() - maxTime) / 86400000)
  }

  const getUrgencyIcon = (p: typeof joinedProspects[0]) => {
    const next = p.crm.prochaineRelance
    if (next && isLate(next)) return '🔴'
    if (next && isToday(next)) return '🟡'
    return '⚪'
  }

  let overallCounter = 1

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Planning de Tournée</h1>
          <p className="page-subtitle">Tournée du jour pour {activeAgent}</p>
        </div>
        <button className="btn" onClick={handlePrintPdf} disabled={tourData.stats.total === 0}>
          🖨️ Imprimer la tournée
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="kpi-card panel">
          <div className="kpi-label">Prospects dans la tournée</div>
          <div className="kpi-value">{tourData.stats.total}</div>
        </div>
        <div className="kpi-card panel">
          <div className="kpi-label">Relances en retard</div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{tourData.stats.late}</div>
        </div>
        <div className="kpi-card panel">
          <div className="kpi-label">Relances aujourd'hui</div>
          <div className="kpi-value" style={{ color: 'var(--warn)' }}>{tourData.stats.today}</div>
        </div>
        <div className="kpi-card panel">
          <div className="kpi-label">Quartiers couverts</div>
          <div className="kpi-value">{tourData.stats.quarters}</div>
        </div>
      </div>

      <div className="filters-bar panel" style={{ marginBottom: '2rem' }}>
        <select 
          value={selectedAgentId} 
          onChange={(e) => setSelectedAgentId(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'inherit' }}
        >
          <option value="">-- Ma tournée ({currentAgent}) --</option>
          {agents.filter((a) => a !== currentAgent && a !== 'Non assigné').map((a) => (
            <option key={a} value={a}>Tournée de {a}</option>
          ))}
        </select>

        <select 
          value={zoneFilter} 
          onChange={(e) => { setZoneFilter(e.target.value); setQuartierFilter(''); }}
          style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'inherit' }}
        >
          <option value="">Toutes les zones</option>
          {uniqueZones.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>

        <select 
          value={quartierFilter} 
          onChange={(e) => setQuartierFilter(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'inherit' }}
        >
          <option value="">Tous les quartiers</option>
          {uniqueQuartiers.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      {tourData.stats.total === 0 ? (
        <div className="empty-state panel">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌴</div>
          <h3>Aucun prospect à visiter</h3>
          <p>La tournée du jour est vide ou les filtres ne correspondent à aucun prospect.</p>
        </div>
      ) : (
        Object.entries(tourData.grouped).map(([quartier, items]) => (
          <div key={quartier} style={{ marginBottom: '2rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              📍 {quartier} <span className="badge" style={{ marginLeft: '0.5rem' }}>{items.length} prospects</span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((p) => {
                const daysSince = getDaysSinceContact(p)
                const urgency = getUrgencyIcon(p)
                const num = overallCounter++
                
                return (
                  <div key={p.id} className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      #{num}
                    </div>
                    
                    <div title={urgency === '🔴' ? 'Relance en retard' : urgency === '🟡' ? "Relance aujourd'hui" : ''}>
                      {urgency}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 'bold' }}>{p.etablissement}</span>
                        <span className="badge" style={{ 
                          backgroundColor: STATUT_COLORS[p.crm.statut as Statut] + '22',
                          color: STATUT_COLORS[p.crm.statut as Statut] 
                        }}>
                          {STATUT_LABELS[p.crm.statut as Statut]}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                        <span>📞 {p.telephone}</span>
                        <span>⏱️ {daysSince === 0 ? "Aujourd'hui" : `${daysSince} jours sans contact`}</span>
                        {p.crm.prochaineRelance && (
                          <span style={{ color: (isLate(p.crm.prochaineRelance) ? 'var(--danger)' : isToday(p.crm.prochaineRelance) ? 'var(--warn)' : 'inherit') }}>
                            🗓️ Relance : {new Date(p.crm.prochaineRelance).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a 
                        href={`https://wa.me/221${p.telephone.replace(/\s+/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn small"
                        style={{ backgroundColor: '#25D366', color: 'white', border: 'none' }}
                      >
                        WhatsApp
                      </a>
                      <Link to={`/prospects/${p.id}`} className="btn secondary small">
                        Ouvrir
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
