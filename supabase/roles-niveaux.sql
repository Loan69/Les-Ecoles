-- ============================================================
-- Hiérarchie de droits sur residentes : niveau 1..4 + compte technique caché.
--   1 = résidente (aucun droit admin)
--   2 = admin lecture
--   3 = admin édition
--   4 = super-admin (édition + réglage des niveaux des autres)
-- is_super_admin (compte technique caché) -> renommé is_technique.
-- is_admin devient un MIROIR maintenu de (niveau >= 2 OR is_technique),
-- pour ne casser aucune policy RLS / code legacy qui s'appuie dessus.
-- Idempotent : peut être rejoué sans dommage.
-- ============================================================

-- 1) Colonne niveau + contrainte 1..4
alter table public.residentes add column if not exists niveau smallint not null default 1;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'residentes_niveau_chk') then
    alter table public.residentes add constraint residentes_niveau_chk check (niveau between 1 and 4);
  end if;
end $$;

-- 2) Renomme le compte technique caché : is_super_admin -> is_technique
--    (RENAME COLUMN met à jour automatiquement les dépendances : policies, vues…)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='residentes' and column_name='is_super_admin')
     and not exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='residentes' and column_name='is_technique') then
    alter table public.residentes rename column is_super_admin to is_technique;
  end if;
end $$;

-- 3) Backfill des niveaux depuis l'ancien booléen is_admin.
--    Garde `niveau = 1` protège la ré-exécution (un admin déjà migré a niveau >= 2).
update public.residentes
   set niveau = 4
 where coalesce(is_technique, false) = true;

update public.residentes
   set niveau = 3
 where coalesce(is_admin, false) = true
   and coalesce(is_technique, false) = false
   and niveau = 1;

-- 4) is_admin devient un miroir dérivé de niveau / is_technique.
create or replace function public.residentes_sync_is_admin()
returns trigger
language plpgsql
as $$
begin
  new.is_admin := (new.niveau >= 2) or coalesce(new.is_technique, false);
  return new;
end $$;

drop trigger if exists trg_residentes_sync_is_admin on public.residentes;
create trigger trg_residentes_sync_is_admin
before insert or update on public.residentes
for each row execute function public.residentes_sync_is_admin();

-- 5) Resynchronise is_admin une fois (le trigger s'occupe du reste ensuite).
update public.residentes set niveau = niveau;
