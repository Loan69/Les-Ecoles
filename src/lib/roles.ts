// Hiérarchie de droits des utilisatrices (résidentes).
// Voir supabase/roles-niveaux.sql pour le modèle en base.

export const NIVEAU = {
  RESIDENTE: 1, // aucun droit admin (résidentes et invitées)
  ADMIN_VIEW: 2, // admin en lecture seule
  ADMIN_EDIT: 3, // admin avec droits de modification
  SUPER: 4, // super-admin : édition + réglage des niveaux des autres
} as const;

export type Niveau = 1 | 2 | 3 | 4;

export const NIVEAU_LABEL: Record<Niveau, string> = {
  1: "Résidente",
  2: "Admin — lecture",
  3: "Admin — édition",
  4: "Super-admin",
};

// Ordre d'affichage pour un sélecteur segmenté.
export const NIVEAUX: Niveau[] = [1, 2, 3, 4];

export function asNiveau(n: number | null | undefined): Niveau {
  return n === 2 || n === 3 || n === 4 ? n : 1;
}

// Le compte technique caché (is_technique) a tous les droits, hors hiérarchie.
export function canView(niveau: number, isTechnique = false): boolean {
  return isTechnique || niveau >= NIVEAU.ADMIN_VIEW;
}
export function canEdit(niveau: number, isTechnique = false): boolean {
  return isTechnique || niveau >= NIVEAU.ADMIN_EDIT;
}
export function canManageRoles(niveau: number, isTechnique = false): boolean {
  return isTechnique || niveau >= NIVEAU.SUPER;
}
