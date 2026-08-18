import type { SupabaseClient } from "@supabase/supabase-js";
import { cibleEstVide, dansCible, estExclue, type Cible } from "@/lib/visibilite";

// --- « Cette option de repas est-elle ouverte à cette personne ? » -----------
//
// Règle unique, côté serveur, pour les inscriptions **et les invités** : un invité mange
// ce que son **invitante** peut choisir. Si le pique-nique est ciblé sur un groupe dont
// elle ne fait pas partie, ni elle ni son invité n'y ont droit — que l'invitation soit
// saisie par l'habitante elle-même ou par une administratrice pour son compte.
//
// Renvoie le message d'erreur à afficher, ou null si l'option est ouverte.
export async function optionRefuseePour(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  service: string,
  optionId: string,
  // Message quand la personne n'est pas dans le ciblage — le contexte change selon
  // qu'on parle de soi (« ne vous est pas proposée ») ou d'une tierce personne.
  horsCible = "Cette option ne vous est pas proposée."
): Promise<string | null> {
  const { data: so } = await supabase
    .from("meal_service_options")
    .select("option:meal_options(is_active, visibilite)")
    .eq("date", date)
    .eq("service", service)
    .eq("option_id", optionId)
    .maybeSingle();

  const opt = so?.option as { is_active?: boolean; visibilite?: Cible | null } | null;
  if (!opt) return "Cette option n'est pas proposée ce jour.";
  if (!opt.is_active) return "Cette option n'est plus disponible.";
  if (cibleEstVide(opt.visibilite)) return null;

  const [{ data: profil }, { data: mesGroupes }] = await Promise.all([
    supabase.from("residentes").select("residence, etage, chambre").eq("user_id", userId).maybeSingle(),
    supabase.from("groupe_membres").select("groupe_id").eq("user_id", userId),
  ]);

  const viewer = {
    residence: profil?.residence,
    etage: profil?.etage,
    chambre: profil?.chambre,
    user_id: userId,
    groupes: (mesGroupes ?? []).map((g) => g.groupe_id as string),
  };
  if (estExclue(opt.visibilite, viewer) || !dansCible(opt.visibilite, viewer)) return horsCible;
  return null;
}
