export interface Absence {
  id: string;
  user_id: string;
  date_debut: string; // "YYYY-MM-DD"
  date_fin: string; // "YYYY-MM-DD"
  contact: string | null;
  created_at: string;
}

export interface AbsencePayload {
  date_debut: string;
  date_fin: string;
  contact: string | null;
}
