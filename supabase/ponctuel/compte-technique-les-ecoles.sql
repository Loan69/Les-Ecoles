-- Le compte d'installation des Écoles devient un compte technique
-- ===============================================================
-- 2026-09-11. **Base « les Écoles » UNIQUEMENT.**
--
-- Les foyers ouverts depuis `scripts/foyer-nouveau.mjs` reçoivent leur compte
-- technique à l'amorçage (étape 3 de `docs/ouvrir-un-foyer.md`). Les Écoles est
-- antérieure à ce script : le compte d'installation y est resté une résidente
-- ordinaire promue administratrice, occupant une vraie chambre — laquelle est en
-- réalité habitée par quelqu'un.
--
-- Ce script aligne ce compte sur ce que `foyer-nouveau.mjs` aurait produit
-- (`scripts/foyer-nouveau.mjs:86-102`) : tous les droits, hors hiérarchie, jamais
-- listé, **et surtout aucune place occupée**.
--
-- ⚠️ RANGÉ DANS `supabase/ponctuel/`, ET NON À LA RACINE DE `supabase/`.
--    L'ouverture d'un foyer rejoue tous les `.sql` de la racine dans l'ordre
--    alphabétique (`docs/ouvrir-un-foyer.md`, §2). Ce script-ci ne vaut que pour
--    une base précise et n'a rien à faire dans ce parcours.
--
-- Retour arrière : `supabase/rollback/compte-technique-les-ecoles.sql`. La PARTIE 2
-- affiche l'ordre de restauration **déjà rempli** avec les valeurs d'avant — le
-- copier quelque part avant de fermer l'onglet.
--
-- À passer dans l'éditeur SQL de Supabase, projet des Écoles.


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 1 — DIAGNOSTIC. Lecture seule. **La sélectionner et l'exécuter SEULE.**
-- ════════════════════════════════════════════════════════════════════════════
-- Elle répond à quatre questions, dans l'ordre où elles comptent :
--   · suis-je sur la bonne base ?          (ligne « foyer »)
--   · quel compte vais-je transformer ?    (lignes « compte ciblé »)
--   · quelle place vais-je libérer ?       (ligne « place occupée »)
--   · qu'est-ce que ce compte emporte ?    (lignes « données »)

select 'foyer' as info,
       coalesce((select value from public.app_settings where key = 'foyer_nom'), '(non réglé)') as valeur
union all
select 'compte ciblé',
       coalesce((select prenom || ' ' || nom || '  <' || coalesce(email, 'sans email') || '>'
                 from public.residentes where email = 'loandervillers@gmail.com'),
                '✖ AUCUN COMPTE AVEC CET EMAIL — corriger l''adresse dans la PARTIE 2')
union all
select 'compte ciblé · état',
       coalesce((select 'statut ' || statut
                      || ' · technique ' || is_technique
                      || ' · super-admin ' || is_super_admin
                      || ' · niveaux ' || niveau_repas || niveau_evenements || niveau_absences
                                       || niveau_comptes || niveau_infos
                 from public.residentes where email = 'loandervillers@gmail.com'), '—')
union all
select 'place occupée',
       coalesce((select coalesce(p.label, p.code) || '  (bloc ' || p.residence
                      || coalesce(' · étage ' || p.etage, '') || ')'
                 from public.residentes r join public.places p on p.id = r.place_id
                 where r.email = 'loandervillers@gmail.com'),
                'aucune — rien à libérer')
union all
select 'autres comptes techniques',
       coalesce((select string_agg(email, ', ') from public.residentes
                 where is_technique and email is distinct from 'loandervillers@gmail.com'),
                'aucun ✓')
union all
select 'données · repas enregistrés',
       (select count(*)::text from public.presences
        where user_id = (select user_id from public.residentes where email = 'loandervillers@gmail.com'))
union all
select 'données · absences déclarées',
       (select count(*)::text from public.absences_sejour
        where user_id = (select user_id from public.residentes where email = 'loandervillers@gmail.com'))
union all
select 'données · événements créés',
       (select count(*)::text from public.evenements
        where user_id = (select user_id from public.residentes where email = 'loandervillers@gmail.com'))
union all
select 'données · groupes',
       coalesce((select string_agg(g.nom, ', ') from public.groupe_membres gm
                 join public.groupes g on g.id = gm.groupe_id
                 where gm.user_id = (select user_id from public.residentes
                                     where email = 'loandervillers@gmail.com')), 'aucun');

-- ⚠️ « repas enregistrés » et « absences déclarées » non nuls méritent une pause.
--    Un compte technique est retiré des listes d'intendance **à la source**
--    (`.eq("is_technique", false)`, p. ex. `src/app/admin/repas/page.tsx:85`) : ces
--    lignes-là sortiront des décomptes, y compris sur les périodes passées. Si ce
--    sont des repas de test, tant mieux ; s'il y a de la vraie compta dedans, la
--    supprimer d'abord explicitement plutôt que de la laisser disparaître en
--    silence. Les événements créés, eux, ne bougent pas.


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 2 — MIGRATION. **Vérifier les deux constantes ci-dessous d'abord.**
-- ════════════════════════════════════════════════════════════════════════════
-- Tout est dans une seule transaction implicite : si un garde-fou se déclenche,
-- rien n'est écrit.

do $$
declare
  -- ── À RENSEIGNER ────────────────────────────────────────────────────────────
  -- Le nom du foyer, recopié de la ligne « foyer » de la PARTIE 1. C'est le
  -- garde-fou contre la mauvaise base : les deux projets Supabase se ressemblent
  -- et la même adresse email existe sur les deux.
  --
  -- Si la PARTIE 1 affiche « (non réglé) » — les Écoles est antérieure à
  -- `p2-identite-foyer.sql` —, régler d'abord le nom du foyer depuis
  -- Administration → Identité du foyer. Le faire ici évite d'avoir à inventer un
  -- autre garde-fou, et c'est de toute façon un réglage qui manque.
  v_foyer_attendu constant text := 'Foyer des Écoles';
  v_email         constant text := 'loandervillers@gmail.com';
  -- ────────────────────────────────────────────────────────────────────────────

  v_foyer_reel text;
  v_nb         int;
  v_user       uuid;
  v_avant      public.residentes%rowtype;
  v_place      text;
begin
  -- 1. Bonne base ?
  select value into v_foyer_reel from public.app_settings where key = 'foyer_nom';
  if v_foyer_reel is distinct from v_foyer_attendu then
    raise exception
      'MAUVAISE BASE (ou nom inattendu). Ce projet s''appelle %, et le script attend %. Rien n''a été modifié.',
      coalesce(quote_literal(v_foyer_reel), 'NULL'), quote_literal(v_foyer_attendu);
  end if;

  -- 2. Un seul compte visé, et il existe.
  select count(*) into v_nb from public.residentes where email = v_email;
  if v_nb <> 1 then
    raise exception '% compte(s) avec l''adresse % — il en faut exactement un. Rien n''a été modifié.', v_nb, v_email;
  end if;

  select * into v_avant from public.residentes where email = v_email;
  v_user := v_avant.user_id;

  -- 3. Pas déjà un autre compte technique : le rôle est unique par foyer
  --    (`scripts/foyer-nouveau.mjs:68` refuse de se rejouer pour la même raison).
  select count(*) into v_nb from public.residentes where is_technique and user_id <> v_user;
  if v_nb > 0 then
    raise exception 'Ce foyer a déjà % compte(s) technique(s). Rien n''a été modifié.', v_nb;
  end if;

  -- 4. De quoi refaire le chemin en sens inverse.
  select coalesce(p.label, p.code) into v_place from public.places p where p.id = v_avant.place_id;
  raise notice ' ';
  raise notice '── AVANT ────────────────────────────────────────────────';
  raise notice '  % % <%>', v_avant.prenom, v_avant.nom, v_avant.email;
  raise notice '  place : %', coalesce(v_place || ' (' || coalesce(v_avant.chambre, '?') || ')', 'aucune');
  raise notice ' ';
  raise notice '── ORDRE DE RESTAURATION — à conserver ───────────────────';
  raise notice '%', format(
    'update public.residentes set is_technique = %L, is_super_admin = %L, place_id = %L, residence = %L, etage = %L, chambre = %L, niveau_repas = %L, niveau_evenements = %L, niveau_absences = %L, niveau_comptes = %L, niveau_infos = %L where user_id = %L;',
    v_avant.is_technique, v_avant.is_super_admin, v_avant.place_id,
    v_avant.residence, v_avant.etage, v_avant.chambre,
    v_avant.niveau_repas, v_avant.niveau_evenements, v_avant.niveau_absences,
    v_avant.niveau_comptes, v_avant.niveau_infos, v_user);
  raise notice ' ';

  -- 5. La transformation.
  --
  --    `is_admin` n'est PAS touchée : c'est un miroir dérivé, tenu par le trigger
  --    `trg_residentes_sync_is_admin`. L'écrire à la main la désynchroniserait.
  --
  --    `statut` reste 'active' : un compte technique archivé ne pourrait plus se
  --    connecter, et c'est la seule clé de secours du foyer.
  --
  --    `place_id = null` libère la chambre. L'index unique partiel
  --    `residentes_one_active_per_place` la rend aussitôt attribuable à sa vraie
  --    occupante — depuis Administration → Comptes & chambres, pas ici.
  update public.residentes set
    is_technique     = true,
    is_super_admin   = true,
    niveau_repas     = 3,
    niveau_evenements = 3,
    niveau_absences  = 3,
    niveau_comptes   = 3,
    niveau_infos     = 3,
    place_id  = null,
    residence = null,
    etage     = null,
    chambre   = null
  where user_id = v_user;

  raise notice '── APRÈS ─────────────────────────────────────────────────';
  raise notice '  compte technique · tous droits · hors listes · sans place';
  raise notice '  chambre « % » libérée', coalesce(v_place, '(aucune)');
  raise notice ' ';
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 3 — VÉRIFICATION. Lecture seule.
-- ════════════════════════════════════════════════════════════════════════════
select prenom, nom, email, statut, is_technique, is_super_admin,
       place_id, residence, etage, chambre,
       niveau_repas, niveau_evenements, niveau_absences, niveau_comptes, niveau_infos
from public.residentes
where email = 'loandervillers@gmail.com';

-- Attendu : is_technique t · is_super_admin t · les quatre colonnes de place à NULL
--           · les cinq niveaux à 3.


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 4 — RENOMMAGE. Ajoutée le 2026-09-11, APRÈS le passage de la PARTIE 2.
-- ════════════════════════════════════════════════════════════════════════════
-- Le compte s'appelait encore « loan admin », son identité de résidente. Les foyers
-- ouverts depuis `scripts/foyer-nouveau.mjs` reçoivent « Compte technique » (ses
-- valeurs par défaut, lignes 33-34) : les Écoles s'aligne.
--
-- Ce nom est ce que voit la personne connectée dans son onglet **Profil**. Il n'
-- apparaît nulle part ailleurs — le compte technique est exclu de toutes les listes
-- (`R-CPT-08`).
--
-- ⚠️ NE PAS REJOUER LA PARTIE 2 pour autant : elle afficherait un ordre de
-- restauration fabriqué à partir de l'état DÉJÀ migré, qui ne restaure plus rien.
-- C'est la ligne du premier passage qui vaut. Cette partie-ci se suffit à elle-même,
-- et se rejoue sans dommage.

do $$
declare
  v_foyer_attendu constant text := 'Foyer des Écoles';  -- même garde-fou qu'en PARTIE 2
  v_email         constant text := 'loandervillers@gmail.com';
  v_foyer_reel text;
  v_nb int;
  v_avant text;
begin
  select value into v_foyer_reel from public.app_settings where key = 'foyer_nom';
  if v_foyer_reel is distinct from v_foyer_attendu then
    raise exception 'MAUVAISE BASE : ce projet s''appelle %, le script attend %. Rien n''a été modifié.',
      coalesce(quote_literal(v_foyer_reel), 'NULL'), quote_literal(v_foyer_attendu);
  end if;

  -- Le compte doit DÉJÀ être technique : ce renommage suit la PARTIE 2, il ne la
  -- remplace pas. Renommer une résidente ordinaire « Compte technique » serait le
  -- pire des deux mondes — un nom qui ment sur des droits qu'elle n'a pas.
  select count(*) into v_nb from public.residentes where email = v_email and is_technique;
  if v_nb <> 1 then
    raise exception 'Aucun compte technique avec l''adresse % — passer la PARTIE 2 d''abord. Rien n''a été modifié.', v_email;
  end if;

  -- Relevé AVANT l'update : le lire après ferait annoncer « était Compte technique ».
  select prenom || ' ' || nom into v_avant from public.residentes where email = v_email;

  update public.residentes
     set prenom = 'Compte', nom = 'technique'
   where email = v_email and is_technique;

  raise notice 'Renommé « % » → « Compte technique ».', v_avant;
end $$;

select prenom, nom, email, is_technique from public.residentes where email = 'loandervillers@gmail.com';
