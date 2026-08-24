import { headers } from "next/headers";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { foyerParHost, type Foyer } from "@/lib/foyers";
import { identiteDepuisReglages, IDENTITE_DEFAUT, type IdentiteFoyer } from "@/lib/foyer";

// Séparé de src/lib/foyers.ts à dessein : le middleware importe le registre et
// tourne dans le runtime Edge, où `next/headers` n'est pas disponible. Tout ce qui
// dépend de la requête en cours est donc isolé ici, côté serveur uniquement.

/** Foyer de la requête en cours, résolu d'après l'en-tête Host. */
export async function foyerCourant(): Promise<Foyer> {
  const entetes = await headers();
  return foyerParHost(entetes.get("host"));
}

/**
 * Lecture côté serveur, pour `generateMetadata` et le manifeste.
 *
 * Client anonyme volontairement : il n'y a pas de session à ce stade (le
 * manifeste est demandé par le navigateur sans cookie), et la policy
 * `app_settings: identite lisible publiquement` suffit.
 *
 * `cache()` de React mémorise le résultat **pour la durée d'une requête** : le
 * layout et le manifeste peuvent l'appeler sans multiplier les allers-retours.
 */
export const identiteFoyer = cache(async (): Promise<IdentiteFoyer> => {
  try {
    const foyer = await foyerCourant();
    const supabase = createClient(foyer.url, foyer.anon, { auth: { persistSession: false } });
    const { data } = await supabase.from("app_settings").select("key, value");
    return identiteDepuisReglages(data);
  } catch {
    // Base injoignable : l'application doit quand même s'afficher.
    return IDENTITE_DEFAUT;
  }
});
