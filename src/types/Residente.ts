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
    is_admin: boolean; // miroir : a un accès admin quelconque (une section ≥ 2, super-admin ou technique)
    // Droits par section (1 Aucun · 2 Lecture · 3 Édition)
    niveau_repas?: number;
    niveau_evenements?: number;
    niveau_absences?: number;
    niveau_comptes?: number;
    niveau_infos?: number;
    is_super_admin?: boolean; // rôle global : tous droits + gestion des droits
    is_technique?: boolean; // compte technique caché (hors hiérarchie)
}