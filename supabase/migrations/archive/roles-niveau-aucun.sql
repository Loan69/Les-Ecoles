-- Ajoute le niveau 0 « Aucun » (la section n'existe pas pour la personne :
-- onglet masqué, page inaccessible, carte retirée de l'accueil).
--
-- Échelle après cette migration :
--   0 Aucun · 1 Utilisateur · 2 Lecture · 3 Édition
-- L'ancien « 1 Aucun » devient « 1 Utilisateur » : c'est un simple RENOMMAGE,
-- la valeur ne change pas. AUCUNE DONNÉE N'EST MODIFIÉE — les droits déjà
-- attribués gardent exactement le même comportement.
--
-- « comptes » n'a pas de page côté résidente : le niveau 0 n'y est pas proposé
-- (contrainte laissée à 1..3 pour cette colonne, ce qui interdit l'incohérence en base).
--
-- Le trigger residentes_sync_is_admin (is_admin = « une section >= 2 ») reste valable
-- tel quel : le niveau 0 est en dessous de 2, il ne rend donc personne admin.
-- Idempotent.

alter table public.residentes drop constraint if exists residentes_niv_sections_chk;

alter table public.residentes add constraint residentes_niv_sections_chk check (
  niveau_repas      between 0 and 3 and
  niveau_evenements between 0 and 3 and
  niveau_absences   between 0 and 3 and
  niveau_comptes    between 1 and 3 and
  niveau_infos      between 0 and 3
);
