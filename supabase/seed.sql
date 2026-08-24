-- ════════════════════════════════════════════════════════════════════════════
-- Seed — contenu d'un foyer VIERGE
-- ════════════════════════════════════════════════════════════════════════════
--
-- À jouer une fois, après la migration de socle, sur un projet Supabase neuf.
-- Idempotent : réexécutable sans créer de doublon.
--
-- Ce qu'il crée : le strict minimum sans lequel l'application ne démarre pas.
-- Ce qu'il NE crée PAS, à dessein — c'est à l'intendance de le saisir depuis
-- l'onglet Administration, et cette saisie est le paramétrage du foyer :
--   · residences (les blocs)      · etages       · places (chambres et postes)
--   · groupes                     · meal_options · meal_service_options
--
-- Le compte technique n'est pas ici : créer un utilisateur avec un mot de passe
-- valide passe par l'API d'authentification, pas par SQL.
--   → node scripts/foyer-nouveau.mjs

-- ── Réglages ────────────────────────────────────────────────────────────────
-- Les trois verrous, avec leurs valeurs par défaut. Modifiables ensuite depuis
-- les écrans « Options de repas » et « Présence au foyer ».
-- `where not exists` plutôt que `on conflict` : rien ne garantit un index unique
-- sur app_settings.key, et ON CONFLICT échouerait sans lui.
insert into public.app_settings (key, value, label)
select v.key, v.value, v.label
from (values
  ('verrouillage_repas',   '09:00', 'Heure après laquelle les repas du jour ne sont plus modifiables'),
  ('verrouillage_foyer',   '23:00', 'Heure limite pour modifier la présence au foyer'),
  ('verrouillage_weekend', 'true',  'Verrouille les repas du week-end dès le vendredi')
) as v(key, value, label)
where not exists (
  select 1 from public.app_settings s where s.key = v.key
);

-- ── Identité du foyer ───────────────────────────────────────────────────────
-- Voir supabase/p2-identite-foyer.sql, qui porte aussi la policy de lecture
-- publique associée : ces valeurs doivent être lisibles AVANT toute connexion.
insert into public.app_settings (key, value, label)
select v.key, v.value, v.label
from (values
  ('foyer_nom',         'Foyer',  'Nom complet du foyer (titre de l''onglet, emails)'),
  ('foyer_nom_court',   'Foyer',  'Nom court (écran d''accueil du téléphone)'),
  ('foyer_description', 'Espace des résidentes et des invitées', 'Phrase de présentation'),
  ('foyer_couleur',     '#004AAD', 'Couleur principale (barre du navigateur, écran d''accueil)'),
  ('foyer_logo_url',    '',        'Adresse du logo. Vide = le nom du foyer s''affiche en toutes lettres'),
  ('foyer_icone_url',   '',        'Icône de l''application installée. Carrée et sur fond opaque, distincte du logo'),
  ('foyer_fuseau',      'Europe/Paris', 'Fuseau horaire de référence pour les heures de verrouillage'),
  ('foyer_locale',      'fr-FR',   'Format des dates et des heures')
) as v(key, value, label)
where not exists (
  select 1 from public.app_settings s where s.key = v.key
);

-- ── Rubriques de l'onglet Administratif ─────────────────────────────────────
-- Créées vides : chaque foyer y met son propre contenu. Les deux modes
-- opératoires sont ajoutés séparément (scripts/docs/md2tiptap.mjs).
insert into public.admin_sections (title, type, position, content, updated_at)
select v.title, v.type, v.position, v.content::jsonb, now()
from (values
  ('Informations générales', 'richtext', 0, '{"type":"doc","content":[{"type":"paragraph"}]}'),
  ('Horaires',               'richtext', 1, '{"type":"doc","content":[{"type":"paragraph"}]}'),
  ('Règlement du foyer',     'richtext', 2, '{"type":"doc","content":[{"type":"paragraph"}]}'),
  ('Contacts',               'contacts', 3, '{"contacts":[]}')
) as v(title, type, position, content)
where not exists (
  select 1 from public.admin_sections a where a.title = v.title
);
