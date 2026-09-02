-- Un bloc garde son type, mais ce type ne décide plus d'où il apparaît
-- --------------------------------------------------------------------
-- 2026-09-02. `residences.kind` ('chambre' / 'poste', dits « Lieu » et « Équipe »)
-- faisait DEUX métiers d'un seul drapeau :
--
--   1. ce que le bloc CONTIENT — des chambres réparties par étage, ou des postes ;
--   2. les CINQ écrans où il APPARAÎT.
--
-- Il garde le premier, qui est le sien. Le second devient cinq cases portées par le
-- bloc, réglables une par une depuis « Gérer les blocs, chambres & étages ».
--
-- ⚠️ Migration ADDITIVE et RÉVERSIBLE : `kind` n'est ni supprimé ni modifié. Le retour
-- arrière est `supabase/rollback/blocs-par-ecran.sql` — cinq DROP COLUMN, rien d'autre.
--
-- ⚠️ Passer cette migration NE CHANGE AUCUN COMPORTEMENT : les valeurs sont dérivées de
-- `kind`, donc chaque bloc garde exactement les écrans qu'il avait. C'est seulement en
-- décochant, ensuite, que l'intendance voit un effet.
--
-- Trois surfaces ne sont volontairement PAS réglables (R-RES-04 / R-RES-05) :
-- la comptabilité, le ciblage de visibilité et l'écran d'Administration listent
-- TOUJOURS tous les blocs. Les en retirer ferait disparaître des personnes d'un
-- décompte, ou rendrait inatteignable un contenu déjà ciblé.
--
-- Idempotent : rejouable sans dommage — voir la note sur les colonnes NULL ci-dessous.

-- 1. Colonnes créées SANS valeur par défaut, donc NULL partout.
--
--    C'est ce qui rend le rejeu sûr. Avec un DEFAULT true, une ligne « tout coché » est
--    indiscernable d'une ligne jamais initialisée : un second passage écraserait un
--    réglage saisi entre-temps par l'intendance. NULL distingue les deux sans ambiguïté.
--
--    Entre cette étape et la suivante, l'application lit NULL comme « colonne absente »
--    et retombe sur `kind` : le comportement reste correct même à mi-migration.
alter table public.residences
  add column if not exists ecran_intercalaires       boolean,
  add column if not exists ecran_evenements          boolean,
  add column if not exists ecran_organisation_repas  boolean,
  add column if not exists ecran_rattachement_repas  boolean,
  add column if not exists ecran_presences           boolean;

-- 2. Reprise de l'existant, colonne par colonne et UNIQUEMENT là où rien n'est encore
--    inscrit. Un rejeu ne trouve plus de NULL et ne touche donc à rien.
update public.residences set ecran_intercalaires      = (kind = 'chambre') where ecran_intercalaires      is null;
update public.residences set ecran_evenements         = (kind = 'chambre') where ecran_evenements         is null;
update public.residences set ecran_organisation_repas = (kind = 'chambre') where ecran_organisation_repas is null;
update public.residences set ecran_rattachement_repas = (kind = 'chambre') where ecran_rattachement_repas is null;
update public.residences set ecran_presences          = (kind = 'chambre') where ecran_presences          is null;

-- 3. Verrouiller la forme, une fois toutes les lignes renseignées. Le défaut `true` ne
--    sert qu'à une insertion faite à la main : l'application, elle, écrit toujours les
--    cinq valeurs explicitement.
alter table public.residences
  alter column ecran_intercalaires      set default true,
  alter column ecran_evenements         set default true,
  alter column ecran_organisation_repas set default true,
  alter column ecran_rattachement_repas set default true,
  alter column ecran_presences          set default true;

alter table public.residences
  alter column ecran_intercalaires      set not null,
  alter column ecran_evenements         set not null,
  alter column ecran_organisation_repas set not null,
  alter column ecran_rattachement_repas set not null,
  alter column ecran_presences          set not null;

comment on column public.residences.ecran_intercalaires      is 'Le bloc a son intercalaire sur l''accueil (onglets Événements).';
comment on column public.residences.ecran_evenements         is 'Le bloc peut être choisi comme LIEU d''un événement.';
comment on column public.residences.ecran_organisation_repas is 'Le bloc a son encadré dans l''onglet Organisation des repas.';
comment on column public.residences.ecran_rattachement_repas is 'Une option de repas peut être imputée à ce bloc (R-OPT-10).';
comment on column public.residences.ecran_presences          is 'Le bloc figure dans les présences au foyer (R-RES-09).';

-- Contrôle. Attendu : les blocs Lieu (kind = 'chambre') à true partout, les blocs
-- Équipe (kind = 'poste') à false partout — soit le comportement d'avant la migration.
select value, label, kind,
       ecran_intercalaires      as intercalaires,
       ecran_evenements         as evenements,
       ecran_organisation_repas as organisation,
       ecran_rattachement_repas as imputation,
       ecran_presences          as presences
from public.residences
order by ordre, value;
