-- ============================================================================
-- Blocs dynamiques : la table `residences` devient la source de vérité
-- ============================================================================
-- Avant : les blocs du foyer (Résidence 12, Résidence 36, Corail) étaient écrits
-- en dur dans le code (liste RESIDENCES de PlacesManager, contrainte CHECK sur
-- places.residence, filtres `.neq("value","corail")` des écrans d'intendance).
-- Conséquence : Corail n'avait son encadré nulle part (compta, présences, accueil)
-- et les personnes qui y sont rattachées disparaissaient des listes.
--
-- Après : un bloc est une ligne de `residences`. En ajouter un depuis l'onglet
-- Administration suffit pour qu'il apparaisse partout (encadré propre dans la
-- compta, les présences, l'organisation des repas, le ciblage, l'accueil).
--
-- À exécuter dans l'éditeur SQL Supabase. Idempotent.
-- ============================================================================

-- 1) Colonnes de description d'un bloc -------------------------------------
alter table public.residences
  -- 'chambre' : le bloc contient des chambres réparties par étage (Résidence 12/36)
  -- 'poste'   : le bloc contient des postes sans étage (Corail / intendance)
  add column if not exists kind      text    not null default 'chambre',
  add column if not exists ordre     integer not null default 0,
  -- Couleur d'affichage, reprise partout (onglets d'accueil, badges, encadrés).
  add column if not exists couleur   text    not null default 'blue',
  add column if not exists is_active boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'residences_kind_check') then
    alter table public.residences add constraint residences_kind_check check (kind in ('chambre', 'poste'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'residences_couleur_check') then
    alter table public.residences add constraint residences_couleur_check
      check (couleur in ('amber', 'pink', 'teal', 'blue', 'purple', 'green'));
  end if;
end $$;

-- 2) Valeurs des blocs existants -------------------------------------------
update public.residences set kind = 'poste'   where value = 'corail' and kind <> 'poste';
update public.residences set couleur = 'amber', ordre = 1 where value = '12';
update public.residences set couleur = 'pink',  ordre = 2 where value = '36';
update public.residences set couleur = 'teal',  ordre = 3 where value = 'corail';

-- 3) `residences.value` devient une clé référençable ------------------------
create unique index if not exists residences_value_key on public.residences (value);

-- 4) places.residence : la liste fermée ('12','36','corail') laisse place au FK --
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.places'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%residence%'
  loop
    execute format('alter table public.places drop constraint %I', c.conname);
  end loop;

  if not exists (select 1 from pg_constraint where conname = 'places_residence_fkey') then
    alter table public.places
      add constraint places_residence_fkey foreign key (residence)
      references public.residences (value) on update cascade;
  end if;
end $$;

-- 5) Lecture ouverte, écriture réservée au serveur -------------------------
-- Les écrans (accueil, compta, présences, ciblage) lisent la liste des blocs avec
-- la session de l'utilisatrice ; la création/modification passe par
-- /api/admin/residences, en service role, sous garde super-admin.
-- La lecture reste ouverte comme aujourd'hui (la table ne contient aucune donnée
-- personnelle, juste le nom des blocs) ; c'est l'ÉCRITURE que la RLS vient fermer.
alter table public.residences enable row level security;

drop policy if exists "residences lisibles" on public.residences;
create policy "residences lisibles"
  on public.residences for select
  to authenticated, anon
  using (true);

-- 6) Vérification ------------------------------------------------------------
-- select value, label, kind, ordre, couleur, is_active from public.residences order by ordre, value;
-- select residence, kind, count(*) from public.places group by residence, kind order by residence;
