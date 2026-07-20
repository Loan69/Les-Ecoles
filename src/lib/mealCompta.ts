import { Absence } from "@/types/Absence";

// Une inscrite est-elle "absente" pour ce jour (donc comptée « Non ») ?
// Règle R-ABS-BORD : sur le premier et le dernier jour d'un séjour, la résidente
// choisit librement ses repas (elle part après le dîner et revient avant le déjeuner),
// donc ces jours ne sont PAS marqués absents. Seuls les jours intérieurs le sont.
// Un séjour d'un seul jour reste absent (aucune journée intérieure).
// La règle est identique déjeuner/dîner → pas de paramètre service.
export function isAwayForMeal(absences: Absence[], userId: string, dateKey: string): boolean {
  for (const a of absences) {
    if (a.user_id !== userId) continue;
    if (dateKey < a.date_debut || dateKey > a.date_fin) continue;
    if (a.repas_non === false) continue; // absence qui n'affecte pas les repas

    if (a.date_debut === a.date_fin) return true; // séjour d'un seul jour → absente
    if (dateKey === a.date_debut || dateKey === a.date_fin) return false; // jours-frontières → libre choix
    return true; // jour intérieur → absente aux deux services
  }
  return false;
}
