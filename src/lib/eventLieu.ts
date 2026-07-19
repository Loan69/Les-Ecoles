// Libellé lisible du lieu d'un événement (résidences).
// Ex. ["12","36"] -> "Résidence 12, Résidence 36" ; [] -> null.
export function formatLieu(lieu?: string[] | null): string | null {
  if (!lieu || lieu.length === 0) return null;
  const label = (v: string) => (v === "corail" ? "Corail" : /^\d+$/.test(v) ? `Résidence ${v}` : v);
  return lieu.map(label).join(", ");
}
