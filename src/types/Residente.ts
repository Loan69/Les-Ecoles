export interface Residente {
    id: number;
    user_id: string;
    nom: string;
    prenom: string;
    date_naissance: string;
    residence: string;
    etage: string;
    chambre: string;
    created_at: string;
    email: string;
    is_admin: boolean; // miroir dérivé de (niveau >= 2 || is_technique)
    niveau: number; // 1 résidente · 2 admin lecture · 3 admin édition · 4 super-admin
    is_technique?: boolean; // compte technique caché (hors hiérarchie)
}