export interface CalendarEvent {
  id?: number;
  couleur?: string;
  titre: string;
  category?: string;
  description?: string;
  dates_event?: string[];
  recurrence?: string;
  heures?: string;
  lieu?: string[];
  visibilite?: {
    residence: string[]; // résidences entières
    etage: string[]; // étages précis (une résidence n'y figure pas si elle est déjà "entière")
    chambre?: string[]; // hérité (anciens événements)
    exclusions?: string[]; // user_ids explicitement décochés (ciblage dynamique)
  };
  visible_invites?: boolean;
  demander_confirmation?: boolean;
  confirmations?: string[];
  reserve_admin?: "12" | "36" | "all" | null;
  rappel_event?: number;
  nextReminderDate?: Date;
  joursRestants?: number;
  is_active?: boolean;
}