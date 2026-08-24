-- ════════════════════════════════════════════════════════════════════════════
-- P0 complet — RLS alignée sur le modèle de droits par SECTION
-- ════════════════════════════════════════════════════════════════════════════
--
-- À passer APRÈS p0-hotfix-rls.sql (ce fichier le remplace intégralement, mais
-- le hotfix ferme la faille critique tout de suite — ne pas attendre celui-ci).
--
-- Ce que ça change : les ~20 policies existantes s'appuient sur le booléen `is_admin`,
-- que le code ne lit plus depuis 2026-08. Elles ne distinguent pas « Admin · consulter
-- Repas » de « Admin · gérer Comptes ». On les réécrit toutes sur les 5 sections × 4
-- niveaux de src/lib/roles.ts, en base cette fois.
--
-- IDEMPOTENT et FAIL-CLOSED : le script supprime TOUTES les policies du schéma public
-- puis les recrée. Une table oubliée devient inaccessible (hors service_role), jamais
-- ouverte par accident. Le tout dans une transaction : rien ne s'applique en cas d'erreur.
--
-- Ce qu'il NE fait PAS — voir « Reste à faire » en fin de fichier :
--   · `residentes` reste lisible en entier par toute personne connectée (email et
--     date de naissance compris). Fermer cela demande des GRANT par colonne, donc
--     3 modifications de code d'abord.
--   · `pending_users` reste supprimable en anonyme.

begin;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Fonction d'appui
-- ────────────────────────────────────────────────────────────────────────────
-- Niveau de l'appelante pour une section, selon src/lib/roles.ts :
--   0 Masquée · 1 Habitante · 2 Admin consulter · 3 Admin gérer
--
-- SECURITY DEFINER — indispensable : une policy de `residentes` qui interrogerait
-- `residentes` déclencherait « infinite recursion detected in policy ». La fonction
-- s'exécute sous son propriétaire (postgres, qui a BYPASSRLS), ce qui coupe la boucle.
--
-- Absence de ligne `residentes` → niveau 1. Ce n'est pas un oubli : c'est ce que fait
-- déjà EMPTY_RIGHTS côté client (src/lib/roles.ts) pour les comptes « invitée », qui
-- vivent dans la table `invitees` et n'ont pas de ligne `residentes`.
create or replace function public.mon_niveau(p_section text)
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then 0::smallint
    else coalesce(
      (select case
                when r.is_super_admin or r.is_technique then 3::smallint
                else case p_section
                       when 'repas'      then r.niveau_repas
                       when 'evenements' then r.niveau_evenements
                       when 'absences'   then r.niveau_absences
                       when 'comptes'    then r.niveau_comptes
                       when 'infos'      then r.niveau_infos
                     end
              end
         from public.residentes r
        where r.user_id = auth.uid()),
      1::smallint)
  end;
$$;

revoke all on function public.mon_niveau(text) from public;
grant execute on function public.mon_niveau(text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Table rase
-- ────────────────────────────────────────────────────────────────────────────
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- RLS active partout, y compris sur les tables qui n'ont aucune policy : sans
-- policy, seul service_role passe — c'est voulu (pending_users, meal_audit_log).
do $$
declare t record;
begin
  for t in select c.relname
             from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. SECTION « comptes » — personnes, places, structure du foyer
-- ════════════════════════════════════════════════════════════════════════════

-- residentes ─────────────────────────────────────────────────────────────────
-- Lecture ouverte à toute personne connectée : les écrans ordinaires (accueil,
-- repas de la semaine, ciblage d'événement, modale d'invitation) affichent les
-- noms de tout le foyer. Le durcissement par colonne est en « Reste à faire ».
create policy "residentes: lecture connectees" on public.residentes
  for select to authenticated using (true);
-- Aucune policy d'écriture : création, déplacement et archivage passent tous par
-- les routes /api sous service_role (vérifié : 15 accès client, tous en .select).

-- invitees ───────────────────────────────────────────────────────────────────
create policy "invitees: lecture connectees" on public.invitees
  for select to authenticated using (true);
-- /api/sync-user crée la ligne de l'invitée pour son propre compte.
create policy "invitees: creation de sa propre ligne" on public.invitees
  for insert to authenticated with check (user_id = auth.uid());
create policy "invitees: modification de sa ligne ou gestion" on public.invitees
  for update to authenticated
  using (user_id = auth.uid() or public.mon_niveau('comptes') >= 3)
  with check (user_id = auth.uid() or public.mon_niveau('comptes') >= 3);
create policy "invitees: suppression par la gestion" on public.invitees
  for delete to authenticated using (public.mon_niveau('comptes') >= 3);

-- places ─────────────────────────────────────────────────────────────────────
create policy "places: lecture connectees" on public.places
  for select to authenticated using (true);
create policy "places: ecriture gestion comptes" on public.places
  for all to authenticated
  using (public.mon_niveau('comptes') >= 3)
  with check (public.mon_niveau('comptes') >= 3);

-- residences ─────────────────────────────────────────────────────────────────
-- Lisible en ANONYME à dessein : le formulaire d'inscription des invitées
-- (signupForm.tsx via useResidences) affiche la liste des blocs AVANT que le
-- compte existe. Ne contient aucune donnée personnelle.
create policy "residences: lecture publique" on public.residences
  for select to anon, authenticated using (true);
create policy "residences: ecriture gestion comptes" on public.residences
  for all to authenticated
  using (public.mon_niveau('comptes') >= 3)
  with check (public.mon_niveau('comptes') >= 3);

-- etages ─────────────────────────────────────────────────────────────────────
-- Même raison que residences.
create policy "etages: lecture publique" on public.etages
  for select to anon, authenticated using (true);
create policy "etages: ecriture gestion comptes" on public.etages
  for all to authenticated
  using (public.mon_niveau('comptes') >= 3)
  with check (public.mon_niveau('comptes') >= 3);

-- invitations ────────────────────────────────────────────────────────────────
-- N'avait AUCUNE policy : inaccessible hors service_role. On lui donne les siennes,
-- sans quoi le passage de createSupabaseServer en clé anon la rendrait muette.
create policy "invitations: lecture gestion comptes" on public.invitations
  for select to authenticated using (public.mon_niveau('comptes') >= 2);
create policy "invitations: ecriture gestion comptes" on public.invitations
  for all to authenticated
  using (public.mon_niveau('comptes') >= 3)
  with check (public.mon_niveau('comptes') >= 3);

-- groupes / groupe_membres ───────────────────────────────────────────────────
-- Lecture des groupes ouverte : le ciblage de visibilité (événements, options de
-- repas, rubriques) en a besoin sans exiger la section Comptes — cf. requireGroupesRead.
create policy "groupes: lecture connectees" on public.groupes
  for select to authenticated using (true);
create policy "groupes: ecriture gestion comptes" on public.groupes
  for all to authenticated
  using (public.mon_niveau('comptes') >= 3)
  with check (public.mon_niveau('comptes') >= 3);

create policy "groupe_membres: mes appartenances ou consultation" on public.groupe_membres
  for select to authenticated
  using (user_id = auth.uid() or public.mon_niveau('comptes') >= 2);
create policy "groupe_membres: ecriture gestion comptes" on public.groupe_membres
  for all to authenticated
  using (public.mon_niveau('comptes') >= 3)
  with check (public.mon_niveau('comptes') >= 3);

-- pending_users ──────────────────────────────────────────────────────────────
-- Pas de lecture : contient les emails en cours d'inscription.
-- INSERT et DELETE restent ouverts en anonyme — signupForm.tsx écrit la ligne
-- AVANT auth.signUp, puis la supprime si l'inscription échoue. Faiblesse connue,
-- voir « Reste à faire ».
-- /api/sync-user lit la ligne de l'invitée juste après sa connexion, pour la
-- recopier dans `invitees`. Restreint à SA propre adresse : aucune autre ligne.
create policy "pending_users: lecture de sa propre ligne" on public.pending_users
  for select to authenticated using (email = auth.jwt() ->> 'email');
create policy "pending_users: creation avant compte" on public.pending_users
  for insert to anon, authenticated with check (true);
create policy "pending_users: suppression rollback inscription" on public.pending_users
  for delete to anon, authenticated using (true);

-- ════════════════════════════════════════════════════════════════════════════
-- 4. SECTION « repas »
-- ════════════════════════════════════════════════════════════════════════════

-- presences ──────────────────────────────────────────────────────────────────
create policy "presences: les siennes ou consultation intendance" on public.presences
  for select to authenticated
  using (user_id = auth.uid() or public.mon_niveau('repas') >= 2);
create policy "presences: inscrire les siens" on public.presences
  for insert to authenticated
  with check ((user_id = auth.uid() and public.mon_niveau('repas') >= 1)
              or public.mon_niveau('repas') >= 3);
create policy "presences: modifier les siens" on public.presences
  for update to authenticated
  using ((user_id = auth.uid() and public.mon_niveau('repas') >= 1) or public.mon_niveau('repas') >= 3)
  with check ((user_id = auth.uid() and public.mon_niveau('repas') >= 1) or public.mon_niveau('repas') >= 3);
create policy "presences: retirer les siens" on public.presences
  for delete to authenticated
  using ((user_id = auth.uid() and public.mon_niveau('repas') >= 1) or public.mon_niveau('repas') >= 3);

-- meal_options / meal_service_options ────────────────────────────────────────
create policy "meal_options: lecture section repas" on public.meal_options
  for select to authenticated using (public.mon_niveau('repas') >= 1);
create policy "meal_options: ecriture gestion repas" on public.meal_options
  for all to authenticated
  using (public.mon_niveau('repas') >= 3) with check (public.mon_niveau('repas') >= 3);

create policy "meal_service_options: lecture section repas" on public.meal_service_options
  for select to authenticated using (public.mon_niveau('repas') >= 1);
create policy "meal_service_options: ecriture gestion repas" on public.meal_service_options
  for all to authenticated
  using (public.mon_niveau('repas') >= 3) with check (public.mon_niveau('repas') >= 3);

-- invites (carnet des invités récurrents) ────────────────────────────────────
create policy "invites: lecture section repas" on public.invites
  for select to authenticated using (public.mon_niveau('repas') >= 1);
-- Le carnet est alimenté par les habitantes elles-mêmes : /api/invite-repas fait un
-- upsert sur `invites` quand on invite quelqu'un d'inconnu. Un upsert exige INSERT
-- **et** UPDATE — les deux au niveau 1, sinon inviter une nouvelle personne échoue.
create policy "invites: creation par les habitantes" on public.invites
  for insert to authenticated with check (public.mon_niveau('repas') >= 1);
create policy "invites: modification par les habitantes" on public.invites
  for update to authenticated
  using (public.mon_niveau('repas') >= 1) with check (public.mon_niveau('repas') >= 1);
-- L'archivage (is_active = false) passe par /api/invites sous service_role.
create policy "invites: suppression gestion repas" on public.invites
  for delete to authenticated using (public.mon_niveau('repas') >= 3);

-- invites_repas (un invité, un repas) ────────────────────────────────────────
create policy "invites_repas: lecture section repas" on public.invites_repas
  for select to authenticated using (public.mon_niveau('repas') >= 1);
create policy "invites_repas: inviter" on public.invites_repas
  for insert to authenticated
  with check ((invite_par = auth.uid() and public.mon_niveau('repas') >= 1)
              or public.mon_niveau('repas') >= 3);
create policy "invites_repas: modifier ses invites" on public.invites_repas
  for update to authenticated
  using ((invite_par = auth.uid() and public.mon_niveau('repas') >= 1) or public.mon_niveau('repas') >= 3)
  with check ((invite_par = auth.uid() and public.mon_niveau('repas') >= 1) or public.mon_niveau('repas') >= 3);
create policy "invites_repas: retirer ses invites" on public.invites_repas
  for delete to authenticated
  using ((invite_par = auth.uid() and public.mon_niveau('repas') >= 1) or public.mon_niveau('repas') >= 3);

-- meal_audit_log ─────────────────────────────────────────────────────────────
-- Lecture réservée à l'intendance ; l'écriture reste service_role (aucune policy),
-- un journal ne doit pas être alimentable depuis le navigateur.
create policy "meal_audit_log: lecture intendance repas" on public.meal_audit_log
  for select to authenticated using (public.mon_niveau('repas') >= 2);

-- ════════════════════════════════════════════════════════════════════════════
-- 5. SECTION « evenements »
-- ════════════════════════════════════════════════════════════════════════════
-- L'écriture directe est fermée aux non-gestionnaires. Le bouton « je viens »
-- des habitantes passe par la RPC basculer_confirmation_evenement (SECURITY
-- DEFINER), déjà appelée en premier par ConfirmationToggle.tsx:75 — c'est
-- exactement la « partie 2 » qu'annonçait confirmations-evenements.sql.
create policy "evenements: lecture section evenements" on public.evenements
  for select to authenticated using (public.mon_niveau('evenements') >= 1);
create policy "evenements: ecriture gestion evenements" on public.evenements
  for all to authenticated
  using (public.mon_niveau('evenements') >= 3)
  with check (public.mon_niveau('evenements') >= 3);

-- ════════════════════════════════════════════════════════════════════════════
-- 6. SECTION « absences » — présence au foyer
-- ════════════════════════════════════════════════════════════════════════════
create policy "absences_sejour: les siens ou consultation intendance" on public.absences_sejour
  for select to authenticated
  using (user_id = auth.uid() or public.mon_niveau('absences') >= 2);
create policy "absences_sejour: declarer les siens" on public.absences_sejour
  for insert to authenticated
  with check ((user_id = auth.uid() and public.mon_niveau('absences') >= 1)
              or public.mon_niveau('absences') >= 3);
create policy "absences_sejour: modifier les siens" on public.absences_sejour
  for update to authenticated
  using ((user_id = auth.uid() and public.mon_niveau('absences') >= 1) or public.mon_niveau('absences') >= 3)
  with check ((user_id = auth.uid() and public.mon_niveau('absences') >= 1) or public.mon_niveau('absences') >= 3);
create policy "absences_sejour: supprimer les siens" on public.absences_sejour
  for delete to authenticated
  using ((user_id = auth.uid() and public.mon_niveau('absences') >= 1) or public.mon_niveau('absences') >= 3);

-- absences (table héritée, remplacée par absences_sejour ; supprimée en P3).
-- Lecture seule, le temps de la conserver.
create policy "absences: lecture intendance absences" on public.absences
  for select to authenticated
  using (user_id = auth.uid() or public.mon_niveau('absences') >= 2);

-- ════════════════════════════════════════════════════════════════════════════
-- 7. SECTION « infos » — rubriques Administratif
-- ════════════════════════════════════════════════════════════════════════════
create policy "admin_sections: lecture section infos" on public.admin_sections
  for select to authenticated using (public.mon_niveau('infos') >= 1);
create policy "admin_sections: ecriture gestion infos" on public.admin_sections
  for all to authenticated
  using (public.mon_niveau('infos') >= 3)
  with check (public.mon_niveau('infos') >= 3);

-- ════════════════════════════════════════════════════════════════════════════
-- 8. Réglages et listes transverses
-- ════════════════════════════════════════════════════════════════════════════
-- app_settings : lu par presenceFoyer, repasSemaine et les widgets de verrou.
-- Écriture pour qui gère l'une des sections concernées par un verrou.
create policy "app_settings: lecture connectees" on public.app_settings
  for select to authenticated using (true);
create policy "app_settings: ecriture gestion" on public.app_settings
  for all to authenticated
  using (public.mon_niveau('repas') >= 3 or public.mon_niveau('absences') >= 3
         or public.mon_niveau('comptes') >= 3)
  with check (public.mon_niveau('repas') >= 3 or public.mon_niveau('absences') >= 3
              or public.mon_niveau('comptes') >= 3);

-- select_options_residence : encore lue par profil, admin/foyer et admin/repas.
-- Doublon de places/etages, supprimée en P3.
create policy "select_options_residence: lecture connectees" on public.select_options_residence
  for select to authenticated using (true);
create policy "select_options_residence: ecriture gestion comptes" on public.select_options_residence
  for all to authenticated
  using (public.mon_niveau('comptes') >= 3) with check (public.mon_niveau('comptes') >= 3);

-- select_options_evenement / rappel / recurrence : plus lues par le code.
-- Aucune policy → service_role seul. Tables supprimées en P3.

commit;

-- ════════════════════════════════════════════════════════════════════════════
-- Reste à faire (hors de ce fichier — chacun demande une modification de code)
-- ════════════════════════════════════════════════════════════════════════════
--
-- A. `residentes` : email et date de naissance restent lisibles par toute personne
--    connectée. La RLS ne filtre pas les colonnes ; il faut des GRANT par colonne :
--
--      revoke select on public.residentes from authenticated;
--      grant select (user_id, id, nom, prenom, residence, etage, chambre, place_id,
--                    statut, niveau_repas, niveau_evenements, niveau_absences,
--                    niveau_comptes, niveau_infos, is_super_admin, is_technique)
--        on public.residentes to authenticated;
--
--    Bloqué par trois `select("*")` côté navigateur, qui échoueraient :
--      · src/lib/roles.ts:130      RIGHTS_COLUMNS = "*"  → lister les colonnes de droits
--      · src/app/homePage/page.tsx:156                   → lister les colonnes affichées
--      · src/app/profil/page.tsx:47                      → cas particulier : la personne
--        doit voir SES propres email et date de naissance. L'email est déjà dans la
--        session (session.user.email) ; la date de naissance demande une route /api
--        ou une vue dédiée.
--    Les cinq autres lectures client sélectionnent déjà des colonnes explicites, toutes
--    sans donnée sensible.
--
-- B. `pending_users` : DELETE ouvert en anonyme. Un tiers peut supprimer les lignes
--    d'inscription en attente — nuisance, pas fuite. Corriger en déplaçant le rollback
--    de signupForm.tsx:132,142 dans une route /api sous service_role, puis retirer
--    la policy « pending_users: suppression rollback inscription ».
--
-- C. `createSupabaseServer()` doit passer en clé anon (src/lib/supabaseServer.ts:15).
--    À faire APRÈS avoir vérifié ce fichier en recette : c'est ce basculement qui rend
--    les policies ci-dessus réellement actives pour les routes /api.
