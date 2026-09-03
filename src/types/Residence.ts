// Un « bloc » du foyer : Résidence 12, Résidence 36, Corail (intendance)…
// Source de vérité : la table `residences`. Ajouter une ligne suffit à faire
// apparaître le bloc partout (encadrés compta / présences / repas, ciblage, accueil).

// 'chambre' : le bloc contient des chambres réparties par étage.
// 'poste'   : le bloc contient des postes sans étage (intendance).
export type ResidenceKind = "chambre" | "poste";

export type CouleurResidence = "amber" | "pink" | "teal" | "blue" | "purple" | "green";

// --- Où ce bloc apparaît-il ? ------------------------------------------------
//
// Cinq écrans se demandent « ce bloc me concerne-t-il ? ». La réponse était déduite
// de `kind` : un bloc de chambres partout, un bloc de postes nulle part. Les cinq
// bougeaient donc ensemble, alors qu'aucun besoin ne l'impose — un foyer peut vouloir
// un bloc qui compte des repas sans accueillir d'événement, ou l'inverse.
//
// Chaque écran a désormais sa case, portée par le bloc.
//
// ⚠️ Ne PAS ajouter ici la comptabilité, le ciblage de visibilité ni l'Administration :
// ces trois-là listent toujours TOUS les blocs (R-RES-04 / R-RES-05). Les rendre
// décochables ferait disparaître des personnes d'un décompte, ou rendrait inatteignable
// un contenu déjà ciblé.
export type EcranBloc =
    | "intercalaires"       // intercalaires « Événements » de l'accueil
    | "evenements"          // le bloc peut être le LIEU d'un événement
    | "organisation_repas"  // encadré dans l'onglet Organisation des repas
    | "rattachement_repas"  // une option de repas peut lui être imputée (R-OPT-10)
    | "presences";          // le bloc figure dans les présences au foyer (R-RES-09)

export const ECRANS_BLOC: EcranBloc[] = [
    "intercalaires",
    "evenements",
    "organisation_repas",
    "rattachement_repas",
    "presences",
];

export const ECRAN_BLOC_LABEL: Record<EcranBloc, string> = {
    intercalaires: "Intercalaires de l’accueil",
    evenements: "Lieu d’un événement",
    organisation_repas: "Organisation des repas",
    rattachement_repas: "Rattachement compta d’une option",
    presences: "Présences au foyer",
};

export const ECRAN_BLOC_AIDE: Record<EcranBloc, string> = {
    intercalaires: "Le bloc a son onglet en haut de l’accueil.",
    evenements: "Le bloc peut être choisi comme lieu d’un événement.",
    organisation_repas: "Le bloc a son encadré dans l’organisation des services.",
    rattachement_repas: "Une option de repas peut être imputée à ce bloc.",
    presences: "On suit qui dort ici, nuit par nuit.",
};

/** La colonne `residences` qui porte chaque écran. */
export const ECRAN_BLOC_COLONNE: Record<EcranBloc, string> = {
    intercalaires: "ecran_intercalaires",
    evenements: "ecran_evenements",
    organisation_repas: "ecran_organisation_repas",
    rattachement_repas: "ecran_rattachement_repas",
    presences: "ecran_presences",
};

export interface Residence {
    value: string;
    label: string;
    kind: ResidenceKind;
    ordre: number;
    couleur: CouleurResidence;
    is_active: boolean;
    /** Écrans où le bloc apparaît. Voir `EcranBloc`. */
    ecrans: Record<EcranBloc, boolean>;
}
