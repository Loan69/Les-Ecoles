-- Vérifie qu'un projet neuf a bien reçu le socle. Lecture seule.
-- Attendu après le socle seul : 22 tables · 49 policies · 22 RLS · 4 fonctions · 1 trigger.
-- Après seed.sql : reglages_seed 10 · rubriques_seed 4.
select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r')                        as tables,
  (select count(*) from pg_policies where schemaname = 'public')           as policies,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity)   as tables_rls,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public')                                           as fonctions,
  (select count(*) from pg_trigger where not tgisinternal)                as triggers,
  (select count(*) from public.app_settings)                              as reglages_seed,
  (select count(*) from public.admin_sections)                            as rubriques_seed;
