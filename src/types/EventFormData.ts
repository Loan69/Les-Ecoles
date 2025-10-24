export interface EventFormData {
  titre: string;
  category: string;
  description?: string,
  date_event?: string;
  recurrence?: string;
  heures?: string;
  lieu?: string;
  visibilite?: {
    residences: string[];
    etages: string[];
    chambres: string[];
  };
  visible_invites?: boolean;
  demander_confirmation?: boolean; 
}
