export {}; 

export interface Repas {
    id_repas: number;
    date_repas: string;
    type_repas: "dejeuner" | "diner";
    user_id: string;
    choix_repas: string;
    commentaire?: string;
}