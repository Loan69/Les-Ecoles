-- ════════════════════════════════════════════════════════════════════════════
-- P2b — L'identité du foyer se règle depuis l'application
-- ════════════════════════════════════════════════════════════════════════════
--
-- À passer après p2-identite-foyer.sql, sur chaque foyer. Idempotent.
--
-- Trois choses :
--   1. distinguer le super-admin d'un simple « Admin · gérer » ;
--   2. réserver les clés `foyer_*` au super-admin ;
--   3. créer le dépôt de fichiers qui accueillera le logo.

begin;

-- ── 1. Qui est super-admin ? ────────────────────────────────────────────────
-- `mon_niveau()` renvoie 3 pour un super-admin ET pour un « Admin · gérer » :
-- elle ne peut donc pas les distinguer. L'identité du foyer n'est pas un réglage
-- d'intendance courante, on la réserve au super-admin.
--
-- SECURITY DEFINER pour la même raison que mon_niveau : interroger `residentes`
-- depuis une policy déclencherait une récursion.
create or replace function public.est_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select r.is_super_admin or r.is_technique
       from public.residentes r
      where r.user_id = auth.uid()),
    false);
$$;

revoke all on function public.est_super_admin() from public;
grant execute on function public.est_super_admin() to authenticated;

-- ── 2. Écriture d'app_settings : les clés `foyer_*` à part ──────────────────
-- Sans cela, une « Admin · gérer Repas » pourrait renommer le foyer : la policy
-- précédente ne regardait que le niveau, pas la clé touchée.
drop policy if exists "app_settings: ecriture gestion" on public.app_settings;
create policy "app_settings: ecriture gestion" on public.app_settings
  for all to authenticated
  using (
    case when starts_with(key, 'foyer_')
      then public.est_super_admin()
      else public.mon_niveau('repas') >= 3
        or public.mon_niveau('absences') >= 3
        or public.mon_niveau('comptes') >= 3
    end
  )
  with check (
    case when starts_with(key, 'foyer_')
      then public.est_super_admin()
      else public.mon_niveau('repas') >= 3
        or public.mon_niveau('absences') >= 3
        or public.mon_niveau('comptes') >= 3
    end
  );

commit;

-- ── 3. Dépôt du logo ────────────────────────────────────────────────────────
-- Bucket PUBLIC : le logo s'affiche sur l'écran de connexion, donc avant toute
-- session — il doit être lisible sans jeton. Un bucket public n'a pas besoin de
-- policy de lecture.
--
-- L'écriture ne passe PAS par une policy : le téléversement se fait par
-- /api/admin/identite/logo, sous service_role, après contrôle du super-admin.
-- Une seule porte d'entrée, un seul endroit où le droit est vérifié.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 2097152,
        array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
