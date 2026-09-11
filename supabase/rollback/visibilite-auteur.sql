-- RETOUR ARRIÈRE de supabase/visibilite-auteur.sql
-- ------------------------------------------------
-- Rend `admin_sections` à son état d'avant l'enregistrement de l'autrice.
--
-- ⚠️ À passer APRÈS avoir redéployé un code qui ne lit plus cette colonne. La route
-- `/api/admin-sections` la demande explicitement dans son `select` : tant qu'elle
-- tourne, supprimer la colonne fait échouer la lecture des rubriques — l'onglet
-- Administratif se vide pour tout le monde.
--
-- Ce qui est perdu : l'autrice des rubriques créées depuis la migration. Le
-- comportement, lui, revient exactement à l'ancien — toute l'intendance revoit toutes
-- les rubriques, ce qui est précisément ce que faisait le code d'avant. Aucune
-- rubrique, aucun ciblage, aucun contenu n'est touché.
--
-- Idempotent : rejouable sans dommage.

alter table public.admin_sections
  drop column if exists auteur_user_id;
