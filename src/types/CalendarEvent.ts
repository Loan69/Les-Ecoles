export interface CalendarEvent {
    id: number;
    titre: string;
    couleur: string;
    type?: string;
    date_event: string;
    recurrence?: string;
    heures?: string;
    lieu?: string;
    visibilite?: string;
  }