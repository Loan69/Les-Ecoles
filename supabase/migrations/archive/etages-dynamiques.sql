-- ============================================================================
-- Étages à part entière
-- ============================================================================
-- Avant : un étage n'existait qu'à travers les chambres qui le mentionnaient
-- (`places.etage`, saisi en texte libre chambre par chambre). Impossible donc de
-- déclarer « Étage 3 » avant d'y créer une chambre — bloquant pour initialiser un
-- foyer vierge — et deux orthographes créaient deux étages.
--
-- Après : `etages` est la liste de référence, par bloc. On y crée / renomme /
-- réordonne / supprime un étage même vide, puis on y range des chambres.
--
-- IMPORTANT — on ne touche pas aux valeurs déjà stockées : `etages.value` reprend
-- exactement ce que contient `places.etage` (souvent un code hérité, « r12_etage4 »).
-- C'est aussi ce que le ciblage des événements et des options a mémorisé dans
-- `visibilite.etage` : le changer casserait toutes les visibilités existantes.
-- Seul `label` est libre et modifiable.
--
-- À exécuter dans l'éditeur SQL Supabase. Idempotent.
-- ============================================================================

-- 1) La table ---------------------------------------------------------------
create table if not exists public.etages (
  id         uuid primary key default gen_random_uuid(),
  -- Bloc d'appartenance (voir supabase/blocs-dynamiques.sql).
  residence  text not null references public.residences (value) on update cascade,
  -- Clé technique stable, reprise telle quelle dans places.etage et visibilite.etage.
  value      text not null,
  -- Nom affiché, librement modifiable (« Étage 4 », « Rez-de-chaussée »…).
  label      text not null,
  ordre      integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists etages_residence_value_key on public.etages (residence, value);
create index if not exists etages_residence_idx on public.etages (residence);

-- 2) Reprise de l'existant : un étage par (bloc, valeur) déjà présent dans les places --
-- Le libellé reprend la mise en forme déjà affichée par formatEtage() :
-- « r12_etage4 » / « etage_2 » / « 4 » → « Étage 4 ».
insert into public.etages (residence, value, label, ordre)
select
  p.residence,
  p.etage,
  case
    when substring(p.etage from '(?:etage|étage|et)[ _-]?(\d+)') is not null
      then 'Étage ' || substring(p.etage from '(?:etage|étage|et)[ _-]?(\d+)')
    when p.etage ~ '^\d+$' then 'Étage ' || p.etage
    else p.etage
  end,
  -- Ordre naturel : le numéro d'étage quand on peut le lire, sinon à la fin.
  coalesce(
    nullif(substring(p.etage from '(?:etage|étage|et)[ _-]?(\d+)'), '')::int,
    case when p.etage ~ '^\d+$' then p.etage::int else 999 end
  )
from public.places p
where p.etage is not null
  and btrim(p.etage) <> ''
group by p.residence, p.etage
on conflict (residence, value) do nothing;

-- 3) Lecture ouverte, écriture réservée au serveur --------------------------
-- Même principe que `residences` : les écrans lisent la liste avec la session de
-- l'utilisatrice ; la création/modification passe par /api/admin/etages, en service
-- role, sous garde super-admin.
alter table public.etages enable row level security;

drop policy if exists "etages lisibles" on public.etages;
create policy "etages lisibles"
  on public.etages for select
  to authenticated, anon
  using (true);

-- 4) Vérification ------------------------------------------------------------
-- select residence, value, label, ordre from public.etages order by residence, ordre, label;
-- select e.residence, e.label, count(p.id) as chambres
--   from public.etages e left join public.places p
--     on p.residence = e.residence and p.etage = e.value
--  group by e.residence, e.label, e.ordre order by e.residence, e.ordre;
