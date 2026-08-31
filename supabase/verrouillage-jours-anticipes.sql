-- Verrouillage anticipé des repas : d'un booléen « week-end » à une liste de jours
-- ------------------------------------------------------------------------------
-- 2026-08-31. Le réglage `verrouillage_weekend` codait en dur « samedi + dimanche,
-- fermés dès le vendredi ». Il devient `verrouillage_jours_anticipes` : la liste des
-- jours que l'intendance ferme d'avance, au format « 6,0 » (0 = dimanche … 6 = samedi).
--
-- Des jours cochés qui se suivent forment UNE série, fermée dès la veille du premier :
-- « 6,0 » reproduit donc exactement l'ancien comportement (samedi ET dimanche fermés
-- le vendredi à l'heure de clôture). Voir R-LOCK-07 / R-LOCK-08.
--
-- Idempotent : rejouable sans dommage.

-- 1. Créer la nouvelle clé à partir de l'ancienne, foyer par foyer.
insert into public.app_settings (key, value, label)
select
  'verrouillage_jours_anticipes',
  case when s.value = 'true' then '6,0' else '' end,
  'Jours dont les repas sont verrouillés dès la veille de leur série'
from public.app_settings s
where s.key = 'verrouillage_weekend'
  and not exists (
    select 1 from public.app_settings t where t.key = 'verrouillage_jours_anticipes'
  );

-- 2. Foyer qui n'avait pas non plus l'ancienne clé : partir du défaut du seed (week-end fermé).
insert into public.app_settings (key, value, label)
select
  'verrouillage_jours_anticipes',
  '6,0',
  'Jours dont les repas sont verrouillés dès la veille de leur série'
where not exists (
  select 1 from public.app_settings t where t.key = 'verrouillage_jours_anticipes'
);

-- 3. Retirer l'ancienne clé. Le code sait encore la lire (repli tant que cette migration
--    n'est pas passée), mais la laisser en base ferait cohabiter deux réglages dont un
--    seul agit — la confusion qu'on veut éviter.
delete from public.app_settings where key = 'verrouillage_weekend';
