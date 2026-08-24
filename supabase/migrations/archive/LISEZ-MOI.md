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
