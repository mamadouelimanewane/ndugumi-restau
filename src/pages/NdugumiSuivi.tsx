import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrmStore } from '../store/useCrmStore'
import { joinProspects } from '../utils/joined'
import { parseOrdersFile, matchOrderToRestaurant } from '../utils/importOrders'
import { CLIENT_STATUTS, SANTE_LABELS, SANTE_COLORS, STATUT_LABELS, type SanteCompte, type Order } from '../types'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function parseCreeLe(s: string): Date | null {
  const d = new Date(s.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? null : d
}

export default function NdugumiSuivi() {
  const restaurants = useCrmStore((s) => s.restaurants)
  const prospects = useCrmStore((s) => s.prospects)
  const merchantPortalUrl = useCrmStore((s) => s.merchantPortalUrl)
  const orders = useCrmStore((s) => s.orders)
  const importOrders = useCrmStore((s) => s.importOrders)
  const setOrderRestaurant = useCrmStore((s) => s.setOrderRestaurant)
  const setDeal = useCrmStore((s) => s.setDeal)
  const setNdugumi = useCrmStore((s) => s.setNdugumi)
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const joined = useMemo(() => joinProspects(restaurants, prospects), [restaurants, prospects])
  const joinedById = useMemo(() => new Map(joined.map((j) => [j.id, j])), [joined])

  const [inscritFilter, setInscritFilter] = useState<'' | 'oui' | 'non'>('')
  const [santeFilter, setSanteFilter] = useState<SanteCompte | ''>('')
  const [manualMatch, setManualMatch] = useState<Record<string, number | ''>>({})
  const [importSummary, setImportSummary] = useState<string | null>(null)

  const clients = useMemo(
    () => joined.filter((j) => CLIENT_STATUTS.includes(j.crm.statut) && j.crm.statut !== 'client_inactif'),
    [joined]
  )
  const inscrits = joined.filter((j) => j.crm.ndugumi.inscrit)
  const clientsNonInscrits = clients.filter((j) => !j.crm.ndugumi.inscrit)
  const aRisque = clients.filter((j) => j.crm.deal.santeCompte === 'a_risque')
  const churn = joined.filter((j) => j.crm.deal.santeCompte === 'churn')

  const allOrders = useMemo(() => Object.values(orders).sort((a, b) => b.creeLe.localeCompare(a.creeLe)), [orders])
  const unmatchedOrders = allOrders.filter((o) => o.restaurantId === null)
  const ordersByRestaurant = useMemo(() => {
    const m = new Map<number, Order[]>()
    for (const o of allOrders) {
      if (o.restaurantId === null) continue
      const arr = m.get(o.restaurantId) ?? []
      arr.push(o)
      m.set(o.restaurantId, arr)
    }
    return m
  }, [allOrders])

  const filtered = useMemo(() => {
    return joined.filter((j) => {
      if (!j.crm.ndugumi.inscrit && !CLIENT_STATUTS.includes(j.crm.statut)) return false
      if (inscritFilter === 'oui' && !j.crm.ndugumi.inscrit) return false
      if (inscritFilter === 'non' && j.crm.ndugumi.inscrit) return false
      if (santeFilter && j.crm.deal.santeCompte !== santeFilter) return false
      return true
    })
  }, [joined, inscritFilter, santeFilter])

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const isCsv = file.name.toLowerCase().endsWith('.csv')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = parseOrdersFile(reader.result as ArrayBuffer | string)
        const withMatches = result.orders.map((o) => ({
          ...o,
          restaurantId: matchOrderToRestaurant(o, restaurants, prospects),
        }))
        const { imported, skipped } = importOrders(withMatches)
        const matched = withMatches.filter((o) => o.restaurantId !== null).length
        setImportSummary(
          `${imported} commande(s) importée(s) (${skipped} déjà présente(s) ignorée(s) par n° de commande), dont ${matched} rapprochée(s) automatiquement à un restaurant.`
        )
      } catch {
        setImportSummary("Impossible de lire ce fichier. Formats acceptés : .csv, .xlsx (export NDUGUMi).")
      } finally {
        e.target.value = ''
      }
    }
    if (isCsv) reader.readAsText(file, 'utf-8')
    else reader.readAsArrayBuffer(file)
  }

  function handleManualMatch(orderId: string) {
    const restaurantId = manualMatch[orderId]
    if (!restaurantId) return
    setOrderRestaurant(orderId, Number(restaurantId))
  }

  function applyStatsToRestaurant(restaurantId: number) {
    const restOrders = ordersByRestaurant.get(restaurantId) ?? []
    const now = Date.now()
    const recent = restOrders.filter((o) => {
      const d = parseCreeLe(o.creeLe)
      return d && now - d.getTime() <= THIRTY_DAYS_MS
    })
    const volume = recent.reduce((acc, o) => acc + o.grandTotal, 0)
    const dates = restOrders.map((o) => parseCreeLe(o.creeLe)).filter((d): d is Date => d !== null)
    const earliest = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null

    setDeal(restaurantId, { nombreCommandesMensuel: recent.length, volumeEstimeMensuel: volume })
    const crm = prospects[restaurantId]
    setNdugumi(restaurantId, {
      inscrit: true,
      dateInscription: crm?.ndugumi.dateInscription ?? (earliest ? earliest.toISOString().slice(0, 10) : null),
    })
    alert(
      `Fiche mise à jour : ${recent.length} commande(s) sur les 30 derniers jours, ${volume.toLocaleString('fr-FR')} FCFA de volume.`
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Suivi NDUGUMi</h1>
          <p className="page-subtitle">Adoption de l'application par les restaurants clients</p>
        </div>
      </div>

      <div className="panel">
        <h3>Importer un reporting de commandes</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 0 }}>
          Fichier CSV ou Excel exporté depuis le back-office NDUGUMi (colonnes S.No, Order ID, Payment Details,
          Product Details, Store Details, User Details, Deliver on, Current status, Created at). Chaque commande
          est rapprochée automatiquement à une fiche restaurant par numéro de téléphone (client, ou identifiant
          NDUGUMi renseigné sur la fiche) — le rapprochement reste à valider manuellement si aucune correspondance
          n'est trouvée.
        </p>
        <button className="btn" onClick={handleImportClick}>
          Importer un fichier de commandes
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
        {importSummary && <div style={{ fontSize: 12.5, marginTop: 10 }}>{importSummary}</div>}
      </div>

      {unmatchedOrders.length > 0 && (
        <div className="panel" style={{ borderLeft: '4px solid var(--warn)' }}>
          <h3>Commandes non rapprochées ({unmatchedOrders.length})</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 0 }}>
            Aucun restaurant du CRM ne correspond au téléphone client de ces commandes — rapprochez-les
            manuellement, ou ignorez-les si elles proviennent de clients particuliers hors périmètre restaurants.
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Commande</th>
                <th>Client</th>
                <th>Téléphone</th>
                <th>Marché</th>
                <th>Montant</th>
                <th>Date</th>
                <th>Rapprocher</th>
              </tr>
            </thead>
            <tbody>
              {unmatchedOrders.slice(0, 50).map((o) => (
                <tr key={o.id}>
                  <td>#{o.orderId}</td>
                  <td>{o.clientNom}</td>
                  <td>{o.clientTelephone}</td>
                  <td>{o.marcheNom}</td>
                  <td>{o.grandTotal.toLocaleString('fr-FR')} FCFA</td>
                  <td>{o.creeLe}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={manualMatch[o.id] ?? ''}
                      onChange={(e) => setManualMatch({ ...manualMatch, [o.id]: e.target.value ? Number(e.target.value) : '' })}
                      style={{ fontSize: 11.5 }}
                    >
                      <option value="">Choisir un restaurant…</option>
                      {joined.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.etablissement}
                        </option>
                      ))}
                    </select>
                    <button className="btn secondary small" onClick={() => handleManualMatch(o.id)}>
                      Associer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {unmatchedOrders.length > 50 && (
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 6 }}>
              Affichage limité aux 50 premières commandes non rapprochées.
            </div>
          )}
        </div>
      )}

      {ordersByRestaurant.size > 0 && (
        <div className="panel">
          <h3>Commandes rapprochées, par restaurant</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Établissement</th>
                <th>Commandes importées</th>
                <th>Commandes (30 derniers jours)</th>
                <th>Volume (30 derniers jours)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Array.from(ordersByRestaurant.entries()).map(([restaurantId, restOrders]) => {
                const j = joinedById.get(restaurantId)
                if (!j) return null
                const now = Date.now()
                const recent = restOrders.filter((o) => {
                  const d = parseCreeLe(o.creeLe)
                  return d && now - d.getTime() <= THIRTY_DAYS_MS
                })
                const volume = recent.reduce((acc, o) => acc + o.grandTotal, 0)
                return (
                  <tr key={restaurantId}>
                    <td>{j.etablissement}</td>
                    <td>{restOrders.length}</td>
                    <td>{recent.length}</td>
                    <td>{volume.toLocaleString('fr-FR')} FCFA</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn small" onClick={() => applyStatsToRestaurant(restaurantId)}>
                        Appliquer au CRM
                      </button>
                      <button className="btn secondary small" onClick={() => navigate(`/prospects/${restaurantId}`)}>
                        Fiche
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{inscrits.length}</div>
          <div className="kpi-label">Inscrits sur l'appli</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: clientsNonInscrits.length ? 'var(--danger)' : undefined }}>
            {clientsNonInscrits.length}
          </div>
          <div className="kpi-label">Clients signés mais pas encore inscrits</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: aRisque.length ? 'var(--warn)' : undefined }}>
            {aRisque.length}
          </div>
          <div className="kpi-label">Comptes clients à risque</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: churn.length ? 'var(--danger)' : undefined }}>
            {churn.length}
          </div>
          <div className="kpi-label">Comptes perdus (churn)</div>
        </div>
      </div>

      {clientsNonInscrits.length > 0 && (
        <div className="panel" style={{ borderLeft: '4px solid var(--danger)' }}>
          <h3>⚠️ Clients signés mais pas encore inscrits sur l'appli</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 0 }}>
            Ces restaurants ont accepté de devenir clients mais n'utilisent pas encore l'application — à
            accompagner en priorité pour finaliser l'inscription.
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Établissement</th>
                <th>Quartier</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientsNonInscrits.map((j) => (
                <tr key={j.id} onClick={() => navigate(`/prospects/${j.id}`)} style={{ cursor: 'pointer' }}>
                  <td>{j.etablissement}</td>
                  <td>{j.quartier}</td>
                  <td>{STATUT_LABELS[j.crm.statut]}</td>
                  <td>
                    <button className="btn secondary small" onClick={(e) => { e.stopPropagation(); navigate(`/prospects/${j.id}`) }}>
                      Ouvrir la fiche
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel">
        <h3>Tous les comptes (clients ou inscrits)</h3>
        <div className="filters-bar">
          <select value={inscritFilter} onChange={(e) => setInscritFilter(e.target.value as '' | 'oui' | 'non')}>
            <option value="">Inscription (tous)</option>
            <option value="oui">Inscrits</option>
            <option value="non">Non inscrits</option>
          </select>
          <select value={santeFilter} onChange={(e) => setSanteFilter(e.target.value as SanteCompte | '')}>
            <option value="">Santé (tous)</option>
            {(Object.keys(SANTE_LABELS) as SanteCompte[]).map((s) => (
              <option key={s} value={s}>
                {SANTE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Établissement</th>
              <th>Quartier</th>
              <th>Inscrit NDUGUMi</th>
              <th>Date d'inscription</th>
              <th>Commandes / mois</th>
              <th>Volume mensuel</th>
              <th>Santé</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((j) => (
              <tr key={j.id}>
                <td>{j.etablissement}</td>
                <td>{j.quartier}</td>
                <td>
                  {j.crm.ndugumi.inscrit ? (
                    <span className="badge" style={{ background: 'var(--ok)' }}>
                      Inscrit
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{j.crm.ndugumi.dateInscription ?? '—'}</td>
                <td>{j.crm.deal.nombreCommandesMensuel ?? '—'}</td>
                <td>{j.crm.deal.volumeEstimeMensuel ? j.crm.deal.volumeEstimeMensuel.toLocaleString('fr-FR') + ' FCFA' : '—'}</td>
                <td>
                  <span className="badge" style={{ background: SANTE_COLORS[j.crm.deal.santeCompte] }}>
                    {SANTE_LABELS[j.crm.deal.santeCompte]}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn secondary small" onClick={() => navigate(`/prospects/${j.id}`)}>
                    Fiche
                  </button>
                  <a href={merchantPortalUrl} target="_blank" rel="noopener noreferrer">
                    <button className="btn secondary small">Commandes ↗</button>
                  </a>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-state">
                  Aucun compte ne correspond à ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
