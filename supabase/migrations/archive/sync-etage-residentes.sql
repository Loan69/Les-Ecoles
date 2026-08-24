-- ============================================================================
-- Recaler residentes.residence / residentes.etage sur la place occupée
-- ============================================================================
-- `places` est la source de vérité de la structure ; `residentes.residence` et
-- `residentes.etage` en sont des copies héritées de la v1. Elles ont dérivé sur
-- certains comptes (un « r12_etage3 » côté résidente face au « 3 » côté place).
--
-- Conséquences observées :
--   · la personne sortait du classement par étage (son étage n'existant pas dans
--     la liste de référence, elle se retrouvait en fin de liste) ;
--   · sa clé technique s'affichait à la place du nom de l'étage ;
--   · surtout, le CIBLAGE la manquait : un événement visant « étage 3 » compare
--     `visibilite.etage` à `residentes.etage`, qui ne contenait pas la même valeur.
--
-- Les écrans d'intendance dérivent désormais l'étage de la place, mais la colonne
-- reste lue côté habitante (accueil, repas de la semaine) : on la recale une fois.
--
-- À exécuter dans l'éditeur SQL Supabase. Idempotent, sans effet si tout est aligné.
-- ============================================================================

-- 1) Aperçu de ce qui va changer (à lire avant d'exécuter la mise à jour) -----
-- select r.nom, r.prenom, r.residence as res_avant, p.residence as res_apres,
--        r.etage as etage_avant, p.etage as etage_apres, p.label as chambre
--   from public.residentes r
--   join public.places p on p.id = r.place_id
--  where r.place_id is not null
--    and (coalesce(r.residence,'') is distinct from coalesce(p.residence,'')
--         or coalesce(r.etage,'') is distinct from coalesce(p.etage,''));

-- 2) Recalage --------------------------------------------------------------
update public.residentes r
   set residence = p.residence,
       etage     = p.etage
  from public.places p
 where p.id = r.place_id
   and (coalesce(r.residence,'') is distinct from coalesce(p.residence,'')
        or coalesce(r.etage,'') is distinct from coalesce(p.etage,''));

-- 3) Vérification : doit renvoyer 0 ligne ------------------------------------
-- select count(*) from public.residentes r join public.places p on p.id = r.place_id
--  where coalesce(r.residence,'') is distinct from coalesce(p.residence,'')
--     or coalesce(r.etage,'') is distinct from coalesce(p.etage,'');
