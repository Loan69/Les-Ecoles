# Patchs historiques

Ces fichiers ont construit le schéma entre octobre 2025 et août 2026, un par
évolution. Ils sont **tous appliqués** et **tous contenus** dans
`../20260824000000_socle.sql`, qui les remplace.

Ils sont conservés pour une seule raison : leurs commentaires expliquent le
*pourquoi* de chaque décision de modèle — ce qu'un dump de schéma ne dit pas.
`lot3-p0-schema.sql` raconte le passage aux places, `roles-sections.sql` le
passage aux 5 sections, `blocs-dynamiques.sql` la sortie des blocs codés en dur.

**Ne pas les rejouer.** Certains sont des migrations de données à sens unique,
propres au Foyer des Écoles (`lot3-migrate-residentes.sql`,
`lot3-seed-chambres.sql`), et n'ont aucun sens sur un autre foyer.

Pour monter un foyer neuf, voir `docs/conception-multi-foyers.md` §4.

## Deuxième vague — les migrations du multi-foyer (2026-08-24)

`p2-identite-foyer`, `p2b-identite-admin`, `p2c-super-admin-sans-place`,
`p2d-icone-foyer`, `p2e-retrait-couleur`, `p3-nettoyage` sont **toutes contenues**
dans `20260824120000_socle.sql`, régénéré après leur passage sur les deux foyers.

Elles restent ici pour la même raison que les précédentes : leurs commentaires
expliquent le *pourquoi*. `p2d` dit pourquoi une icône n'est pas un logo réduit,
`p2e` pourquoi un réglage de couleur promettait un thème inexistant, `p3` pourquoi
`select_options_evenement` et `_rappel` ont été **conservées** là où
`select_options_residence` partait.

**Ne pas les rejouer** : le socle suffit.
