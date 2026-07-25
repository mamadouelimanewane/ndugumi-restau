-- ====================================================================
-- SCHEMA SQL POUR LA BASE DE DONNÉES SUPABASE — NDUGUMi RESTAU CRM
-- Exécutez ce script dans l'Éditeur SQL de votre projet Supabase (https://supabase.com)
-- ====================================================================

-- 1. Création de la table de synchronisation du CRM NDUGUMi
CREATE TABLE IF NOT EXISTS public.app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Activation de la sécurité Row Level Security (RLS), sans aucune policy publique.
-- L'application ne lit/écrit JAMAIS cette table depuis le navigateur : tout passe par
-- les fonctions serverless /api/state et /api/health (clé service_role, secrète, côté serveur
-- uniquement). anon/authenticated n'ont donc aucun accès direct, par conception.
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_state FROM anon, authenticated;

-- 3. Rate-limiting des endpoints IA publics (api/ai-*.ts), pour limiter l'abus de coûts DeepSeek.
-- Utilisée uniquement côté serveur via la clé service_role (RPC increment_rate_limit).
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 1
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_rate_limit(p_key TEXT, p_window_start TIMESTAMPTZ)
RETURNS INT
LANGUAGE plpgsql
AS $func$
DECLARE
  new_count INT;
BEGIN
  INSERT INTO public.api_rate_limits (key, window_start, count)
  VALUES (p_key, p_window_start, 1)
  ON CONFLICT (key) DO UPDATE SET count = public.api_rate_limits.count + 1
  RETURNING count INTO new_count;

  IF random() < 0.01 THEN
    DELETE FROM public.api_rate_limits WHERE window_start < now() - interval '2 days';
  END IF;

  RETURN new_count;
END;
$func$;

REVOKE ALL ON FUNCTION public.increment_rate_limit(TEXT, TIMESTAMPTZ) FROM anon, authenticated;

-- 4. Formulaire public d'intérêt restaurant (page /devenir-partenaire), soumissions reçues via
-- /api/lead (POST public, GET/PATCH utilisés par le CRM pour lister et convertir en prospect).
-- Table indépendante du blob app_state pour éviter tout risque de course/écrasement lors d'une
-- soumission concurrente à une modification en cours dans le CRM.
CREATE TABLE IF NOT EXISTS public.public_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  etablissement TEXT NOT NULL,
  telephone TEXT NOT NULL,
  quartier TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  converted BOOLEAN DEFAULT false NOT NULL,
  restaurant_id INTEGER
);

ALTER TABLE public.public_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_leads FROM anon, authenticated;
