// Un « bloc » du foyer : Résidence 12, Résidence 36, Corail (intendance)…
// Source de vérité : la table `residences`. Ajouter une ligne suffit à faire
// apparaître le bloc partout (encadrés compta / présences / repas, ciblage, accueil).

// 'chambre' : le bloc contient des chambres réparties par étage.
// 'poste'   : le bloc contient des postes sans étage (intendance).
export type ResidenceKind = "chambre" | "poste";

export type CouleurResidence = "amber" | "pink" | "teal" | "blue" | "purple" | "green";

export interface Residence {
    value: string;
    label: string;
    kind: ResidenceKind;
    ordre: number;
    couleur: CouleurResidence;
    is_active: boolean;
}
