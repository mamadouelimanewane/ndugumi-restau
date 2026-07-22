import { useState } from 'react'
import { useCrmStore } from '../store/useCrmStore'

export default function SettingsAPI() {
  const receiveWebhookEvent = useCrmStore((s) => s.receiveWebhookEvent)
  const [token] = useState(() => 'ndugumi_sk_live_crm_' + crypto.randomUUID().split('-').join(''))
  
  const [simulatorType, setSimulatorType] = useState('order.created')
  const [simulatorPhone, setSimulatorPhone] = useState('')
  const [simulatorOrderId, setSimulatorOrderId] = useState('CMD-' + Math.floor(Math.random() * 100000))
  const [simulatorResult, setSimulatorResult] = useState<string | null>(null)

  function handleSimulate() {
    let payload: any = {}
    if (simulatorType === 'order.created') {
      payload = {
        type: 'order.created',
        data: {
          orderId: simulatorOrderId,
          cartAmount: 45000,
          deliveryCharges: 1000,
          tax: 0,
          tip: 0,
          discount: 0,
          grandTotal: 46000,
          produits: ['Riz parfumé 25kg', 'Huile 20L'],
          marcheNom: 'Marché Castors',
          marcheTelephone: '770000001',
          marcheEmail: '',
          clientNom: 'Restaurant Test',
          clientTelephone: simulatorPhone,
          clientEmail: '',
          livraisonPrevue: new Date().toISOString(),
          statutCommande: 'Livrée',
          creeLe: new Date().toISOString()
        }
      }
    } else {
      payload = {
        type: 'restaurant.signed',
        data: {
          name: 'Restaurant Test',
          phone: simulatorPhone
        }
      }
    }

    const res = receiveWebhookEvent(payload)
    if (res.success) {
      setSimulatorResult('✅ Succès : ' + res.message)
    } else {
      setSimulatorResult('❌ Erreur : ' + res.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Développeur & API</h1>
          <p className="page-subtitle">Synchronisez NDUGUMi avec le CRM en temps réel via Webhook</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 24 }}>
        <h3>Vos identifiants API</h3>
        <p className="page-subtitle">Utilisez ce token en tant que Bearer Token pour authentifier les requêtes provenant du backend NDUGUMi.</p>
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{token}</span>
          <button className="btn secondary small" onClick={() => navigator.clipboard.writeText(token)}>Copier</button>
        </div>
      </div>

      <div className="panel">
        <h3>Simulateur de Webhook</h3>
        <p className="page-subtitle">Testez la réaction du CRM à un événement distant en envoyant un payload factice. Si l'automatisation correspondante est active, le CRM sera mis à jour.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 500, marginTop: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Type d'événement</label>
            <select value={simulatorType} onChange={(e) => setSimulatorType(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)' }}>
              <option value="order.created">order.created (Nouvelle commande)</option>
              <option value="restaurant.signed">restaurant.signed (Inscription app)</option>
            </select>
          </div>

          {simulatorType === 'order.created' && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>ID Commande</label>
              <input type="text" value={simulatorOrderId} onChange={(e) => setSimulatorOrderId(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)' }} />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Téléphone du restaurant (obligatoire pour le mapping)</label>
            <input type="text" placeholder="Ex: 771234567" value={simulatorPhone} onChange={(e) => setSimulatorPhone(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)' }} />
          </div>

          <button className="btn" onClick={handleSimulate}>Envoyer le Payload</button>

          {simulatorResult && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 6, background: simulatorResult.startsWith('✅') ? '#ecfdf5' : '#fef2f2', color: simulatorResult.startsWith('✅') ? '#065f46' : '#991b1b', fontSize: 13 }}>
              {simulatorResult}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
