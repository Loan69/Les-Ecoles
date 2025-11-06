export interface CalendarEvent {
  id?: number;
  couleur?: string;
  titre: string;
  category?: string;
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
