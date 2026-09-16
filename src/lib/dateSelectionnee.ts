// La date sur laquelle l'appli est « posée » : l'accueil, la semaine de repas et le
// calendrier repartent tous de là, pour qu'un changement d'écran ne fasse pas perdre
// le jour qu'on était en train de regarder.
//
// Mais cette mémoire se **périme**. Rouvrir l'appli le lendemain matin sur le mercredi
// consulté la veille, c'est perdre le fil sans s'en apercevoir : les repas affichés ne
// sont pas ceux du jour, la présence non plus. Passé le délai ci-dessous — ou dès qu'on
// a changé de journée — la date mémorisée est oubliée et l'appli revient à aujourd'hui.

import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";

const CLE_DATE = "dateSelectionnee";
// Horodatage du dernier choix de date. Absent = installation d'avant cette mémoire :
// la date mémorisée est alors traitée comme périmée, ce qui ramène à aujourd'hui.
const CLE_CHOISIE_LE = "dateSelectionneeChoisieLe";

/** Au-delà de ce délai sans revenir sur l'appli, la date choisie n'est plus la bonne. */
export const PEREMPTION_DATE_MS = 60 * 60 * 1000; // 1 heure

/**
 * La date mémorisée a-t-elle cessé d'être pertinente ?
 *
 * Deux cas : le délai est passé, ou l'on a **changé de journée** depuis. Le second n'est
 * pas couvert par le premier — rouvrir l'appli à 0 h 20 après l'avoir quittée à 23 h 50,
 * c'est demain, même si l'heure de péremption n'a pas couru.
 */
export function dateSelectionneePerimee(maintenant: Date = new Date()): boolean {
  if (typeof window === "undefined") return true;
  const brut = Number(localStorage.getItem(CLE_CHOISIE_LE));
  if (!brut) return true;
  const choisieLe = new Date(brut);
  return (
    maintenant.getTime() - brut > PEREMPTION_DATE_MS ||
    formatDateKeyLocal(choisieLe) !== formatDateKeyLocal(maintenant)
  );
}

/** La date sur laquelle ouvrir un écran : celle mémorisée si elle tient encore, sinon aujourd'hui. */
export function lireDateSelectionnee(maintenant: Date = new Date()): Date {
  if (typeof window === "undefined") return maintenant;
  const memorisee = localStorage.getItem(CLE_DATE);
  if (!memorisee || dateSelectionneePerimee(maintenant)) return maintenant;
  return parseDateKeyLocal(memorisee);
}

/** Mémorise la date regardée, et repart le compteur de péremption. */
export function memoriserDateSelectionnee(date: Date, maintenant: Date = new Date()): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLE_DATE, formatDateKeyLocal(date));
  localStorage.setItem(CLE_CHOISIE_LE, String(maintenant.getTime()));
}
