-- RETOUR ARRIÈRE de supabase/ponctuel/compte-technique-les-ecoles.sql
-- ------------------------------------------------------------------
-- Rend au compte d'installation des Écoles son état de résidente-administratrice
-- ordinaire, chambre comprise.
--
-- ⚠️ CE FICHIER EST INCOMPLET PAR CONSTRUCTION. Les valeurs d'avant (place, bloc,
-- étage, chambre, niveaux) ne vivent nulle part ailleurs que dans la base qu'on
-- vient de modifier. La PARTIE 2 de la migration les affiche sous la forme d'un
-- `update` déjà rempli, dans l'onglet **Messages** de l'éditeur SQL Supabase :
-- c'est CETTE ligne-là qu'il faut coller ci-dessous, à la place du gabarit.
--
-- Si elle n'a pas été conservée, tout n'est pas perdu : le bloc, l'étage et la
-- chambre figurent encore dans les données historiques du compte (une présence
-- ou une absence enregistrée avant la migration), et l'identifiant de la place se
-- retrouve par son code dans `places`. Mais c'est une reconstitution, pas une
-- restauration — d'où l'insistance à garder la ligne.
--
-- ⚠️ La chambre a pu être réattribuée entre-temps — c'était le but. L'index unique
-- partiel `residentes_one_active_per_place` refusera alors ce retour arrière, avec
-- une erreur de clé dupliquée. C'est une protection, pas une panne : il faut
-- d'abord libérer la place de sa nouvelle occupante, ou viser une autre place.

-- ── Coller ici la ligne donnée par la migration ─────────────────────────────
-- Gabarit, à remplacer intégralement :
--
-- update public.residentes set
--   is_technique = false, is_super_admin = <avant>, place_id = '<uuid>',
--   residence = '<bloc>', etage = '<étage>', chambre = '<chambre>',
--   niveau_repas = <n>, niveau_evenements = <n>, niveau_absences = <n>,
--   niveau_comptes = <n>, niveau_infos = <n>
-- where user_id = '<uuid>';

-- ── Vérification ────────────────────────────────────────────────────────────
select prenom, nom, email, is_technique, is_super_admin,
       place_id, residence, etage, chambre
from public.residentes
where email = 'loandervillers@gmail.com';
