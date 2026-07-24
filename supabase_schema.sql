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

-- 2. Activation de la sécurité Row Level Security (RLS)
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- 3. Création des politiques de sécurité (Lecture & Écriture)
DROP POLICY IF EXISTS "Lecture publique app_state" ON public.app_state;
CREATE POLICY "Lecture publique app_state" 
ON public.app_state FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Écriture publique app_state" ON public.app_state;
CREATE POLICY "Écriture publique app_state" 
ON public.app_state FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Table des notes / retours d'expérience si vous souhaitez stocker les requêtes distantes
CREATE TABLE IF NOT EXISTS public.crm_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.crm_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Accès complet crm_logs" ON public.crm_logs;
CREATE POLICY "Accès complet crm_logs" 
ON public.crm_logs FOR ALL 
USING (true) 
WITH CHECK (true);
