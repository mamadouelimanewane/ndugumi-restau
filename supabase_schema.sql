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
