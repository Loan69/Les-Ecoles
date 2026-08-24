-- Suppression du modèle repas v1 + renommage presences_v2 → presences
--
-- Contexte : le modèle « options » (presences_v2) est le seul en service depuis la
-- bascule du 05/07/2026. L'ancien modèle n'est plus référencé nulle part dans le code
-- et son historique n'a pas besoin d'être conservé (décision client, 04/08/2026).
--
-- ⚠️ À JOUER EN MÊME TEMPS QUE LE DÉPLOIEMENT DU CODE : entre le renommage et la mise
-- en ligne, l'appli est cassée. Faire un snapshot Supabase avant, et opérer le soir.
--
-- ── PRÉ-VOL (à lancer seul d'abord, doit ne rien renvoyer) ─────────────────────
-- Vérifie qu'aucun objet ne dépend encore des tables v1 :
--   select conrelid::regclass as table_dependante, conname
--   from pg_constraint
--   where confrelid in ('public.presences'::regclass,
--                       'public.select_options_repas'::regclass,
--                       'public.special_meal_options'::regclass);
-- ──────────────────────────────────────────────────────────────────────────────

begin;

-- 1. Suppression des tables du modèle v1 -------------------------------------
--    presences            : inscriptions repas ancien modèle
--    select_options_repas : options par défaut (service/catégorie)
--    special_meal_options : surcharges d'options par plage de dates
drop table if exists public.presences;
drop table if exists public.special_meal_options;
drop table if exists public.select_options_repas;

-- 2. Le nom « presences » est libre : on y bascule la table en service --------
alter table public.presences_v2 rename to presences;

-- 3. Alignement des noms d'objets dérivés ------------------------------------
--    Postgres conserve les noms d'origine au renommage d'une table : on se
--    retrouverait avec « presences_v2_pkey » sur la table « presences ».
--    Ce bloc renomme tout ce qui porte encore « presences_v2 » dans son nom.
do $$
declare
  r record;
begin
  -- Contraintes (le renommage d'une contrainte renomme aussi son index)
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.presences'::regclass
      and conname like '%presences_v2%'
  loop
    execute format(
      'alter table public.presences rename constraint %I to %I',
      r.conname, replace(r.conname, 'presences_v2', 'presences')
    );
  end loop;

  -- Index restants (ceux qui n'appuient aucune contrainte)
  for r in
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'presences'
      and indexname like '%presences_v2%'
  loop
    execute format(
      'alter index public.%I rename to %I',
      r.indexname, replace(r.indexname, 'presences_v2', 'presences')
    );
  end loop;

  -- Policies RLS
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'presences'
      and policyname like '%presences_v2%'
  loop
    execute format(
      'alter policy %I on public.presences rename to %I',
      r.policyname, replace(r.policyname, 'presences_v2', 'presences')
    );
  end loop;

  -- Triggers
  for r in
    select tgname
    from pg_trigger
    where tgrelid = 'public.presences'::regclass
      and not tgisinternal
      and tgname like '%presences_v2%'
  loop
    execute format(
      'alter trigger %I on public.presences rename to %I',
      r.tgname, replace(r.tgname, 'presences_v2', 'presences')
    );
  end loop;
end $$;

commit;

-- ── CONTRÔLE APRÈS COUP ───────────────────────────────────────────────────────
-- Doit renvoyer 0 ligne :
--   select 'index' as objet, indexname as nom from pg_indexes
--     where schemaname = 'public' and indexname like '%_v2%'
--   union all
--   select 'policy', policyname from pg_policies
--     where schemaname = 'public' and policyname like '%_v2%'
--   union all
--   select 'table', tablename from pg_tables
--     where schemaname = 'public' and tablename like '%_v2%';
--
-- Et la RLS doit être restée active sur la table renommée :
--   select relname, relrowsecurity from pg_class where relname = 'presences';
