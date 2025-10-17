export interface InviteRepas {
    id: number;
    nom: string;
    prenom: string;
    invite_par: string;
    lieu_repas: "12" | "36";
    date_repas: string; // YYYY-MM-DD
    type_repas: "dejeuner" | "diner";
  }