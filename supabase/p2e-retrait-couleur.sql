-- ════════════════════════════════════════════════════════════════════════════
-- P2e — Retrait du réglage de couleur
-- ════════════════════════════════════════════════════════════════════════════
--
-- `foyer_couleur` promettait un thème qui n'existe pas : elle n'alimentait que le
-- `theme_color` du manifeste — la barre du navigateur sur Android et l'écran de
-- démarrage de l'application installée. Les boutons, titres et bandeaux sont des
-- classes Tailwind écrites en dur dans une centaine d'endroits : changer ce
-- réglage ne modifiait rien de visible, ce qui déroutait plus que ça n'aidait.
--
-- La teinte est désormais la constante COULEUR_APPLI de src/lib/foyer.ts.
-- Le jour où l'interface passera à des variables CSS, le réglage pourra revenir.
--
-- Idempotent. Sans effet si la clé n'existe pas.

delete from public.app_settings where key = 'foyer_couleur';
