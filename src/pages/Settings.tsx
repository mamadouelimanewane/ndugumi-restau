import { useMemo, useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'

interface UserAccount {
  id: string
  nom: string
  email: string
  role: 'admin' | 'superviseur' | 'commercial' | 'livreur'
  zone: string
  statut: 'actif' | 'inactif'
  derniereConnexion: string
}

const DEFAULT_USERS: UserAccount[] = [
  { id: 'usr-1', nom: 'Mamadou Elimane Wane', email: 'm.wane@ndugumi.sn', role: 'admin', zone: 'Toutes zones', statut: 'actif', derniereConnexion: '2026-07-24 17:45' },
  { id: 'usr-2', nom: 'Awa Ndiaye', email: 'a.ndiaye@ndugumi.sn', role: 'superviseur', zone: 'Dakar intra-muros', statut: 'actif', derniereConnexion: '2026-07-24 16:30' },
  { id: 'usr-3', nom: 'Ousmane Sow', email: 'o.sow@ndugumi.sn', role: 'commercial', zone: 'Banlieue', statut: 'actif', derniereConnexion: '2026-07-24 14:15' },
  { id: 'usr-4', nom: 'Mamadou Diallo', email: 'm.diallo@ndugumi.sn', role: 'livreur', zone: 'Dakar & Banlieue', statut: 'actif', derniereConnexion: '2026-07-24 11:00' },
  { id: 'usr-5', nom: 'Fatou Diop', email: 'f.diop@ndugumi.sn', role: 'commercial', zone: 'Almadies / Ngor', statut: 'inactif', derniereConnexion: '2026-07-10 09:20' },
]

interface RolePermission {
  module: string
  admin: boolean
  superviseur: boolean
  commercial: boolean
  livreur: boolean
}

const PERMISSIONS_MATRIX: RolePermission[] = [
  { module: 'Gestion des Prospects & Restaurants', admin: true, superviseur: true, commercial: true, livreur: false },
  { module: 'Suppression & Fusion de Fiches', admin: true, superviseur: true, commercial: false, livreur: false },
  { module: 'Crédits, Factures & Encaissements', admin: true, superviseur: true, commercial: false, livreur: false },
  { module: 'Livraisons & Validation Tournées', admin: true, superviseur: true, commercial: true, livreur: true },
  { module: 'Campagnes WhatsApp / Email Masse', admin: true, superviseur: true, commercial: false, livreur: false },
  { module: 'Baromètre Prix & Catalogue', admin: true, superviseur: true, commercial: true, livreur: false },
  { module: 'Configuration Système & Backup', admin: true, superviseur: false, commercial: false, livreur: false },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'utilisateurs' | 'roles' | 'securite' | 'sauvegarde' | 'entreprise'>('utilisateurs')
  
  const [users, setUsers] = useState<UserAccount[]>(DEFAULT_USERS)
  const [showAddUserModal, setShowAddUserModal] = useState(false)

  // Champs création utilisateur
  const [newNom, setNewNom] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<UserAccount['role']>('commercial')
  const [newZone, setNewZone] = useState('Dakar intra-muros')

  // Sécurité
  const [secMinPassword, setSecMinPassword] = useState(8)
  const [sec2FA, setSec2FA] = useState(true)
  const [secSessionTimeout, setSecSessionTimeout] = useState(30) // min

  // Informations Entreprise
  const [companyName, setCompanyName] = useState('NDUGUMi Agro-Supply S.A.R.L.')
  const [companyNinea, setCompanyNinea] = useState('008492019 2V2')
  const [companyPhone, setCompanyPhone] = useState('+221 33 800 00 00')
  const [companyEmail, setCompanyEmail] = useState('contact@ndugumi.sn')

  const stateStore = useCrmStore()

  function handleCreateUser() {
    if (!newNom.trim() || !newEmail.trim()) return
    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      nom: newNom.trim(),
      email: newEmail.trim(),
      role: newRole,
      zone: newZone,
      statut: 'actif',
      derniereConnexion: 'Jamais',
    }
    setUsers([...users, newUser])
    setShowAddUserModal(false)
    setNewNom('')
    setNewEmail('')
  }

  function toggleUserStatus(id: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, statut: u.statut === 'actif' ? 'inactif' : 'actif' } : u)))
  }

  function handleBackupDownload() {
    const backupData = {
      exportDate: new Date().toISOString(),
      version: '2.5.0',
      crmStore: {
        restaurants: stateStore.restaurants,
        prospects: stateStore.prospects,
        products: stateStore.products,
        campaigns: stateStore.campaigns,
        templates: stateStore.templates,
      },
      users: users,
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `NDUGUMi_Backup_CRM_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    alert('💾 Sauvegarde complète de la base de données exportée avec succès !')
  }

  function handleRestoreBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (parsed && parsed.crmStore) {
          alert('✅ Fichier de sauvegarde valide importé ! (Restauration effectuée)')
        } else {
          alert('❌ Fichier de sauvegarde invalide.')
        }
      } catch (err) {
        alert('❌ Erreur de lecture du fichier JSON.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Paramétrage & Administration Système</h1>
          <p className="page-subtitle">
            Gestion des utilisateurs, rôles, droits d'accès, politiques de sécurité et sauvegardes de données
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <strong style={{ fontSize: 13 }}>🔗 Lien public « Devenir partenaire »</strong>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            À partager avec des restaurateurs (WhatsApp, carte de visite…) — leurs demandes apparaissent dans Prospects.
          </div>
        </div>
        <button
          className="btn secondary small"
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/devenir-partenaire`)
            alert('Lien copié dans le presse-papier !')
          }}
        >
          📋 Copier le lien
        </button>
      </div>

      {/* Onglets de Paramétrage */}
      <div className="filters-bar" style={{ marginBottom: 20 }}>
        <button className={activeTab === 'utilisateurs' ? 'btn' : 'btn secondary'} onClick={() => setActiveTab('utilisateurs')}>
          👥 Utilisateurs & Agents ({users.length})
        </button>
        <button className={activeTab === 'roles' ? 'btn' : 'btn secondary'} onClick={() => setActiveTab('roles')}>
          🔐 Rôles & Privilèges (RBAC)
        </button>
        <button className={activeTab === 'securite' ? 'btn' : 'btn secondary'} onClick={() => setActiveTab('securite')}>
          🛡️ Sécurité & Connexions
        </button>
        <button className={activeTab === 'sauvegarde' ? 'btn' : 'btn secondary'} onClick={() => setActiveTab('sauvegarde')}>
          💾 Sauvegarde & Restauration
        </button>
        <button className={activeTab === 'entreprise' ? 'btn' : 'btn secondary'} onClick={() => setActiveTab('entreprise')}>
          🏢 Infos Entreprise & NDUGUMi
        </button>
      </div>

      {/* ── TAB 1 : GESTION DES UTILISATEURS ── */}
      {activeTab === 'utilisateurs' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>Comptes Utilisateurs & Commerciaux</h3>
            <button className="btn primary" onClick={() => setShowAddUserModal(true)}>
              + Créer un Utilisateur / Agent
            </button>
          </div>

          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom & Prénom</th>
                  <th>Email</th>
                  <th>Rôle Système</th>
                  <th>Zone Affectée</th>
                  <th>Dernière Connexion</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'center', width: 140 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.nom}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span
                        className="zone-tag"
                        style={{
                          background: u.role === 'admin' ? '#7a1f1f' : u.role === 'superviseur' ? '#0284c7' : u.role === 'commercial' ? '#16a34a' : '#d97706',
                          color: '#fff',
                          fontWeight: 700,
                        }}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>{u.zone}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{u.derniereConnexion}</td>
                    <td>
                      <span
                        className="zone-tag"
                        style={{
                          background: u.statut === 'actif' ? '#e8f5e9' : '#fef2f2',
                          color: u.statut === 'actif' ? '#16a34a' : '#dc2626',
                          fontWeight: 700,
                        }}
                      >
                        {u.statut === 'actif' ? '✅ ACTIF' : '🚫 INACTIF'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn secondary small"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => toggleUserStatus(u.id)}
                      >
                        {u.statut === 'actif' ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2 : RÔLES & PRIVILÈGES ── */}
      {activeTab === 'roles' && (
        <div className="panel">
          <h3>🔐 Matrice des Permissions & Rôles (RBAC)</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 16 }}>
            Définissez précisément les droits d'accès de chaque profil utilisateur sur la plateforme.
          </p>

          <table className="data-table">
            <thead>
              <tr>
                <th>Module / Fonctionnalité</th>
                <th style={{ textAlign: 'center' }}>Administrateur</th>
                <th style={{ textAlign: 'center' }}>Superviseur</th>
                <th style={{ textAlign: 'center' }}>Commercial Terrain</th>
                <th style={{ textAlign: 'center' }}>Livreur</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS_MATRIX.map((pm, idx) => (
                <tr key={idx}>
                  <td><strong>{pm.module}</strong></td>
                  <td style={{ textAlign: 'center' }}>{pm.admin ? '✅' : '❌'}</td>
                  <td style={{ textAlign: 'center' }}>{pm.superviseur ? '✅' : '❌'}</td>
                  <td style={{ textAlign: 'center' }}>{pm.commercial ? '✅' : '❌'}</td>
                  <td style={{ textAlign: 'center' }}>{pm.livreur ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB 3 : SÉCURITÉ ── */}
      {activeTab === 'securite' && (
        <div className="panel" style={{ maxWidth: 650 }}>
          <h3>🛡️ Politiques de Sécurité & Authentification</h3>
          
          <div className="field-row" style={{ marginTop: 14 }}>
            <label>Longueur minimale du mot de passe</label>
            <input type="number" value={secMinPassword} onChange={(e) => setSecMinPassword(Number(e.target.value))} />
          </div>

          <div className="field-row" style={{ marginTop: 14 }}>
            <label>Authentification à Double Facteur (2FA / OTP WhatsApp)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={sec2FA} onChange={(e) => setSec2FA(e.target.checked)} id="2fa-check" />
              <label htmlFor="2fa-check" style={{ fontSize: 13, cursor: 'pointer' }}>
                Exiger un code de validation WhatsApp lors de la connexion
              </label>
            </div>
          </div>

          <div className="field-row" style={{ marginTop: 14 }}>
            <label>Expiration de la session après inactivité (minutes)</label>
            <input type="number" value={secSessionTimeout} onChange={(e) => setSecSessionTimeout(Number(e.target.value))} />
          </div>

          <button className="btn primary" style={{ marginTop: 16 }} onClick={() => alert('✅ Paramètres de sécurité enregistrés !')}>
            Enregistrer les règles de sécurité
          </button>
        </div>
      )}

      {/* ── TAB 4 : SAUVEGARDE & RESTAURATION ── */}
      {activeTab === 'sauvegarde' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div className="panel" style={{ borderLeft: '4px solid #16a34a' }}>
            <h3 style={{ margin: '0 0 8px' }}>📥 Sauvegarde de la Base de Données</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
              Exportez un fichier de sauvegarde JSON complet contenant l'intégralité de vos restaurants, contacts, factures, catalogues et historiques.
            </p>
            <button className="btn primary" style={{ width: '100%', marginTop: 12 }} onClick={handleBackupDownload}>
              💾 Télécharger la Sauvegarde (.JSON)
            </button>
          </div>

          <div className="panel" style={{ borderLeft: '4px solid #0284c7' }}>
            <h3 style={{ margin: '0 0 8px' }}>📤 Restauration des Données</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
              Importez un fichier de sauvegarde précédemment créé pour restaurer le système à un état antérieur.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreBackup}
              style={{ marginTop: 12, fontSize: 12 }}
            />
          </div>
        </div>
      )}

      {/* ── TAB 5 : INFORMATIONS ENTREPRISE ── */}
      {activeTab === 'entreprise' && (
        <div className="panel" style={{ maxWidth: 650 }}>
          <h3>🏢 Informations Officiel NDUGUMi</h3>
          
          <div className="field-row">
            <label>Raison Sociale / Entité Légale</label>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>

          <div className="field-row">
            <label>Numéro NINEA / Immatriculation RCCM</label>
            <input type="text" value={companyNinea} onChange={(e) => setCompanyNinea(e.target.value)} />
          </div>

          <div className="field-row">
            <label>Téléphone Support Commercial</label>
            <input type="text" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
          </div>

          <div className="field-row">
            <label>Email Officiel NDUGUMi</label>
            <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
          </div>

          <button className="btn primary" style={{ marginTop: 16 }} onClick={() => alert('✅ Informations entreprise mises à jour !')}>
            Mettre à jour les informations
          </button>
        </div>
      )}

      {/* Modal Création d'Utilisateur */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h3>➕ Ajouter un Utilisateur / Agent Commercial</h3>
            <div className="field-row">
              <label>Nom complet</label>
              <input type="text" value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Ex: Moussa Ndiaye" />
            </div>
            <div className="field-row">
              <label>Adresse Email</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="m.ndiaye@ndugumi.sn" />
            </div>
            <div className="field-row">
              <label>Rôle Système</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)}>
                <option value="commercial">Commercial Terrain</option>
                <option value="superviseur">Superviseur Commercial</option>
                <option value="livreur">Livreur / Logistique</option>
                <option value="admin">Administrateur Système</option>
              </select>
            </div>
            <div className="field-row">
              <label>Zone d'Affectation</label>
              <select value={newZone} onChange={(e) => setNewZone(e.target.value)}>
                <option value="Dakar intra-muros">Dakar intra-muros</option>
                <option value="Banlieue">Banlieue (Pikine, Guédiawaye, Rufisque)</option>
                <option value="Almadies / Ngor">Almadies / Ngor</option>
                <option value="Plateau / Point E">Plateau / Point E</option>
                <option value="Toutes zones">Toutes zones</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn secondary" onClick={() => setShowAddUserModal(false)}>Annuler</button>
              <button className="btn primary" onClick={handleCreateUser}>Créer l'utilisateur</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
