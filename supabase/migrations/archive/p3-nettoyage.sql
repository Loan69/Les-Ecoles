-- ════════════════════════════════════════════════════════════════════════════
-- P3 — Purge de la dette qui empêchait la généricité
-- ════════════════════════════════════════════════════════════════════════════
--
-- À passer APRÈS le déploiement du code de P3 : ces tables ne sont plus lues.
-- Idempotent.

begin;

-- ── Doublon des chambres et des étages ──────────────────────────────────────
-- `select_options_residence` décrivait blocs, étages et chambres AVANT que
-- `residences`, `etages` et `places` n'existent. Elle était restée lue par cinq
-- endroits : trois écrans d'intendance (libellés de chambre), le sélecteur de lieu
-- d'un événement, et le formulaire d'inscription. Un bloc créé depuis Administration
-- n'y apparaissait pas et ne pouvait donc pas être choisi comme lieu.
--
-- Vérifié sur les données avant suppression : 28 résidentes sur 30 sont résolues par
-- `place_id`, les deux autres n'ont ni étage ni chambre — le repli ne traduisait rien.
drop table if exists public.select_options_residence;

-- ── Liste d'options jamais lue ──────────────────────────────────────────────
-- Aucun écran ne demande la catégorie « recurrence » (les rootCategory réellement
-- utilisées sont « evenement » et « rappel »).
drop table if exists public.select_options_recurrence;

commit;

-- ════════════════════════════════════════════════════════════════════════════
-- CONSERVÉES — et c'est délibéré
-- ════════════════════════════════════════════════════════════════════════════
--
-- `select_options_evenement` (types d'événement) et `select_options_rappel`
-- (délais de rappel) restent lues par la modale de création d'événement. Ce ne
-- sont PAS de la dette : ce sont des listes de configuration, propres à chaque
-- foyer, au même titre que les options de repas. Les supprimer aurait cassé la
-- création d'événements.
--
-- ────────────────────────────────────────────────────────────────────────────
-- NON EXÉCUTÉ — table `absences` (ancien modèle, 383 lignes)
-- ────────────────────────────────────────────────────────────────────────────
--
-- Remplacée par `absences_sejour` et lue par aucun écran. Mais elle contient
-- **383 lignes d'historique** : une absence par jour, du modèle d'avant les séjours.
-- La supprimer est irréversible et ce n'est pas à un script de le décider.
--
--   1. exporter d'abord — depuis le SQL Editor, exécuter puis « Download CSV » :
--        select * from public.absences order by date_absence;
--   2. puis seulement :
--        drop table public.absences;
--
-- Tant que ce n'est pas tranché, elle reste : elle ne coûte qu'une ligne dans le
-- socle, n'est plus interrogée, et porte une policy de lecture réservée à
-- l'intendance (P0) — elle ne fuit donc pas.
