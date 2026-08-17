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
  updated_at?: string;
}
