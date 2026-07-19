import { MealOptionCatalog } from "@/types/MealOption";

// Une option est-elle visible pour cette habitante ?
// - réservée admins → seulement les admins ;
// - visibilité vide (aucune résidence/étage ciblé) → toutes ;
// - sinon : résidence ciblée OU étage ciblé, sauf exclusion nominative.
export function optionVisibleFor(
  option: MealOptionCatalog,
  viewer: { residence?: string | null; etage?: string | null; user_id?: string | null; is_admin?: boolean }
): boolean {
  if (option.admin_only && !viewer.is_admin) return false;

  const vis = option.visibilite;
  if (!vis) return true;
  const residence = vis.residence ?? [];
  const etage = vis.etage ?? [];
  const exclusions = vis.exclusions ?? [];
  if (residence.length === 0 && etage.length === 0) return true;

  if (viewer.user_id && exclusions.includes(viewer.user_id)) return false;
  return (
    (viewer.residence != null && residence.includes(viewer.residence)) ||
    (viewer.etage != null && etage.includes(viewer.etage))
  );
}
