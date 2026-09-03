import type { SupabaseClient } from "@supabase/supabase-js";
import { computeLockState } from "@/lib/lockUtils";
import { parseDateKeyLocal } from "@/lib/utilDate";
import { identiteDepuisReglages } from "@/lib/foyer";

/**
 * Le verrouillage des repas, **vérifié côté serveur**.
 *
 * `R-REPAS-14` annonçait déjà qu'un enregistrement est refusé sur un jour verrouillé
 * (`R-REPAS-07`) ou hors délai de commande (`R-LOCK-05`) — mais seul « option non
 * proposée » l'était réellement : l'API des inscriptions ne regardait pas l'heure.
 * Le contrôle n'existait qu'à l'écran, ce qui protège de l'usage normal et de rien
 * d'autre. Même modèle que le verrou de la présence au foyer (`R-LOCK-12`), qui est
 * vérifié côté serveur depuis 2026-08-21.
 *
 * ⚠️ Ne s'applique QU'AU self-service (`/api/presences`, ses propres repas). Les
 * corrections d'intendance passent par `/api/admin/presences`, qui **passe outre**
 * volontairement (`R-NIV-08`) : c'est l'intendance qui arbitre les régularisations.
 *
 * `delaiJours` avance la clôture pour les options qui se commandent à l'avance : on
 * évalue alors le verrou du jour de commande, pas celui du repas (`R-LOCK-05`).
 *
 * Renvoie le message à afficher, ou `null` si l'écriture est permise.
 */
export async function messageVerrouRepas(
  supabase: SupabaseClient,
  date: string,
  delaiJours = 0
): Promise<string | null> {
  // Une seule lecture : les réglages du verrou et l'identité du foyer (fuseau, locale)
  // vivent dans la même table.
  const { data } = await supabase.from("app_settings").select("key, value");
  const lignes = (data ?? []) as { key: string; value: string }[];
  const reglages = Object.fromEntries(lignes.map((s) => [s.key, s.value]));
  const identite = identiteDepuisReglages(lignes);

  const jourDeCommande = parseDateKeyLocal(date);
  jourDeCommande.setDate(jourDeCommande.getDate() - delaiJours);

  const etat = computeLockState(jourDeCommande, reglages, identite.fuseau, identite.locale);
  if (!etat.locked) return null;

  // Un jour passé n'a pas de message : il n'y a rien à expliquer côté écran, mais un
  // refus d'API doit toujours dire pourquoi.
  if (etat.message) return etat.message;
  return delaiJours > 0
    ? "La date limite de commande de cette option est passée."
    : "Les inscriptions de ce jour sont closes.";
}

/**
 * Le verrou applicable au choix d'une **option précise**, délai de commande compris.
 *
 * Une même journée peut être ouverte pour le repas classique et fermée pour le
 * pique-nique : c'est `delai_commande` qui avance la clôture (`R-LOCK-05`). Les deux
 * routes self-service — ses propres repas et ceux de ses invités — passent par ici,
 * pour que la réponse soit la même des deux côtés. Un invité mange ce que son
 * invitante peut choisir, y compris quant à l'heure.
 */
export async function messageVerrouOption(
  supabase: SupabaseClient,
  date: string,
  service: string,
  optionId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("meal_service_options")
    .select("option:meal_options(delai_commande)")
    .eq("date", date)
    .eq("service", service)
    .eq("option_id", optionId)
    .maybeSingle();

  const opt = data?.option as { delai_commande?: number | null } | null;
  const delai = Math.max(0, Number(opt?.delai_commande) || 0);
  return messageVerrouRepas(supabase, date, delai);
}
