// --- Catégories d'événement et délais de rappel ------------------------------
//
// Ces deux listes vivaient dans les tables `select_options_evenement` et
// `select_options_rappel`, remplies à la main sur le premier foyer. Un foyer neuf
// héritait des tables **vides** : plus aucun type d'événement à choisir, et comme la
// catégorie est obligatoire, **plus aucun événement créable**. C'est exactement ce
// qui est arrivé au second foyer.
//
// Elles reviennent donc dans le code, pour trois raisons :
//
//   1. elles ne sont configurables **nulle part** dans l'application — aucun écran
//      ne les édite. Les laisser en base ne donnait donc aucune souplesse réelle,
//      seulement une occasion de les oublier ;
//   2. la valeur `intendance` **porte un comportement** : un événement de cette
//      catégorie affiche « Fait » au lieu de « Je participe »
//      (`ConfirmationToggle.tsx`). Une liste librement modifiable pouvait donc
//      casser une fonction, en silence ;
//   3. un délai de rappel n'a rien de propre à un foyer.
//
// Les `value` sont celles déjà enregistrées dans `evenements.category` : l'historique
// du premier foyer reste lisible.

export type OptionEvenement = { value: string; label: string };

export const CATEGORIES_EVENEMENT: OptionEvenement[] = [
  { value: "anniversaire", label: "Anniversaire / Festivité" },
  { value: "formation", label: "Formation / Conférence" },
  // Ne pas renommer cette valeur sans corriger ConfirmationToggle.tsx.
  { value: "intendance", label: "Intendance" },
  { value: "autre", label: "Autre" },
];

/** Catégorie dont les confirmations se lisent « Fait » plutôt que « Je participe ». */
export const CATEGORIE_INTENDANCE = "intendance";

export const DELAIS_RAPPEL: OptionEvenement[] = [
  { value: "0", label: "Aucun rappel" },
  { value: "1", label: "Rappel 1 jour avant" },
  { value: "2", label: "Rappel 2 jours avant" },
  { value: "3", label: "Rappel 3 jours avant" },
  { value: "4", label: "Rappel 4 jours avant" },
];
