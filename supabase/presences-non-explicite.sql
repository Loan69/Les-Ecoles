-- ⚠️ MIGRATION HISTORIQUE — DÉJÀ APPLIQUÉE, NON REJOUABLE TELLE QUELLE.
--    La table « presences_v2 » a été renommée « presences » le 04/08/2026
--    (voir suppression-v1-renommage-presences.sql). Conservée pour mémoire.
--
-- « Non » explicite : distinguer « ne mange pas » de « n'a pas répondu ».
--
-- Avant : une ligne presences_v2 = inscrite ; pas de ligne = « Non » ET « sans réponse »
-- (les deux états étaient confondus).
-- Après : ligne avec option_id      = inscrite à cette option
--         ligne avec option_id NULL = « Non » explicite (elle a répondu qu'elle ne mange pas)
--         aucune ligne              = sans réponse
--
-- L'historique n'est pas repris : avant la date de bascule (voir BASCULE_REPONSE_EXPLICITE
-- dans src/lib/presenceStatut.ts), l'absence de ligne continue de s'afficher « Non ».
alter table public.presences_v2
  alter column option_id drop not null;
