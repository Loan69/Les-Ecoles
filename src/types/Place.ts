// Lot 3 — Places : chambres (résidences 12/36) et postes (corail, intendance).
// L'occupation n'est pas stockée : elle est déduite d'un compte résidente actif.

export type PlaceKind = "chambre" | "poste";

export interface Place {
  id: string;
  residence: string; // "12" | "36" | "corail"
  kind: PlaceKind;
  etage: string | null; // renseigné pour les chambres, null pour les postes
  code: string; // code chambre (ex. grand_palais) ou libellé de poste (ex. Cuisine)
  label: string | null; // libellé affiché (sinon dérivé de code)
  is_active: boolean;
  created_at?: string;
}

export interface PlaceOccupant {
  user_id: string;
  nom: string;
  prenom: string;
}

export interface PlacePendingInvite {
  email: string;
  expires_at: string;
}

// Place enrichie de son état d'occupation (renvoyée par l'API admin).
export interface PlaceWithStatus extends Place {
  occupant: PlaceOccupant | null;
  invitation: PlacePendingInvite | null;
}
