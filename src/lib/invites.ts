// Carnet d'invités repas.
//
// Un invité n'a pas toujours de nom **et** de prénom : on connaît souvent l'un des deux
// (« la sœur de Marie », « M. Dupont »). Un seul des deux suffit donc, partout — à la
// saisie comme à l'affichage : c'est cette fonction qui évite les « Dupont &nbsp; » et
// les espaces orphelins quand l'autre champ est vide.

export type InviteNom = { nom?: string | null; prenom?: string | null };

export function nomInvite(i: InviteNom): string {
  return [i.nom?.trim(), i.prenom?.trim()].filter(Boolean).join(" ") || "Invité";
}

// Au moins un des deux champs : la règle de validation, côté écran comme côté serveur.
export function nomInviteManquant(nom?: string | null, prenom?: string | null): boolean {
  return !(nom ?? "").trim() && !(prenom ?? "").trim();
}
