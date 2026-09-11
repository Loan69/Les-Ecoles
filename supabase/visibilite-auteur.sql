-- Une rubrique sait qui l'a écrite
-- ================================
-- 2026-09-11. Additive et réversible — retour arrière : `supabase/rollback/visibilite-auteur.sql`.
--
-- POURQUOI. Jusqu'ici, toute personne ayant *Infos = Admin · gérer* recevait TOUTES les
-- rubriques, ciblage compris. Cette exception n'existait que pour empêcher un
-- enfermement : cibler une rubrique en s'excluant soi-même la faisait disparaître de
-- son propre écran de modification, et elle devenait irrécupérable sans passer par la
-- base. Le remède visait large — il suffit de **l'autrice** pour soigner ce mal-là.
--
-- Sans auteur enregistré, la règle « l'autrice voit toujours sa rubrique » ne peut pas
-- s'écrire : c'est tout l'objet de cette colonne. Les événements, eux, enregistrent
-- déjà la leur dans `evenements.user_id` depuis toujours.
--
-- ⚠️ LES RUBRIQUES EXISTANTES GARDENT LEUR COMPORTEMENT. Leur auteur est inconnu et
-- rien ne permet de le reconstituer : `admin_sections` n'a qu'un `updated_at`, qui dit
-- la dernière main passée, pas la première. Elles restent donc à `NULL`, et le code lit
-- `NULL` comme « auteur inconnu → l'ancienne règle s'applique » : l'intendance
-- continue de toutes les voir. Seules les rubriques créées APRÈS cette migration
-- portent une autrice et deviennent réellement restreignables.
--
-- C'est la même prudence que `blocs-par-ecran.sql` : la migration seule ne change
-- RIEN de visible, et rien ne disparaît sous les pieds de qui que ce soit.

-- ── La colonne ──────────────────────────────────────────────────────────────
--
-- `ON DELETE SET NULL`, et surtout PAS `CASCADE` : supprimer un compte ne doit pas
-- emporter les rubriques qu'il a écrites — un règlement de foyer n'appartient pas à
-- la personne qui l'a saisi. La rubrique retombe simplement en « auteur inconnu »,
-- donc visible de l'intendance : le contenu se récupère au lieu de se perdre.
--
-- (`evenements.user_id`, lui, est en `ON DELETE CASCADE` de longue date : supprimer
-- un compte supprime ses événements. Comportement hérité, non touché ici, mais bon à
-- savoir avant de supprimer le compte d'une administratrice.)
alter table public.admin_sections
  add column if not exists auteur_user_id uuid references auth.users(id) on delete set null;

comment on column public.admin_sections.auteur_user_id is
  'Qui a créé la rubrique. Elle lui reste visible quel que soit son ciblage, afin qu''une autrice ne puisse pas s''enfermer dehors. NULL = rubrique antérieure au 2026-09-11 (ou autrice supprimée) : l''ancienne règle s''applique, toute l''intendance la voit.';

-- ── Lecture ─────────────────────────────────────────────────────────────────
-- Le filtrage des rubriques est fait côté serveur, dans `/api/admin-sections`, sous
-- la session de l'utilisatrice (R-VIS-03). La policy de lecture reste donc inchangée :
-- c'est la route qui décide, pas la RLS. Rien à faire ici.

-- ⚠️ ORDRE : passer ce SQL **AVANT** de déployer le code. La création d'une rubrique
-- écrit `auteur_user_id` ; tant que la colonne n'existe pas, PostgREST refuse l'insert
-- et le bouton « Ajouter une rubrique » échoue. La LECTURE, elle, tolère les deux états
-- (colonne absente → auteur `undefined` → ancienne règle), donc l'inverse ne casse rien
-- d'autre que la création.
--
-- Idempotent : rejouable sans dommage (`if not exists` + `comment on` réécrit).
