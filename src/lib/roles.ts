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

// Niveau par section : 0 Aucun · 1 Utilisateur · 2 Lecture · 3 Édition
//   0 Aucun       — la section n'existe pas pour cette personne : onglet masqué,
//                   page inaccessible, carte correspondante retirée de l'accueil.
//   1 Utilisateur — usage normal de résidente (l'ancien « Aucun »).
//   2 Lecture     — consulte l'écran d'intendance.
//   3 Édition     — modifie.
// Le niveau 0 a été ajouté en 2026-08-03 SANS renuméroter les autres : les droits
// déjà attribués gardent leur sens, aucune donnée à migrer.
export const NIV = { AUCUN: 0, UTILISATEUR: 1, LECTURE: 2, EDITION: 3 } as const;
export type NiveauSection = 0 | 1 | 2 | 3;
// Les deux niveaux d'administration le disent : sans cela l'échelle se lit mal — « Utilisateur »
// semblait donner PLUS de droits que « Lecture », alors qu'il désigne l'usage ordinaire
// d'une habitante sur ses propres données, et « Lecture » l'accès à celles de tout le foyer.
export const NIVEAU_LABEL: Record<NiveauSection, string> = {
  0: "Masquée",
  1: "Habitante",
  2: "Admin · consulter",
  3: "Admin · gérer",
};

// Une ligne sous chaque niveau, dans le panneau « Droits » : ce que le mot recouvre,
// indépendamment de la section.
export const NIVEAU_AIDE: Record<NiveauSection, string> = {
  0: "la section n'apparaît pas du tout",
  1: "usage normal : ses propres données",
  2: "voit les données de tout le foyer",
  3: "modifie les données de tout le foyer",
};
export const NIVEAUX_SECTION: NiveauSection[] = [0, 1, 2, 3];

// « Comptes » n'a pas de page côté habitante (le ⚙️ Administration est déjà masqué
// en dessous de « Admin · consulter ») : « Masquée » y serait indiscernable
// d'« Habitante », on ne le propose pas.
export function niveauxPourSection(s: Section): NiveauSection[] {
  return s === "comptes" ? [1, 2, 3] : NIVEAUX_SECTION;
}

// Ce que chaque niveau donne concrètement, section par section.
// Affiché sous le sélecteur du panneau « Droits ». Voir R-NIV-10 / R-NIV-11.
export const SECTION_AIDE: Record<Section, string> = {
  repas: "Masquée = onglet Repas caché, retirée des listes de l'intendance · Habitante = s'inscrire à ses repas · Admin consulter = voir les inscriptions et la compta · Admin gérer = paramétrer les repas et corriger les inscriptions",
  evenements: "Masquée = onglet Calendrier caché, aucun événement ni rappel · Habitante = voir les événements et les rappels · Admin consulter = voir en plus les inscrits et les événements ciblés sur l'intendance · Admin gérer = créer et modifier les événements",
  absences: "Masquée = onglet Présence foyer caché, retirée des listes de présence · Habitante = déclarer ses propres absences · Admin consulter = voir les présences de tout le foyer · Admin gérer = marquer les absences des autres",
  comptes: "Habitante = voir son profil · Admin consulter = voir les comptes et les chambres · Admin gérer = inviter, déplacer et archiver",
  infos: "Masquée = onglet Administratif caché · Habitante = lire les rubriques · Admin consulter = idem · Admin gérer = créer et modifier les rubriques",
};

export function asNiveauSection(n: number | null | undefined): NiveauSection {
  return n === 0 ? 0 : n === 2 ? 2 : n === 3 ? 3 : 1;
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
// La section existe-t-elle pour cette personne ? (niveau 0 = onglet masqué + page interdite)
export function canAccessSection(r: Rights, s: Section): boolean {
  return isSuperAdmin(r) || (r[s] ?? 1) >= NIV.UTILISATEUR;
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
