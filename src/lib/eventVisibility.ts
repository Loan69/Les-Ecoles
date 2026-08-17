import { CalendarEvent } from "@/types/CalendarEvent";
import { dansCible, estExclue, type CibleViewer } from "@/lib/visibilite";

export type EventViewer = CibleViewer;

// Un événement est-il visible pour cette habitante ?
// (lieu, exclusions nommées, périmètre résidence / étage / chambre / groupe)
//
// Un événement d'intendance se cible désormais sur un **groupe** (« Staff 12 ») : la case
// « réservé au staff » a disparu, elle visait toute personne ayant un droit sur une section
// quelconque, ce qui était à la fois trop large et impossible à nuancer. Voir R-VIS-01.
export function eventVisibleFor(event: CalendarEvent, p: EventViewer): boolean {
  const lieux = event.lieu || [];
  if (p.residence && !lieux.includes(p.residence)) return false;

  if (estExclue(event.visibilite, p)) return false;

  // Les comptes sans résidence (invitées) ne voient pas les événements par le ciblage
  // résidence / étage ; un groupe, lui, peut les viser explicitement.
  if (!p.residence && (p.groupes ?? []).length === 0) return false;

  return dansCible(event.visibilite, p);
}
