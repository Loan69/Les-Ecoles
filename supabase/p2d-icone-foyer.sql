-- ════════════════════════════════════════════════════════════════════════════
-- P2d — Une icône d'application distincte du logo
-- ════════════════════════════════════════════════════════════════════════════
--
-- Le manifeste réutilisait `foyer_logo_url` comme icône d'écran d'accueil. Deux
-- défauts, constatés sur téléphone :
--
--   · un logo d'en-tête est presque toujours TRANSPARENT ; iOS et Android
--     composent la transparence sur du NOIR — d'où une icône à fond noir ;
--   · un logo est large (celui des Écoles fait 2,6:1) ; comprimé dans un carré,
--     son texte devient illisible à 180 px.
--
-- Une icône est un objet différent : carrée, opaque, et souvent réduite à la
-- marque plutôt qu'au logotype complet. Elle mérite donc son propre réglage.
-- Idempotent. À jouer sur chaque foyer.

begin;

insert into public.app_settings (key, value, label)
select v.key, v.value, v.label
from (values
  ('foyer_icone_url', '',
   'Icône de l''application installée sur téléphone. Carrée et sur fond opaque — sans quoi elle s''affiche sur fond noir.')
) as v(key, value, label)
where not exists (
  select 1 from public.app_settings s where s.key = v.key
);

commit;
