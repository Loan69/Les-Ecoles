import type { Cible } from "@/lib/visibilite";

export interface CalendarEvent {
  id?: number;
  /**
   * Qui a créé l'événement. Renseigné à la création depuis toujours ; lu depuis le
   * 2026-09-11 pour que l'autrice voie son événement quel que soit son ciblage
   * (`contourneLeCiblage`). ⚠️ La clé étrangère est en `ON DELETE CASCADE` :
   * supprimer un compte supprime les événements qu'il a créés.
   */
  user_id?: string | null;
  couleur?: string;
  titre: string;
  category?: string;
  description?: string;
  dates_event?: string[];
  recurrence?: string;
  heures?: string;
  lieu?: string[];
  // Ciblage commun aux événements, options de repas et rubriques (src/lib/visibilite.ts) :
  // résidences entières / étages précis / groupes, moins les exclusions nominatives.
  visibilite?: Cible;
  visible_invites?: boolean;
  demander_confirmation?: boolean;
  confirmations?: string[];
  rappel_event?: number;
  nextReminderDate?: Date;
  joursRestants?: number;
  is_active?: boolean;
}