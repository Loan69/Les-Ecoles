import { MealOptionCatalog } from "@/types/MealOption";
import { cibleEstVide, dansCible, estExclue, type CibleViewer } from "@/lib/visibilite";

// Une option est-elle visible pour cette habitante ?
// - aucun ciblage → toutes ;
// - sinon : résidence, étage ou groupe ciblé, sauf exclusion nominative.
//
// Une option d'intendance se dit désormais « ciblée sur le groupe Intendance » (R-VIS-01) :
// il n'y a plus de case « réservée aux admins », qui visait en réalité toute personne ayant
// un droit sur une section quelconque.
export function optionVisibleFor(option: MealOptionCatalog, viewer: CibleViewer): boolean {
  const vis = option.visibilite;
  if (cibleEstVide(vis)) return true;
  if (estExclue(vis, viewer)) return false;
  return dansCible(vis, viewer);
}
