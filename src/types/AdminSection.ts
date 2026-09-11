import type { Cible } from "@/lib/visibilite";

export type AdminSectionType = "richtext" | "contacts";

export interface Contact {
  nom: string;
  role?: string;
  telephone?: string;
  email?: string;
}

// content = document JSON tiptap (richtext) OU { contacts: Contact[] } (contacts)
export interface AdminSection {
  id: string;
  title: string;
  type: AdminSectionType;
  position: number;
  content: unknown;
  // Ciblage commun (résidences / étages / groupes + exclusions), cf. src/lib/visibilite.ts.
  // Vide = visible par toutes.
  visibilite?: Cible | null;
  /**
   * Qui a créé la rubrique. Elle lui reste visible quel que soit son ciblage, afin
   * qu'une autrice ne puisse pas s'enfermer dehors (`contourneLeCiblage`).
   * `null` = rubrique antérieure au 2026-09-11, ou autrice dont le compte a été
   * supprimé : l'ancienne règle s'applique, toute l'intendance la voit.
   */
  auteur_user_id?: string | null;
  updated_at?: string;
}
