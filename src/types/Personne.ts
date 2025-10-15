export interface Personne {
    user_id: string;
    nom: string;
    prenom: string;
    type: "Résidente" | "Invitée";
    residence?: string;
}
  