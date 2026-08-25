-- ════════════════════════════════════════════════════════════════════════════
-- Les listes d'options d'événement reviennent dans le code
-- ════════════════════════════════════════════════════════════════════════════
--
-- À passer APRÈS le déploiement. Idempotent.
--
-- `select_options_evenement` (types d'événement) et `select_options_rappel`
-- (délais de rappel) étaient remplies à la main sur le premier foyer. Un foyer neuf
-- héritait des tables **vides** : plus aucun type à choisir — et comme la catégorie
-- est obligatoire, **plus aucun événement créable**. C'est arrivé au second foyer.
--
-- Le fichier p3-nettoyage.sql les disait « listes de configuration propres à chaque
-- foyer ». C'était faux : **aucun écran ne les édite**. Elles ne donnaient donc pas
-- de souplesse, seulement une occasion de les oublier. Et la valeur `intendance`
-- porte un comportement (les confirmations s'y lisent « Fait » et non « Je
-- participe ») : une liste librement modifiable pouvait casser une fonction.
--
-- Elles vivent désormais dans src/lib/evenementOptions.ts. Les `value` sont
-- inchangées : l'historique de `evenements.category` reste lisible.

begin;

drop table if exists public.select_options_evenement;
drop table if exists public.select_options_rappel;

commit;
