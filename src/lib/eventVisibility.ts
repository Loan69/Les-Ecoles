import { CalendarEvent } from "@/types/CalendarEvent";

export interface EventViewer {
  residence?: string | null;
  etage?: string | null;
  chambre?: string | null;
  user_id?: string | null;
  is_admin?: boolean;
}

// Un événement est-il visible pour cette habitante ?
// (lieu, réservé staff, exclusions nommées, périmètre résidence/étage/chambre)
export function eventVisibleFor(event: CalendarEvent, p: EventViewer): boolean {
  const lieux = event.lieu || [];
  if (p.residence && !lieux.includes(p.residence)) return false;

  if (event.reserve_admin) {
    if (!p.is_admin) return false;
    if (event.reserve_admin === "all") return true;
    return event.reserve_admin === p.residence;
  }

  const exclusions = event.visibilite?.exclusions ?? [];
  if (p.user_id && exclusions.includes(p.user_id)) return false;

  // Les comptes sans résidence (invitées) ne voient plus les événements :
  // la visibilité se gère uniquement par le ciblage résidence / étage / chambre.
  if (!p.residence) return false;

  const residences = event.visibilite?.residence ?? [];
  const etages = event.visibilite?.etage ?? [];
  const chambres = event.visibilite?.chambre ?? [];
  return (
    residences.includes(p.residence) ||
    (p.etage != null && etages.includes(p.etage)) ||
    (p.chambre != null && chambres.includes(p.chambre))
  );
}
