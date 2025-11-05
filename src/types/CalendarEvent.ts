export interface CalendarEvent {
  id?: number; // facultatif pour la création
  couleur?: string;
  titre: string;
  category?: string; // correspond à category
  description?: string;
  dates_event?: string[];
  recurrence?: string;
  heures?: string;
  lieu?: string;
  visibilite?: {
    residence: string[];
    etage: string[];
    chambre: string[];
  };
  visible_invites?: boolean;
  demander_confirmation?: boolean;
  confirmations?: string[];
  reserve_admin?: boolean;
  rappel_event?: number;
  nextReminderDate?: Date;
  joursRestants?: number;
}
