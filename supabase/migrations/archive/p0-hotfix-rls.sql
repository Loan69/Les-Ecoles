-- P0 — Correctif d'urgence RLS. À passer dans Supabase → SQL Editor.
--
-- Ne traite PAS tout P0 : ferme la faille critique et la fuite anonyme.
-- Le durcissement fin (droits par section) vient ensuite, cf. docs/conception-multi-foyers.md.
--
-- Sans risque pour l'application :
--   · service_role possède BYPASSRLS → toutes les routes /api sont insensibles à ce fichier ;
--   · residentes / invites / invites_repas ne sont JAMAIS écrites depuis le navigateur
--     (vérifié : 15 accès client, tous en .select) ;
--   · residences et etages restent lisibles en anonyme — le formulaire d'inscription
--     des invitées en a besoin AVANT création du compte (signupForm.tsx via useResidences).

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CRITIQUE — élévation de privilèges sur residentes
-- ═══════════════════════════════════════════════════════════════════════════
-- La policy UPDATE portait :
--     EXISTS (SELECT 1 FROM residentes r WHERE r.user_id = auth.uid() OR r.is_admin = true)
-- Le OR est mal placé : il suffit qu'UNE ligne de la table ait is_admin = true
-- (il y en a 20) pour que le EXISTS soit vrai. Le prédicat ne dépend donc pas de
-- l'appelant : il est TOUJOURS vrai — y compris pour le rôle anon, qui a GRANT UPDATE.
-- Conséquence : n'importe qui, avec la seule clé publique, pouvait modifier n'importe
-- quelle ligne — dont is_super_admin et niveau_*.
--
-- On supprime sans remplacer : aucune écriture sur residentes ne part du navigateur,
-- tout passe par les routes /api sous service_role.
drop policy if exists "Allow admins to update any residente" on public.residentes;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Fermer les lectures anonymes
-- ═══════════════════════════════════════════════════════════════════════════
-- Ces policies étaient écrites « TO public », qui en PostgreSQL désigne TOUS les
-- rôles — anon compris. Le prédicat `using (true)` les rendait donc lisibles sans
-- aucun compte. On les recrée à l'identique, en visant `authenticated`.

drop policy if exists "Résidentes: accès à leurs données" on public.residentes;
create policy "residentes lisibles par les connectees" on public.residentes
  for select to authenticated using (true);

drop policy if exists "Invitées: accès à leurs données" on public.invitees;
create policy "invitees lisibles par les connectees" on public.invitees
  for select to authenticated using (true);

drop policy if exists "Tout le monde peut lire les événements" on public.evenements;
create policy "evenements lisibles par les connectees" on public.evenements
  for select to authenticated using (true);

drop policy if exists "read admin_sections" on public.admin_sections;
create policy "admin_sections lisibles par les connectees" on public.admin_sections
  for select to authenticated using (true);

drop policy if exists "Public can read app settings" on public.app_settings;
create policy "app_settings lisibles par les connectees" on public.app_settings
  for select to authenticated using (true);

drop policy if exists "read meal_options" on public.meal_options;
create policy "meal_options lisibles par les connectees" on public.meal_options
  for select to authenticated using (true);

drop policy if exists "read meal_service_options" on public.meal_service_options;
create policy "meal_service_options lisibles par les connectees" on public.meal_service_options
  for select to authenticated using (true);

drop policy if exists "toutes les utilisatrices peuvent consulter les invtiés" on public.invites;
create policy "invites lisibles par les connectees" on public.invites
  for select to authenticated using (true);

drop policy if exists "Les résidentes voient tous les invitées" on public.invites_repas;
create policy "invites_repas lisibles par les connectees" on public.invites_repas
  for select to authenticated using (true);

drop policy if exists "Allow all select" on public.select_options_residence;
create policy "select_options_residence lisibles par les connectees" on public.select_options_residence
  for select to authenticated using (true);

-- Tables d'options héritées, plus lues par le code (suppression prévue en P3) :
-- on ferme en attendant.
drop policy if exists "Tous les utilisateurs peuvent lire evenement" on public.select_options_evenement;
drop policy if exists "Tout le monde peut lire les options de rappel" on public.select_options_rappel;
drop policy if exists "Tous les utilisateurs peuvent lire recurrence" on public.select_options_recurrence;

-- residences : doublon. « residences lisibles » (anon + authenticated) est conservée,
-- « select all » (public) fait double emploi.
drop policy if exists "select all" on public.residences;

-- pending_users : contient les emails en cours d'inscription. Aucune raison d'être lue
-- par qui que ce soit hors service_role.
drop policy if exists "Public read" on public.pending_users;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Fermer les écritures ouvertes à tous
-- ═══════════════════════════════════════════════════════════════════════════
-- invites / invites_repas : prédicats `using (true)` ou `with check (true)` en TO public,
-- donc écrivables en anonyme. Le nom de la policy annonçait « seules les admins » —
-- le prédicat ne le disait pas. Aucune écriture client sur ces tables : on supprime,
-- les routes /api continuent sous service_role.
drop policy if exists "Tout le monde peut insérer dans la table" on public.invites;
drop policy if exists "Tout le monde peut modifier un invité" on public.invites;
drop policy if exists "seules les admins peuvent supprimer un invité" on public.invites;
drop policy if exists "Les résidentes suppriment leurs invitées ou admin" on public.invites_repas;

commit;
