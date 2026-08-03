export interface Absence {
  id: string;
  user_id: string;
  date_debut: string; // "YYYY-MM-DD"
  date_fin: string; // "YYYY-MM-DD"
  // Conservée pour les séjours saisis avant le retrait du champ « je suis chez… » (2026-08-01).
  // Plus aucune saisie ni affichage : la colonne existe encore en base pour ne pas perdre l'historique.
  contact: string | null;
  created_at: string;
  // Couplage repas ↔ absence : si true, marque les repas « Non » pendant l'absence (jours intérieurs).
  repas_non?: boolean;
  // Repas pris sur les jours-frontières (couplage repas ↔ absence)
  depart_dejeuner?: boolean;
  depart_diner?: boolean;
  retour_dejeuner?: boolean;
  retour_diner?: boolean;
}

export interface AbsencePayload {
  date_debut: string;
  date_fin: string;
  repas_non?: boolean;
}
