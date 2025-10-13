export interface Repas {
    date_repas: string;
    type_repas: "dejeuner" | "diner";
    user_id: string;
    choix_repas: string;
    commentaire?: string;
}