// Groupe de personnes servant au ciblage de visibilité (événements, options de repas,
// rubriques Administratif). Un groupe n'accorde AUCUN droit : les droits restent réglés
// par section (voir src/lib/roles.ts). Voir supabase/groupes.sql.

export interface Groupe {
  id: string;
  nom: string;
  description?: string | null;
  membres: string[]; // user_ids (renvoyé par /api/admin/groupes)
  created_at?: string;
}
