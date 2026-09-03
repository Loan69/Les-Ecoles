import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Un bloc **encore vide** n'a pas de structure : elle naît de ce qu'on y range en premier.
 *
 * Elle se déclarait autrefois à la création du bloc, dans un sélecteur « chambres / postes ».
 * Question posée trop tôt : à ce moment-là le bloc n'a rien, et le choix n'engage rien de
 * visible. Elle se déduit désormais — le premier étage ou la première chambre en fait un
 * bloc de chambres, le premier poste un bloc de postes. Ensuite elle est figée, comme
 * avant : places, comptes et historique s'y réfèrent.
 *
 * Vide = aucune place ET aucun étage. Un bloc qui a des étages sans chambres est déjà un
 * bloc de chambres : sa structure est dessinée, même si personne n'y loge encore.
 */
export async function blocEstVide(supabase: SupabaseClient, residence: string): Promise<boolean> {
  const [{ count: nbPlaces }, { count: nbEtages }] = await Promise.all([
    supabase.from("places").select("id", { count: "exact", head: true }).eq("residence", residence),
    supabase.from("etages").select("id", { count: "exact", head: true }).eq("residence", residence),
  ]);
  return (nbPlaces ?? 0) === 0 && (nbEtages ?? 0) === 0;
}

/**
 * Les résidentes **actives** qui occupent l'une de ces places.
 *
 * C'est le seul garde-fou qui subsiste à la suppression d'un étage ou d'un bloc : on ne
 * retire pas le toit de quelqu'un qui est encore dessous. L'historique, lui, ne bloque
 * plus rien — une personne archivée a quitté le foyer, et son passage reste lisible même
 * si son bloc disparaît (voir `blocDeRepli`, R-RES-05).
 */
export async function occupantesActives(
  supabase: SupabaseClient,
  placeIds: string[]
): Promise<{ nom: string; prenom: string }[]> {
  if (placeIds.length === 0) return [];
  const { data } = await supabase
    .from("residentes")
    .select("nom, prenom")
    .in("place_id", placeIds)
    .eq("statut", "active");
  return (data ?? []) as { nom: string; prenom: string }[];
}

/** « Alice DUPONT, Bea MARTIN et 3 autres » — pour un message de refus lisible. */
export function listeNoms(gens: { nom: string; prenom: string }[], max = 2): string {
  const noms = gens.map((g) => `${g.prenom} ${g.nom.toUpperCase()}`.trim());
  if (noms.length <= max) return noms.join(" et ");
  return `${noms.slice(0, max).join(", ")} et ${noms.length - max} autre(s)`;
}

/**
 * Détache ces places de tout ce qui les référence, pour qu'elles puissent être supprimées.
 *
 * Deux clés étrangères pointent sur `places`, sans ON DELETE : sans ce nettoyage, la
 * suppression échouerait sur une violation de contrainte plutôt que sur un message clair.
 *
 * · `residentes.place_id` passe à NULL — jamais la ligne : la personne et son historique
 *   restent. Ses colonnes `residence` / `etage` / `chambre` ne sont pas touchées non plus,
 *   ce sont les libellés qui rendent son passage lisible après coup.
 * · `invitations` est supprimée : une invitation vers une place qui n'existe plus n'a pas
 *   de sens, et sa contrainte interdit un `place_id` nul pour une invitation de résidente.
 *
 * À n'appeler qu'après `occupantesActives`, donc sur des places sans occupante active.
 */
export async function libererPlaces(supabase: SupabaseClient, placeIds: string[]): Promise<void> {
  if (placeIds.length === 0) return;
  await supabase.from("residentes").update({ place_id: null }).in("place_id", placeIds);
  await supabase.from("invitations").delete().in("place_id", placeIds);
}
