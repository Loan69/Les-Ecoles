// Droits par SECTION de l'appli (voir supabase/roles-sections.sql).

export type Section = "repas" | "evenements" | "absences" | "comptes" | "infos";

export const SECTIONS: Section[] = ["repas", "evenements", "absences", "comptes", "infos"];

export const SECTION_LABEL: Record<Section, string> = {
  repas: "Repas",
  evenements: "Événements",
  absences: "Absences",
  comptes: "Comptes",
  infos: "Infos pratiques",
};

// Niveau par section : 1 Aucun · 2 Lecture · 3 Édition
export const NIV = { AUCUN: 1, LECTURE: 2, EDITION: 3 } as const;
export type NiveauSection = 1 | 2 | 3;
export const NIVEAU_LABEL: Record<NiveauSection, string> = {
  1: "Aucun",
  2: "Lecture",
  3: "Édition",
};
export const NIVEAUX_SECTION: NiveauSection[] = [1, 2, 3];

// Ce que chaque niveau donne concrètement, section par section.
// Affiché sous le sélecteur du panneau « Droits » : « Aucun » ne veut jamais dire
// « ne voit rien » — une résidente garde toujours sa vue normale (R-NIV-10).
export const SECTION_AIDE: Record<Section, string> = {
  repas: "Aucun = s'inscrire à ses repas · Lecture = voir les inscriptions et la compta · Édition = paramétrer les repas et corriger les inscriptions",
  evenements: "Aucun = voir les événements et les rappels · Lecture = voir en plus les inscrits aux événements et ceux réservés au staff · Édition = créer et modifier les événements",
  absences: "Aucun = déclarer ses propres absences · Lecture = voir les présences de tout le foyer · Édition = marquer les absences des autres",
  comptes: "Aucun = voir son profil · Lecture = voir les comptes et les chambres · Édition = inviter, déplacer et archiver",
  infos: "Aucun = lire les rubriques Administratif · Lecture = idem · Édition = créer et modifier les rubriques",
};

export function asNiveauSection(n: number | null | undefined): NiveauSection {
  return n === 2 ? 2 : n === 3 ? 3 : 1;
}

// Droits d'une personne : un niveau par section + rôles globaux.
export type Rights = {
  repas: number;
  evenements: number;
  absences: number;
  comptes: number;
  infos: number;
  is_super_admin: boolean;
  is_technique: boolean;
};

export const EMPTY_RIGHTS: Rights = {
  repas: 1, evenements: 1, absences: 1, comptes: 1, infos: 1,
  is_super_admin: false, is_technique: false,
};

// Le super-admin (et le compte technique) ont tous les droits, hors hiérarchie de sections.
export function isSuperAdmin(r: Rights): boolean {
  return r.is_super_admin || r.is_technique;
}
export function canViewSection(r: Rights, s: Section): boolean {
  return isSuperAdmin(r) || (r[s] ?? 1) >= NIV.LECTURE;
}
export function canEditSection(r: Rights, s: Section): boolean {
  return isSuperAdmin(r) || (r[s] ?? 1) >= NIV.EDITION;
}
// A un accès admin quelconque (au moins lecture sur une section, ou super/technique).
export function hasAnyAdmin(r: Rights): boolean {
  return isSuperAdmin(r) || SECTIONS.some((s) => (r[s] ?? 1) >= NIV.LECTURE);
}

// Construit un objet Rights depuis une ligne `residentes`.
// Rétro-compatible : si les colonnes par section n'existent pas encore
// (migration roles-sections.sql non appliquée), retombe sur l'ancien `niveau` global (1..4).
export function rightsFromRow(row: Partial<Record<string, unknown>> | null | undefined): Rights {
  if (!row) return EMPTY_RIGHTS;
  const is_technique = !!row.is_technique;
  const hasSections = row.niveau_repas !== undefined && row.niveau_repas !== null;

  if (hasSections) {
    const n = (k: string) => asNiveauSection(Number(row[`niveau_${k}`]));
    return {
      repas: n("repas"),
      evenements: n("evenements"),
      absences: n("absences"),
      comptes: n("comptes"),
      infos: n("infos"),
      is_super_admin: !!row.is_super_admin,
      is_technique,
    };
  }

  // Ancien schéma : niveau global 1..4 recopié sur toutes les sections ; 4 → super-admin.
  const g = Number(row.niveau ?? 1);
  const lvl = asNiveauSection(Math.min(Math.max(g, 1), 3));
  return { repas: lvl, evenements: lvl, absences: lvl, comptes: lvl, infos: lvl, is_super_admin: g >= 4, is_technique };
}

// Colonnes à lire pour reconstituer les droits.
// « * » : on lit toutes les colonnes pour être tolérant au schéma (avant/après migration).
export const RIGHTS_COLUMNS = "*";
