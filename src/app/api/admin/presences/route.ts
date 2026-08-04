import { NextRequest, NextResponse } from "next/server";
import { requireSectionView, requireSectionEdit } from "@/lib/apiAuth";
import { logMealEdit } from "@/lib/mealAudit";
import { CHOIX_NON } from "@/lib/presenceStatut";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// --- Toutes les inscriptions repas sur une période (admin), avec les séjours d'absence ---
//
// Les absences font partie du CALCUL des repas : les jours intérieurs d'un séjour sont
// déduits de la comptabilité (R-FOYER-09 / R-REPAS-10/11, cf. isAwayForMeal). On les
// renvoie donc ici, sous le droit **Repas**, et réduites aux seules colonnes du calcul.
// Une admin n'ayant que la section Repas obtient ainsi des totaux justes sans accéder
// à la vue Présence foyer (celle-ci passe par /api/admin/absences, section Absences).
export async function GET(req: NextRequest) {
  const { supabase, error } = await requireSectionView('repas');
  if (error) return error;

  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json({ error: "Paramètres start/end invalides." }, { status: 400 });
  }

  const [{ data, error: dbError }, { data: absData, error: absError }] = await Promise.all([
    supabase
      .from("presences")
      .select("*")
      .gte("date", start)
      .lte("date", end),
    // Chevauchement : date_debut <= end ET date_fin >= start
    supabase
      .from("absences_sejour")
      .select("id, user_id, date_debut, date_fin, repas_non")
      .lte("date_debut", end)
      .gte("date_fin", start),
  ]);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  if (absError) return NextResponse.json({ error: absError.message }, { status: 500 });
  return NextResponse.json({ presences: data ?? [], absences: absData ?? [] });
}

// --- Définir l'inscription d'UNE résidente pour un (jour, service) — admin édition. ---
// choix = "" → sans réponse (retire la ligne) · "non" → « Non » explicite · <uuid> → option.
// L'admin passe outre le verrouillage et les restrictions d'option (admin_only / inactive) :
// correction d'intendance.
export async function POST(req: NextRequest) {
  const { supabase, userId, error } = await requireSectionEdit('repas');
  if (error) return error;

  const body = await req.json();
  const { user_id, date, service, choix } = body as {
    user_id?: string;
    date?: string;
    service?: string;
    choix?: string | null;
  };

  if (!user_id) return NextResponse.json({ error: "Utilisatrice manquante." }, { status: 400 });
  if (!date || !DATE_RE.test(date)) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  if (service !== "dejeuner" && service !== "diner") return NextResponse.json({ error: "Service invalide." }, { status: 400 });

  // Ligne avant modification (pour le journal d'audit).
  const { data: prev } = await supabase
    .from("presences")
    .select("option_id")
    .eq("user_id", user_id)
    .eq("date", date)
    .eq("service", service)
    .maybeSingle();
  const optionBeforeId = prev?.option_id ?? null;
  const statutBefore = prev ? (prev.option_id ? "option" : "non") : "sans_reponse";

  // Sans réponse → on retire la ligne
  if (!choix) {
    const { error: delErr } = await supabase
      .from("presences")
      .delete()
      .eq("user_id", user_id)
      .eq("date", date)
      .eq("service", service);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    await logMealEdit(supabase, userId, { action: "presence_remove", entity: "presence", targetUserId: user_id, dateRepas: date, service, optionBeforeId, optionAfterId: null, details: { statut_avant: statutBefore, statut_apres: "sans_reponse" } });
    return NextResponse.json({ success: true });
  }

  // « Non » explicite → ligne sans option
  if (choix === CHOIX_NON) {
    const { error: nonErr } = await supabase
      .from("presences")
      .upsert({ user_id, date, service, option_id: null }, { onConflict: "user_id,date,service" });
    if (nonErr) return NextResponse.json({ error: nonErr.message }, { status: 500 });
    await logMealEdit(supabase, userId, { action: "presence_set", entity: "presence", targetUserId: user_id, dateRepas: date, service, optionBeforeId, optionAfterId: null, details: { statut_avant: statutBefore, statut_apres: "non" } });
    return NextResponse.json({ success: true });
  }

  const option_id = choix;

  // On vérifie seulement que l'option est bien proposée ce jour/service (pas de garde de lock/admin_only : override admin).
  const { data: so } = await supabase
    .from("meal_service_options")
    .select("option_id")
    .eq("date", date)
    .eq("service", service)
    .eq("option_id", option_id)
    .maybeSingle();
  if (!so) return NextResponse.json({ error: "Cette option n'est pas proposée ce jour." }, { status: 400 });

  const { error: upErr } = await supabase
    .from("presences")
    .upsert({ user_id, date, service, option_id }, { onConflict: "user_id,date,service" });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  await logMealEdit(supabase, userId, { action: "presence_set", entity: "presence", targetUserId: user_id, dateRepas: date, service, optionBeforeId, optionAfterId: option_id, details: { statut_avant: statutBefore, statut_apres: "option" } });
  return NextResponse.json({ success: true });
}
