-- Droits par SECTION de l'appli + super-admin global.
--   Sections : repas · evenements · absences · comptes · infos
--   Niveau par section : 1 Aucun · 2 Lecture · 3 Édition
--   is_super_admin : rôle global = accès total + seul à attribuer les droits.
--   is_technique   : compte technique caché (inchangé), tout accès.
-- Remplace le niveau global unique (colonne `niveau`) — migré puis supprimé.
-- Idempotent.

-- 1) Colonnes par section + super-admin global.
alter table public.residentes add column if not exists niveau_repas       smallint not null default 1;
alter table public.residentes add column if not exists niveau_evenements  smallint not null default 1;
alter table public.residentes add column if not exists niveau_absences    smallint not null default 1;
alter table public.residentes add column if not exists niveau_comptes     smallint not null default 1;
alter table public.residentes add column if not exists niveau_infos       smallint not null default 1;
alter table public.residentes add column if not exists is_super_admin     boolean  not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'residentes_niv_sections_chk') then
    alter table public.residentes add constraint residentes_niv_sections_chk check (
      niveau_repas between 1 and 3 and niveau_evenements between 1 and 3 and
      niveau_absences between 1 and 3 and niveau_comptes between 1 and 3 and niveau_infos between 1 and 3
    );
  end if;
end $$;

-- 2) is_admin = miroir « a un accès admin quelconque » (super-admin, technique, ou une section >= lecture).
create or replace function public.residentes_sync_is_admin()
returns trigger
language plpgsql
as $$
begin
  new.is_admin :=
    coalesce(new.is_technique, false)
    or coalesce(new.is_super_admin, false)
    or new.niveau_repas >= 2 or new.niveau_evenements >= 2
    or new.niveau_absences >= 2 or new.niveau_comptes >= 2 or new.niveau_infos >= 2;
  return new;
end $$;

drop trigger if exists trg_residentes_sync_is_admin on public.residentes;
create trigger trg_residentes_sync_is_admin
before insert or update on public.residentes
for each row execute function public.residentes_sync_is_admin();

-- 3) Migration depuis l'ancien niveau global (1..4), une seule fois (tant que la colonne existe).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'residentes' and column_name = 'niveau') then
    update public.residentes
       set niveau_repas      = least(greatest(coalesce(niveau, 1), 1), 3),
           niveau_evenements = least(greatest(coalesce(niveau, 1), 1), 3),
           niveau_absences   = least(greatest(coalesce(niveau, 1), 1), 3),
           niveau_comptes    = least(greatest(coalesce(niveau, 1), 1), 3),
           niveau_infos      = least(greatest(coalesce(niveau, 1), 1), 3),
           is_super_admin    = (coalesce(niveau, 1) >= 4 and coalesce(is_technique, false) = false)
     where coalesce(is_technique, false) = false;
    alter table public.residentes drop column niveau;
  end if;
end $$;

-- 4) Resynchronise is_admin sur toutes les lignes (via trigger).
update public.residentes set is_super_admin = is_super_admin;
