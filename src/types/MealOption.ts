// Types du modèle repas : on compose les services à partir d'un catalogue
// d'options réutilisables (pas de menus figés).

export type Service = "dejeuner" | "diner";

// Visibilité d'une option (comme les événements) : ciblage résidences/étages + exclusions nominatives.
// Vide (aucune résidence, aucun étage) = visible par toutes.
export interface OptionVisibilite {
  residence: string[];
  etage: string[];
  exclusions?: string[];
}

// Option réutilisable du catalogue (meal_options)
export interface MealOptionCatalog {
  id: string;
  label: string;
  residence: string; // "12" / "36" — rattachement compta, imposé
  delai_commande: number; // jours d'avance (0 = clôture le jour même à l'heure de lock ; 1 = la veille ; etc.)
  admin_only: boolean;
  is_active: boolean;
  visibilite?: OptionVisibilite | null;
  created_at?: string;
}

// Option ouverte un jour pour un service (meal_service_options), hydratée avec son option
export interface ServiceOption {
  id: string;
  date: string; // "YYYY-MM-DD"
  service: Service;
  option_id: string;
  position: number;
  option?: MealOptionCatalog;
}

// Inscription repas (table presences)
// option_id null = « Non » explicite (la personne a répondu qu'elle ne mange pas).
// Aucune ligne = sans réponse. Voir src/lib/presenceStatut.ts.
export interface Presence {
  id: string;
  user_id: string;
  date: string;
  service: Service;
  option_id: string | null;
  commentaire: string | null;
}
