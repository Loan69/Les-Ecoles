-- Retrait des restrictions « réservé aux administratrices » / « réservé au staff » — 2026-08-17
--
-- Ces trois drapeaux sont remplacés par le ciblage sur GROUPES (voir supabase/groupes.sql
-- et src/lib/visibilite.ts). Ils reposaient sur l'attribut `residentes.is_admin`, un miroir
-- signifiant « au moins la Lecture sur N'IMPORTE QUELLE section » : quelqu'un n'ayant que
-- « Événements : Lecture » accédait ainsi aux options de repas réservées à l'intendance.
-- Un groupe nommé (« Intendance », « Staff 12 ») exprime l'intention exactement.
--
-- ⚠️ ORDRE : passer ce SQL **après** avoir déployé le code qui n'utilise plus ces colonnes.
-- Dans l'autre sens, l'appli continuerait d'écrire des colonnes disparues (erreur à
-- l'enregistrement d'une option ou d'une rubrique).
--
-- ⚠️ Les contenus ci-dessous perdent leur restriction et deviennent **visibles par toutes**
-- tant qu'ils ne sont pas reciblés sur un groupe. Décision prise en connaissance de cause :
-- l'appli est en test, aucune utilisatrice n'est encore en service (17/08/2026).
--
-- ÉTAT AU 17/08/2026 — à recibler à la main après coup :
--
--   Options de repas (meal_options.admin_only = true)
--     · « Pique-nique »  (lieu : résidence de la personne, active)
--     · « Réco au 36 »   (lieu : 36, active)
--
--   Rubriques Administratif (admin_sections.admin_only = true)
--     · « Mode d'emploi — Administratrices »
--
--   Événements (evenements.reserve_admin non nul) — TOUS PASSÉS, sans enjeu de visibilité :
--     · #120 « WE Gen Z »              → all  (2026-02-28)
--     · #121 « Réco sm »               → all  (2026-03-08)
--     · #122 « Réco centre d'étude »   → all  (2026-05-10)
--     · #96  « Draps staff »           → 36   (2026-01-28)
--     · #138 « Anniversaire Marie-Ange » → all (2026-03-20)
--
-- Idempotent : rejouable sans dommage.

alter table public.meal_options   drop column if exists admin_only;
alter table public.admin_sections drop column if exists admin_only;
alter table public.evenements     drop column if exists reserve_admin;
