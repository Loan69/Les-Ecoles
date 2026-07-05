import { Absence } from "@/types/Absence";
import { Service } from "@/types/MealOption";

// Une inscrite est-elle "absente" pour ce repas (donc comptée « Non ») ?
// Règles jours-frontières : jour de départ → depart_*, jour de retour → retour_*,
// jour intérieur → absente aux deux services, séjour d'un jour → absente.
export function isAwayForMeal(absences: Absence[], userId: string, dateKey: string, service: Service): boolean {
  for (const a of absences) {
    if (a.user_id !== userId) continue;
    if (dateKey < a.date_debut || dateKey > a.date_fin) continue;

    if (a.date_debut === a.date_fin) return true; // séjour d'un seul jour

    if (dateKey === a.date_debut) {
      return service === "dejeuner" ? !(a.depart_dejeuner ?? true) : !(a.depart_diner ?? false);
    }
    if (dateKey === a.date_fin) {
      return service === "dejeuner" ? !(a.retour_dejeuner ?? false) : !(a.retour_diner ?? true);
    }
    return true; // jour intérieur
  }
  return false;
}
