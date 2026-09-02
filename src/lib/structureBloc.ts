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
