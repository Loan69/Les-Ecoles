"use client";

import { IDENTITE_DEFAUT } from "@/lib/foyer";

// --- Format des dates, en un seul endroit ----------------------------------
//
// Le format venait de 15 chaînes `"fr-FR"` disséminées dans 8 écrans. Le réglage
// `foyer_locale` existait sans que rien ne le lise : impossible de changer le format
// d'un foyer sans repasser sur chaque fichier — exactement le genre de valeur figée
// que le passage au multi-foyer devait supprimer.
//
// **Réservé au navigateur** (`"use client"`), et c'est essentiel : une variable de
// module est partagée par toutes les requêtes d'un même processus serveur. Côté
// serveur, elle mélangerait les foyers. Dans un onglet, elle appartient à une seule
// personne, donc à un seul foyer.
//
// Les fonctions de formatage des écrans vivent hors composant (elles sont appelées
// au rendu) : elles ne peuvent pas lire un contexte React. D'où ce réglage posé une
// fois par `Providers`, à partir de l'identité du foyer.

let courante: string = IDENTITE_DEFAUT.locale;

/** Appelé par `Providers` au montage. Ne pas appeler ailleurs. */
export function definirLocale(locale: string | null | undefined): void {
  if (locale && locale.trim()) courante = locale.trim();
}

/** Locale à passer à `toLocaleDateString` / `Intl.DateTimeFormat`. */
export function localeDate(): string {
  return courante;
}
