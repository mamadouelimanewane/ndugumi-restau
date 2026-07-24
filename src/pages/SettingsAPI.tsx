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

  const [testStatus, setTestStatus] = useState<string | null>(null)
  const isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

  async function handleTestSupabaseQuery() {
    setTestStatus('⌛ Connexion et test de la requête en cours...')
    try {
      const { supabase } = await import('../utils/supabase')
      const { data, error } = await supabase.from('app_state').select('id, updated_at').limit(5)
      if (error) {
        setTestStatus(`⚠️ Supabase accessible mais la table 'app_state' n'existe pas encore. Exécutez le script SQL ci-dessous dans votre Supabase SQL Editor. (${error.message})`)
      } else {
        setTestStatus(`✅ Connexion Supabase Reussie à 100% ! (${data?.length || 0} enregistrement(s) trouvé(s) dans 'app_state')`)
      }
    } catch (e: any) {
      setTestStatus(`❌ Erreur de connexion Supabase : ${e.message || e}`)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Développeur & API</h1>
          <p className="page-subtitle">Synchronisez NDUGUMi avec le CRM en temps réel via Supabase et Webhooks</p>
        </div>
      </div>

      {/* Panneau Supabase Cloud Database Status & Query Test */}
      <div className="panel" style={{ marginBottom: 24, borderLeft: isSupabaseConfigured ? '4px solid #16a34a' : '4px solid #f59e0b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: '0 0 6px' }}>⚡ Base de Données Supabase Cloud</h3>
            <p className="page-subtitle" style={{ margin: 0 }}>
              Statut de la connexion :{' '}
              <strong style={{ color: isSupabaseConfigured ? '#16a34a' : '#d97706' }}>
                {isSupabaseConfigured ? '✅ CONFIGURÉ SUR SUPABASE CLOUD' : '📴 MODE LOCALSTORAGE & HORS-LIGNE (FALLBACK)'}
              </strong>
            </p>
          </div>
          <button className="btn primary" onClick={handleTestSupabaseQuery}>
            🧪 Tester la requête Supabase
          </button>
        </div>

        {testStatus && (
          <div style={{ marginTop: 14, background: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 13, border: '1px solid var(--border)', fontWeight: 600 }}>
            {testStatus}
          </div>
        )}

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>📜 Script SQL pour initialiser Supabase (Table `app_state`)</h4>
          <pre
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              padding: 12,
              borderRadius: 8,
              fontSize: 11.5,
              overflowX: 'auto',
              maxHeight: 180,
            }}
          >
{`CREATE TABLE IF NOT EXISTS public.app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture et écriture publiques app_state" 
ON public.app_state FOR ALL 
USING (true) 
WITH CHECK (true);`}
          </pre>
          <button
            className="btn secondary small"
            style={{ marginTop: 6 }}
            onClick={() =>
              navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS public.app_state (\n  id TEXT PRIMARY KEY,\n  data JSONB NOT NULL,\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL\n);\nALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Lecture et écriture publiques app_state" ON public.app_state FOR ALL USING (true) WITH CHECK (true);`)
            }
          >
            📋 Copier le Script SQL
          </button>
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
