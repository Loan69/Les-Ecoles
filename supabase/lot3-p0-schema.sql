-- =====================================================================
-- Lot 3 — P0 : modèle de données « gestion des comptes par l'intendance »
-- Idempotent (réexécutable sans risque). À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Table des PLACES (chambres ET postes corail)
--    Occupation NON stockée : déduite d'un compte résidente actif rattaché.
-- ---------------------------------------------------------------------
create table if not exists public.places (
  id         uuid primary key default gen_random_uuid(),
  residence  text not null check (residence in ('12', '36', 'corail')),
  kind       text not null check (kind in ('chambre', 'poste')),
  etage      text,                      -- renseigné pour les chambres, null pour les postes
  code       text not null,             -- code chambre (ex. grand_palais) ou libellé de poste (ex. Cuisine)
  label      text,                      -- libellé affiché (sinon dérivé de code)
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Une place identifiée de façon unique par (résidence, type, code)
create unique index if not exists places_residence_kind_code_key
  on public.places (residence, kind, code);

-- Cohérence : une chambre a un étage, un poste n'en a pas
alter table public.places drop constraint if exists places_kind_etage_chk;
alter table public.places add constraint places_kind_etage_chk
  check ( (kind = 'chambre') or (kind = 'poste' and etage is null) );

-- ---------------------------------------------------------------------
-- 2) Colonnes ajoutées à RESIDENTES
-- ---------------------------------------------------------------------
alter table public.residentes add column if not exists place_id uuid references public.places(id);
alter table public.residentes add column if not exists statut text not null default 'active'
  check (statut in ('active', 'archivee'));
alter table public.residentes add column if not exists archived_at timestamptz;
alter table public.residentes add column if not exists is_super_admin boolean not null default false;

-- R-CPT-01/05 : au plus UN compte actif par place (garde-fou base de données)
create unique index if not exists residentes_one_active_per_place
  on public.residentes (place_id)
  where statut = 'active' and place_id is not null;

-- ---------------------------------------------------------------------
-- 3) Table des INVITATIONS (suivi : envoyée / acceptée / expirée / annulée)
-- ---------------------------------------------------------------------
create table if not exists public.invitations (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  place_id     uuid not null references public.places(id),
  role         text not null default 'residente',
  auth_user_id uuid,                    -- id du user Supabase créé par l'invite
  statut       text not null default 'envoyee'
                 check (statut in ('envoyee', 'acceptee', 'expiree', 'annulee')),
  invited_by   uuid,                    -- admin émettrice (auth user id)
  expires_at   timestamptz not null default (now() + interval '14 days'),
  created_at   timestamptz not null default now()
);

-- Une seule invitation « en attente » par place à la fois
create unique index if not exists invitations_one_pending_per_place
  on public.invitations (place_id)
  where statut = 'envoyee';

-- ---------------------------------------------------------------------
-- 4) RLS
--    - places : lecture pour tout utilisateur authentifié ; écritures via
--      l'API admin (service role, qui bypass RLS).
--    - invitations : verrouillée (emails) ; seul le service role y accède.
-- ---------------------------------------------------------------------
alter table public.places enable row level security;
drop policy if exists places_read_authenticated on public.places;
create policy places_read_authenticated on public.places
  for select to authenticated using (true);

alter table public.invitations enable row level security;
-- (aucune policy permissive : accès réservé au service role via requireAdmin)

-- =====================================================================
-- 5) BASCULE SUPER-ADMIN (compte de Loan) — à exécuter une fois.
--    Le passe en compte technique hors modèle résidente : accès total,
--    pas de place (libère sa chambre actuelle), non compté/listé.
--    Vérifie l'email avant d'exécuter.
-- =====================================================================
update public.residentes
set is_super_admin = true,
    is_admin       = true,
    place_id       = null
where user_id = (select id from auth.users where email = 'loandervillers@gmail.com');
