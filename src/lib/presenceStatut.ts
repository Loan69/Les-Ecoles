// Statut d'une inscription repas.
//
// Depuis la bascule « Non explicite », trois états sont distingués :
//   - "option"       : ligne presences avec un option_id → elle mange cette option
//   - "non"          : ligne presences avec option_id NULL → elle a répondu « Non »
//   - "sans_reponse" : aucune ligne → elle n'a pas encore répondu
//
// L'historique n'ayant pas été repris (aucune ligne n'existait pour les « Non »),
// les repas ANTÉRIEURS à la bascule continuent d'être lus comme avant : pas de ligne = « Non ».
// Voir supabase/presences-non-explicite.sql et la règle R-REPAS-12.

// Date de mise en service (incluse) à partir de laquelle « pas de ligne » = « sans réponse ».
// AVANT cette date, les trois états sont invisibles (tout ce qui n'a pas de ligne s'affiche « Non ») :
// une date placée dans le futur masquerait donc la fonctionnalité jusqu'à ce jour-là.
export const BASCULE_REPONSE_EXPLICITE = "2026-08-03";

export type StatutRepas = "option" | "non" | "sans_reponse";

// Valeur du sélecteur côté résidente / intendance pour l'état « Non » explicite.
export const CHOIX_NON = "non";

export function statutRepas(
  presence: { option_id: string | null } | null | undefined,
  dateKey: string
): StatutRepas {
  if (presence) return presence.option_id ? "option" : "non";
  return dateKey < BASCULE_REPONSE_EXPLICITE ? "non" : "sans_reponse";
}

// Une inscription compte-t-elle un repas à préparer / à facturer ?
export function mangeUnRepas(presence: { option_id: string | null } | null | undefined): boolean {
  return !!presence?.option_id;
}
