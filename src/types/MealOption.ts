// Types du modèle repas « Lot 2 » (options, pas menus).
// Coexiste avec l'ancien modèle (MealTypes.ts) le temps de la migration.

export type Service = "dejeuner" | "diner";

// Option réutilisable du catalogue (meal_options)
export interface MealOptionCatalog {
  id: string;
  label: string;
  residence: string; // "12" / "36" — rattachement compta, imposé
  delai_commande: number; // jours d'avance en plus de la clôture la veille (0 = clôture la veille à l'heure de lock)
  admin_only: boolean;
  is_active: boolean;
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

// Inscription repas nouveau modèle (presences_v2)
export interface PresenceV2 {
  id: string;
  user_id: string;
  date: string;
  service: Service;
  option_id: string;
  commentaire: string | null;
}
