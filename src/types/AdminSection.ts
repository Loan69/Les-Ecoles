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
  admin_only: boolean; // rubrique réservée aux administratrices (non transmise aux résidentes)
  updated_at?: string;
}
