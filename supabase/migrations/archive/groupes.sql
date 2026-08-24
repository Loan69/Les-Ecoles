-- Groupes de personnes (ciblage de visibilité) — 2026-08-17
--
-- Un groupe est une étiquette libre posée sur des comptes (« Staff 12 », « Intendance »,
-- « Responsables événements »). Il sert UNIQUEMENT à cibler la visibilité d'un contenu
-- (événement, option de repas, rubrique Administratif). Il n'accorde AUCUN droit :
-- les droits restent réglés par section (niveau_*), voir supabase/roles-sections.sql.
--
-- Idempotent : rejouable sans dommage.

create extension if not exists "pgcrypto";

-- --- Le catalogue des groupes -------------------------------------------------------
create table if not exists public.groupes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Un seul groupe par nom (comparaison insensible à la casse : « Staff 12 » = « staff 12 »).
create unique index if not exists groupes_nom_unique on public.groupes (lower(nom));

-- --- Qui est dans quel groupe -------------------------------------------------------
-- user_id référence auth.users comme le reste du modèle (residentes.user_id).
-- La suppression du groupe emporte ses appartenances ; la suppression du compte aussi.
create table if not exists public.groupe_membres (
  groupe_id uuid not null references public.groupes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (groupe_id, user_id)
);

create index if not exists groupe_membres_user_idx on public.groupe_membres (user_id);

-- --- Ciblage des rubriques de l'onglet Administratif ---------------------------------
-- Les événements (evenements.visibilite) et les options de repas (meal_options.visibilite)
-- ont déjà leur colonne ; les rubriques n'avaient que le drapeau admin_only.
-- Format commun : { residence: [], etage: [], groupes: [], exclusions: [] }
-- NULL ou toutes listes vides = visible par toutes.
alter table public.admin_sections add column if not exists visibilite jsonb;

-- --- RLS ----------------------------------------------------------------------------
alter table public.groupes enable row level security;
alter table public.groupe_membres enable row level security;

-- Les NOMS des groupes sont lisibles par toute personne connectée : l'appli en a besoin
-- pour afficher un ciblage. Les écritures passent par /api/admin/groupes (service role).
drop policy if exists "groupes lisibles par les connectees" on public.groupes;
create policy "groupes lisibles par les connectees"
  on public.groupes for select
  to authenticated
  using (true);

-- En revanche, la COMPOSITION des groupes ne se lit pas librement : chacune ne voit que
-- ses propres appartenances (nécessaire pour filtrer ses options de repas côté navigateur).
-- L'intendance lit la composition complète via l'API (service role), gardée par la section
-- Comptes.
drop policy if exists "mes appartenances de groupe" on public.groupe_membres;
create policy "mes appartenances de groupe"
  on public.groupe_membres for select
  to authenticated
  using (user_id = auth.uid());
