import type { CouleurResidence, Residence, ResidenceKind } from "@/types/Residence";

// --- Les blocs du foyer, en un seul endroit --------------------------------
//
// Un bloc (Résidence 12, Résidence 36, Corail, une future résidence…) est une ligne
// de la table `residences`. Rien n'est écrit en dur : les écrans lisent cette liste
// et en dérivent leurs encadrés, leurs colonnes et leurs couleurs. Ajouter un bloc
// depuis l'onglet Administration suffit donc à le voir apparaître partout.

export const COULEURS_RESIDENCE: CouleurResidence[] = ["amber", "pink", "teal", "blue", "purple", "green"];

export const COULEUR_LABEL: Record<CouleurResidence, string> = {
  amber: "Jaune",
  pink: "Rose",
  teal: "Turquoise",
  blue: "Bleu",
  purple: "Violet",
  green: "Vert",
};

// Classes Tailwind **littérales** : le compilateur ne voit pas les noms de classes
// construits à la volée (`bg-${couleur}-100` ne serait jamais généré).
export type ThemeResidence = {
  ongletActif: string; // intercalaire sélectionné (accueil)
  carte: string; // fond + bordure d'un encadré de bloc
  titre: string; // titre à l'intérieur de cet encadré
  badge: string; // pastille compacte « Rés. 12 »
  point: string; // puce de couleur
};

const THEMES: Record<CouleurResidence, ThemeResidence> = {
  amber: { ongletActif: "bg-yellow-400 border-yellow-400 text-amber-900", carte: "bg-yellow-100 border-yellow-300", titre: "text-amber-800", badge: "bg-amber-100 text-amber-800", point: "bg-amber-400" },
  pink: { ongletActif: "bg-pink-400 border-pink-400 text-white", carte: "bg-pink-100 border-pink-300", titre: "text-pink-800", badge: "bg-pink-100 text-pink-700", point: "bg-pink-400" },
  teal: { ongletActif: "bg-teal-500 border-teal-500 text-white", carte: "bg-teal-100 border-teal-300", titre: "text-teal-800", badge: "bg-teal-100 text-teal-800", point: "bg-teal-500" },
  blue: { ongletActif: "bg-blue-500 border-blue-500 text-white", carte: "bg-blue-100 border-blue-300", titre: "text-blue-800", badge: "bg-blue-100 text-blue-700", point: "bg-blue-500" },
  purple: { ongletActif: "bg-purple-500 border-purple-500 text-white", carte: "bg-purple-100 border-purple-300", titre: "text-purple-800", badge: "bg-purple-100 text-purple-700", point: "bg-purple-500" },
  green: { ongletActif: "bg-green-500 border-green-500 text-white", carte: "bg-green-100 border-green-300", titre: "text-green-800", badge: "bg-green-100 text-green-700", point: "bg-green-500" },
};

export function themeResidence(couleur?: string | null): ThemeResidence {
  return THEMES[(couleur ?? "blue") as CouleurResidence] ?? THEMES.blue;
}

// Libellé de secours quand la liste n'est pas (encore) chargée, ou pour une valeur
// historique dont le bloc n'existe plus : « 12 » → « Résidence 12 », « corail » → « Corail ».
export function labelResidenceDefaut(value: string): string {
  if (/^\d+$/.test(value)) return `Résidence ${value}`;
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/[_-]+/g, " ");
}

// Libellé compact pour les listes serrées : « Rés. 12 », « Corail ».
export function labelResidenceCourt(value: string): string {
  return /^\d+$/.test(value) ? `Rés. ${value}` : labelResidenceDefaut(value);
}

// Couleur attribuée par rotation quand la ligne n'en porte pas.
// Les couleurs figées pour « 12 », « 36 » et « corail » ont disparu ici : elles
// dataient d'avant supabase/blocs-dynamiques.sql, et faisaient entrer dans le code
// générique le nom des blocs d'un foyer particulier.
function couleurParRang(index: number): CouleurResidence {
  return COULEURS_RESIDENCE[index % COULEURS_RESIDENCE.length];
}

// Lecture d'une ligne `residences`, tolérante aux colonnes absentes : elles sont
// toutes NOT NULL depuis le socle, mais une lecture partielle (`select` restreint)
// reste possible, et l'objet doit rester utilisable.
export function toResidence(row: Record<string, unknown>, index = 0): Residence {
  const value = String(row.value ?? "");
  const kind: ResidenceKind = row.kind === "poste" ? "poste" : "chambre";
  return {
    value,
    label: typeof row.label === "string" && row.label.trim() ? row.label : labelResidenceDefaut(value),
    kind,
    ordre: typeof row.ordre === "number" ? row.ordre : index + 1,
    couleur: (typeof row.couleur === "string" && (COULEURS_RESIDENCE as string[]).includes(row.couleur)
      ? row.couleur
      : couleurParRang(index)) as CouleurResidence,
    is_active: row.is_active !== false,
  };
}

// Ordre d'affichage commun à tous les écrans : `ordre`, puis la valeur (12 avant 36).
export function trierResidences(list: Residence[]): Residence[] {
  return [...list].sort((a, b) => a.ordre - b.ordre || a.value.localeCompare(b.value, "fr", { numeric: true }));
}

export function toResidences(rows: Record<string, unknown>[] | null | undefined): Residence[] {
  return trierResidences((rows ?? []).map((r, i) => toResidence(r, i)));
}

export function labelResidence(list: Residence[], value?: string | null): string {
  if (!value) return "—";
  return list.find((r) => r.value === value)?.label ?? labelResidenceDefaut(value);
}
