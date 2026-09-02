-- RETOUR ARRIÈRE de supabase/blocs-par-ecran.sql
-- ----------------------------------------------
-- Rend la table `residences` à son état d'avant les cases par écran.
--
-- Sans danger : la migration était ADDITIVE — `kind` n'a jamais été touché, et c'est
-- lui qui portait le comportement avant comme après ce rollback. Supprimer les cinq
-- colonnes suffit donc à revenir exactement à l'état antérieur.
--
-- ⚠️ Ce qui est perdu : les réglages saisis dans ces cinq colonnes depuis la migration.
-- Si l'intendance a coché des cases entre-temps, ce détail-là ne se retrouve pas.
-- Le reste — blocs, chambres, étages, personnes, ciblages — n'est pas concerné.
--
-- ⚠️ À passer APRÈS avoir redéployé un code qui ne lit plus ces colonnes (ou en même
-- temps) : le code des cases par écran interroge `ecran_*` et échouerait à les lire.
--
-- Idempotent : rejouable sans dommage.

alter table public.residences
  drop column if exists ecran_intercalaires,
  drop column if exists ecran_evenements,
  drop column if exists ecran_organisation_repas,
  drop column if exists ecran_rattachement_repas,
  drop column if exists ecran_presences;

-- Contrôle : les cinq colonnes ne doivent plus apparaître, `kind` doit être intact.
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'residences'
order by ordinal_position;
