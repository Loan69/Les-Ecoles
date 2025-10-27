export interface CalendarEvent {
    id: number;
    titre: string;
    couleur: string;
    type?: string;
    date_event: string;
    recurrence?: string;
    heures?: string;
    lieu?: string;
     visibilite?: {
    residences: string[];
    etages: string[];
    chambres: string[];
  };
    description?: string;
    reserve_admin?: boolean;
    visible_invites?: boolean;
  }