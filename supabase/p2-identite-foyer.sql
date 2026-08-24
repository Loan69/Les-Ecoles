-- ════════════════════════════════════════════════════════════════════════════
-- P2 — Identité du foyer
-- ════════════════════════════════════════════════════════════════════════════
--
-- Sort de `layout.tsx`, `public/manifest.json` et `signin/page.tsx` tout ce qui
-- nommait « Les Écoles ». Chaque foyer se décrit désormais lui-même, en base.
-- Idempotent. À jouer sur CHAQUE foyer (il est aussi intégré à seed.sql).

begin;

-- ── Réglages d'identité ─────────────────────────────────────────────────────
-- Valeurs neutres : un foyer neuf s'affiche correctement avant même d'être
-- personnalisé. Modifiables ensuite depuis Administration.
insert into public.app_settings (key, value, label)
select v.key, v.value, v.label
from (values
  ('foyer_nom',         'Foyer',  'Nom complet du foyer (titre de l''onglet, emails)'),
  ('foyer_nom_court',   'Foyer',  'Nom court (écran d''accueil du téléphone)'),
  ('foyer_description', 'Espace des résidentes et des invitées', 'Phrase de présentation'),
  ('foyer_couleur',     '#004AAD', 'Couleur principale (barre du navigateur, écran d''accueil)'),
  ('foyer_logo_url',    '',        'Adresse du logo. Vide = le nom du foyer s''affiche en toutes lettres'),
  ('foyer_fuseau',      'Europe/Paris', 'Fuseau horaire de référence pour les heures de verrouillage'),
  ('foyer_locale',      'fr-FR',   'Format des dates et des heures')
) as v(key, value, label)
where not exists (
  select 1 from public.app_settings s where s.key = v.key
);

-- ── Lecture publique de la seule identité ───────────────────────────────────
-- L'écran de connexion et le manifeste de l'application web doivent afficher le
-- nom et le logo du foyer AVANT toute connexion. On n'ouvre donc en anonyme que
-- les clés `foyer_*` — les heures de verrouillage restent réservées aux comptes.
--
-- `starts_with` plutôt que `like 'foyer_%'` : dans un LIKE, le tiret bas est un
-- joker, « foyerX » passerait.
drop policy if exists "app_settings: identite lisible publiquement" on public.app_settings;
create policy "app_settings: identite lisible publiquement" on public.app_settings
  for select to anon using (starts_with(key, 'foyer_'));

commit;
