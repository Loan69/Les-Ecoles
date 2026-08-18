import { labelResidence } from "@/lib/residences";
import type { Residence } from "@/types/Residence";

// Libellé lisible du lieu d'un événement (les blocs du foyer).
// Ex. ["12","36"] -> "Résidence 12, Résidence 36" ; [] -> null.
// `blocs` vient de useResidences() : le nom affiché est celui réglé en Administration
// (un bloc renommé ou créé se lit correctement partout). Sans liste, on retombe sur
// l'heuristique de labelResidenceDefaut.
export function formatLieu(lieu?: string[] | null, blocs: Residence[] = []): string | null {
  if (!lieu || lieu.length === 0) return null;
  return lieu.map((v) => labelResidence(blocs, v)).join(", ");
}
