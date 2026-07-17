import { useMemo, useRef, useState } from 'react'
import { useCrmStore, type CrmBackup } from '../store/useCrmStore'
import { joinProspects, isLate } from '../utils/joined'
import { exportAgentPdf } from '../utils/pdf'
import { exportAgentXlsx } from '../utils/excel'
import { CLIENT_STATUTS, USER_ROLE_LABELS, type UserRole } from '../types'

export default function Agents() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const tasks = useCrmStore((s) => s.tasks)
  const agents = useCrmStore((s) => s.agents)
  const quotas = useCrmStore((s) => s.quotas)
  const userProfiles = useCrmStore((s) => s.userProfiles)
  const currentAgent = useCrmStore((s) => s.currentAgent)
  const addAgentName = useCrmStore((s) => s.addAgentName)
  const removeAgentName = useCrmStore((s) => s.removeAgentName)
  const setAgent = useCrmStore((s) => s.setAgent)
  const setQuota = useCrmStore((s) => s.setQuota)
  const setUserProfile = useCrmStore((s) => s.setUserProfile)
  const setCurrentAgent = useCrmStore((s) => s.setCurrentAgent)
  const merchantPortalUrl = useCrmStore((s) => s.merchantPortalUrl)
  const setMerchantPortalUrl = useCrmStore((s) => s.setMerchantPortalUrl)
  const getBackup = useCrmStore((s) => s.getBackup)
  const restoreBackup = useCrmStore((s) => s.restoreBackup)

  const [newAgent, setNewAgent] = useState('')
  const [portalUrlDraft, setPortalUrlDraft] = useState(merchantPortalUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])
  const allTasks = useMemo(() => Object.values(tasks), [tasks])

  const stats = useMemo(() => {
    return agents.map((a) => {
      const mine = joined.filter((j) => (j.crm.agent || 'Non assigné') === a)
      const won = mine.filter((j) => CLIENT_STATUTS.includes(j.crm.statut) && j.crm.statut !== 'client_inactif')
      const myTasks = allTasks.filter((t) => t.agent === a)
      const lateTasks = myTasks.filter((t) => t.statut === 'a_faire' && isLate(t.dateEcheance))
      const quota = quotas[a] ?? null
      return {
        agent: a,
        assignes: mine.length,
        signes: won.length,
        taux: mine.length ? ((won.length / mine.length) * 100).toFixed(0) : '0',
        tachesOuvertes: myTasks.filter((t) => t.statut === 'a_faire').length,
        tachesRetard: lateTasks.length,
        quota,
        progression: quota ? Math.min(100, Math.round((won.length / quota) * 100)) : null,
      }
    })
  }, [agents, joined, allTasks, quotas])

  function handleAdd() {
    if (!newAgent.trim()) return
    addAgentName(newAgent.trim())
    setNewAgent('')
  }

  function handleRemove(a: string) {
    const assigned = joined.filter((j) => j.crm.agent === a).length
    const msg = assigned
      ? `${a} a ${assigned} restaurant(s) assigné(s). Les supprimer de l'équipe ne les réassigne pas automatiquement. Continuer ?`
      : `Retirer ${a} de l'équipe ?`
    if (confirm(msg)) removeAgentName(a)
  }

  function handleAutoAssign() {
    const realAgents = agents.filter((a) => a !== 'Non assigné')
    if (realAgents.length === 0) {
      alert("Ajoutez d'abord au moins un agent avant de répartir automatiquement.")
      return
    }
    const unassigned = joined.filter((j) => !j.crm.agent)
    if (unassigned.length === 0) {
      alert('Tous les restaurants ont déjà un agent assigné.')
      return
    }
    if (
      !confirm(
        `Répartir équitablement les ${unassigned.length} restaurants non assignés entre ${realAgents.length} agent(s) (${realAgents.join(', ')}) ?`
      )
    )
      return
    unassigned.forEach((j, i) => setAgent(j.id, realAgents[i % realAgents.length]))
  }

  function handleQuotaChange(agent: string, value: string) {
    if (value.trim() === '') {
      setQuota(agent, null)
      return
    }
    const n = Number(value)
    if (!Number.isNaN(n)) setQuota(agent, n)
  }

  function handleDownloadBackup() {
    const data = getBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `restau-crm-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleRestoreClick() {
    fileInputRef.current?.click()
  }

  function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as CrmBackup
        if (!data || typeof data !== 'object' || !data.restaurants || !data.prospects) {
          alert("Ce fichier ne ressemble pas à une sauvegarde valide de Restau CRM (structure attendue absente).")
          return
        }
        const nb = Object.keys(data.restaurants).length
        if (
          !confirm(
            `Restaurer cette sauvegarde (${nb} restaurants, exportée le ${new Date(data.exportedAt).toLocaleString('fr-FR')}) ? Cela remplace TOUTES les données actuelles du CRM.`
          )
        )
          return
        restoreBackup(data)
        alert('Sauvegarde restaurée avec succès.')
      } catch {
        alert("Impossible de lire ce fichier : ce n'est pas un JSON valide.")
      } finally {
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Équipe &amp; paramètres</h1>
          <p className="page-subtitle">Gestion des agents commerciaux, de leur performance et des réglages NDUGUMi</p>
        </div>
      </div>

      <div className="panel">
        <h3>Sauvegarde &amp; restauration</h3>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 0 }}>
          Toutes les données sont stockées uniquement dans ce navigateur (localStorage). Téléchargez une sauvegarde
          régulièrement pour ne rien perdre en cas de vidage du cache, ou pour transférer les données vers un autre
          poste.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary small" onClick={handleDownloadBackup}>
            Télécharger une sauvegarde (JSON)
          </button>
          <button className="btn secondary small" onClick={handleRestoreClick}>
            Restaurer depuis un fichier
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleRestoreFile}
          />
        </div>
      </div>

      <div className="panel">
        <h3>Back-office NDUGUMi (suivi des commandes)</h3>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 0 }}>
          Lien ouvert depuis chaque fiche restaurant pour consulter l'historique des commandes de marché passées
          par ce restaurant via l'appli NDUGUMi. Mettez-le à jour si l'adresse change.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={portalUrlDraft}
            onChange={(e) => setPortalUrlDraft(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn secondary small" onClick={() => setMerchantPortalUrl(portalUrlDraft.trim())}>
            Enregistrer
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>Répartition automatique</h3>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 0 }}>
          Assigne équitablement (répartition tournante) tous les restaurants qui n'ont pas encore d'agent entre les
          agents de l'équipe actuelle. Utile pour démarrer une campagne de prospection sans tout assigner un par un.
        </p>
        <button className="btn secondary small" onClick={handleAutoAssign}>
          Répartir les restaurants non assignés
        </button>
      </div>

      <div className="panel">
        <h3>Ajouter un agent</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Nom de l'agent"
            value={newAgent}
            onChange={(e) => setNewAgent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn" onClick={handleAdd}>
            Ajouter
          </button>
        </div>
      </div>

      <div className="panel" style={{ background: '#faf7f2' }}>
        <h3>Utilisateurs</h3>
        <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 0 }}>
          ⚠️ Ceci n'est pas un système d'authentification sécurisé (aucun mot de passe, pas de serveur) — la
          sélection « Qui êtes-vous » sert uniquement à préremplir automatiquement l'agent sur les notes, tâches
          et messages. N'importe qui ayant le lien peut se faire passer pour un autre utilisateur.
        </p>
        <div style={{ fontSize: 12.5, marginBottom: 10 }}>
          Utilisateur actuel : <strong>{currentAgent ?? 'aucun'}</strong>{' '}
          <button className="btn secondary small" onClick={() => setCurrentAgent(null)}>
            Changer
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Rôle</th>
              <th>Actif</th>
            </tr>
          </thead>
          <tbody>
            {agents
              .filter((a) => a !== 'Non assigné')
              .map((a) => {
                const p = userProfiles[a]
                return (
                  <tr key={a}>
                    <td>{a}</td>
                    <td>
                      <input
                        type="text"
                        defaultValue={p?.email ?? ''}
                        onBlur={(e) => setUserProfile(a, { email: e.target.value })}
                        style={{ fontSize: 12, width: 160 }}
                        placeholder="email@exemple.com"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={p?.telephone ?? ''}
                        onBlur={(e) => setUserProfile(a, { telephone: e.target.value })}
                        style={{ fontSize: 12, width: 130 }}
                        placeholder="77 000 00 00"
                      />
                    </td>
                    <td>
                      <select
                        value={p?.role ?? 'commercial'}
                        onChange={(e) => setUserProfile(a, { role: e.target.value as UserRole })}
                        style={{ fontSize: 12 }}
                      >
                        {(Object.keys(USER_ROLE_LABELS) as UserRole[]).map((r) => (
                          <option key={r} value={r}>
                            {USER_ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={p?.actif ?? true}
                        onChange={(e) => setUserProfile(a, { actif: e.target.checked })}
                      />
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Restaurants assignés</th>
              <th>Signés / clients actifs</th>
              <th>Taux de conversion</th>
              <th>Objectif (signatures)</th>
              <th>Progression</th>
              <th>Tâches en cours</th>
              <th>Tâches en retard</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.agent}>
                <td>{s.agent}</td>
                <td>{s.assignes}</td>
                <td>{s.signes}</td>
                <td>{s.taux}%</td>
                <td>
                  <input
                    type="text"
                    inputMode="numeric"
                    defaultValue={s.quota ?? ''}
                    onBlur={(e) => handleQuotaChange(s.agent, e.target.value)}
                    placeholder="—"
                    style={{ width: 60, fontSize: 12 }}
                  />
                </td>
                <td>
                  {s.quota ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 70, background: '#efe9de', borderRadius: 5, height: 12, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${s.progression}%`,
                            height: '100%',
                            background: (s.progression ?? 0) >= 100 ? 'var(--ok)' : 'var(--accent)',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 11.5 }}>{s.progression}%</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>—</span>
                  )}
                </td>
                <td>{s.tachesOuvertes}</td>
                <td style={{ color: s.tachesRetard > 0 ? 'var(--danger)' : 'inherit', fontWeight: s.tachesRetard > 0 ? 700 : 400 }}>
                  {s.tachesRetard}
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn secondary small" onClick={() => exportAgentXlsx(s.agent, joined)}>
                    Excel
                  </button>
                  <button className="btn secondary small" onClick={() => exportAgentPdf(s.agent, joined)}>
                    PDF
                  </button>
                  {s.agent !== 'Non assigné' && (
                    <button className="btn secondary small" onClick={() => handleRemove(s.agent)}>
                      Retirer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
