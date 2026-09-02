-- Un bloc n'a plus un TYPE, il a une liste d'écrans où il apparaît
-- ---------------------------------------------------------------
-- 2026-09-02. `residences.kind` ('chambre' / 'poste', dits « Lieu » et « Équipe »)
-- pilotait CINQ comportements d'écran qui n'ont aucune raison de bouger ensemble.
-- Chacun devient une case à cocher, portée par le bloc lui-même.
--
-- ⚠️ Migration ADDITIVE et RÉVERSIBLE : `kind` n'est ni supprimé ni modifié — il garde
-- son second métier, structurel (un bloc de chambres a des étages, un bloc de postes
-- n'en a pas), qui n'est pas le sujet ici. Le retour arrière est
-- `supabase/rollback-blocs-par-ecran.sql` : cinq DROP COLUMN, rien d'autre.
--
-- Les valeurs sont DÉRIVÉES de `kind`, si bien qu'aucun foyer ne change de
-- comportement en passant cette migration : un bloc « Lieu » coche les cinq cases,
-- un bloc « Équipe » n'en coche aucune. Exactement ce que faisait le code.
--
-- Trois surfaces ne sont volontairement PAS pilotables (R-RES-04 / R-RES-05) :
-- la comptabilité, le ciblage de visibilité et l'écran d'Administration listent
-- TOUJOURS tous les blocs. Les en retirer ferait disparaître des personnes d'un
-- décompte ou rendrait du contenu déjà ciblé inatteignable.
--
-- Idempotent : rejouable sans dommage.

alter table public.residences
  add column if not exists ecran_intercalaires       boolean not null default true,
  add column if not exists ecran_evenements          boolean not null default true,
  add column if not exists ecran_organisation_repas  boolean not null default true,
  add column if not exists ecran_rattachement_repas  boolean not null default true,
  add column if not exists ecran_presences           boolean not null default true;

comment on column public.residences.ecran_intercalaires      is 'Le bloc a son intercalaire sur l''accueil (onglets Événements).';
comment on column public.residences.ecran_evenements         is 'Le bloc peut être choisi comme LIEU d''un événement.';
comment on column public.residences.ecran_organisation_repas is 'Le bloc a son encadré dans l''onglet Organisation des repas.';
comment on column public.residences.ecran_rattachement_repas is 'Une option de repas peut être imputée à ce bloc (R-OPT-10).';
comment on column public.residences.ecran_presences          is 'Le bloc figure dans les présences au foyer (R-RES-09).';

-- Reprise de l'existant : on rejoue à l'identique ce que `kind` décidait jusqu'ici.
-- Restreinte aux lignes encore au défaut `true`, pour qu'un rejeu n'écrase pas un
-- réglage saisi entre-temps par l'intendance.
update public.residences
set ecran_intercalaires      = (kind = 'chambre'),
    ecran_evenements         = (kind = 'chambre'),
    ecran_organisation_repas = (kind = 'chambre'),
    ecran_rattachement_repas = (kind = 'chambre'),
    ecran_presences          = (kind = 'chambre')
where kind = 'poste'
  and (ecran_intercalaires or ecran_evenements or ecran_organisation_repas
       or ecran_rattachement_repas or ecran_presences);

-- Contrôle : à afficher après exécution.
select value, label, kind,
       ecran_intercalaires as intercal, ecran_evenements as evt,
       ecran_organisation_repas as orga, ecran_rattachement_repas as imput,
       ecran_presences as presences
from public.residences
order by ordre, value;
