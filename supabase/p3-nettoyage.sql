-- ════════════════════════════════════════════════════════════════════════════
-- P3 — Purge de la dette qui empêchait la généricité
-- ════════════════════════════════════════════════════════════════════════════
--
-- À passer APRÈS le déploiement du code de P3 : ces tables ne sont plus lues.
-- Idempotent.

begin;

-- ── Doublon des chambres et des étages ──────────────────────────────────────
-- `select_options_residence` décrivait étages et chambres AVANT que `places` et
-- `etages` n'existent. Elle est restée lue par trois écrans en parallèle : un foyer
-- neuf aurait dû saisir sa structure deux fois, et les deux copies pouvaient diverger.
--
-- Vérifié avant suppression sur le foyer d'origine : 28 résidentes sur 30 sont
-- résolues par `place_id`, et les deux autres n'ont ni étage ni chambre. Le repli
-- ne traduisait donc plus rien.
drop table if exists public.select_options_residence;

-- ── Listes d'options jamais lues par le code ────────────────────────────────
-- 4 lignes chacune, aucun écran ne les interroge (vérifié par recherche sur tout src/).
drop table if exists public.select_options_evenement;
drop table if exists public.select_options_rappel;
drop table if exists public.select_options_recurrence;

commit;

-- ════════════════════════════════════════════════════════════════════════════
-- NON EXÉCUTÉ — table `absences` (ancien modèle, 383 lignes)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Remplacée par `absences_sejour` et lue par aucun écran. Mais elle contient
-- **383 lignes d'historique** : une absence par jour, du modèle d'avant les séjours.
-- La supprimer est irréversible et ce n'est pas à un script de le décider.
--
-- Si l'historique n'a plus d'usage (comptabilité close sur la période) :
--
--   1. exporter d'abord — depuis le SQL Editor, exécuter puis « Download CSV » :
--        select * from public.absences order by date_absence;
--   2. puis seulement :
--        drop table public.absences;
--
-- Tant que ce n'est pas tranché, la table reste : elle ne coûte qu'une ligne dans
-- le socle et n'est plus interrogée. Elle porte une policy de lecture réservée à
-- l'intendance (P0), elle ne fuit donc pas.
