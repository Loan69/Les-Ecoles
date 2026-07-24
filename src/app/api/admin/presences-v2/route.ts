import { NextRequest, NextResponse } from "next/server";
import { requireAdminView, requireAdminEdit } from "@/lib/apiAuth";
import { logMealEdit } from "@/lib/mealAudit";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// --- Toutes les inscriptions repas (nouveau modèle) sur une période (admin) ---
export async function GET(req: NextRequest) {
  const { supabase, error } = await requireAdminView();
  if (error) return error;

  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json({ error: "Paramètres start/end invalides." }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("presences_v2")
    .select("*")
    .gte("date", start)
    .lte("date", end);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ presences: data ?? [] });
}

// --- Définir l'inscription d'UNE résidente pour un (jour, service) — admin édition. ---
// option_id null = « Non » (retire l'inscription). L'admin passe outre le verrouillage
// et les restrictions d'option (admin_only / inactive) : correction d'intendance.
export async function POST(req: NextRequest) {
  const { supabase, userId, error } = await requireAdminEdit();
  if (error) return error;

  const body = await req.json();
  const { user_id, date, service, option_id } = body as {
    user_id?: string;
    date?: string;
    service?: string;
    option_id?: string | null;
  };

  if (!user_id) return NextResponse.json({ error: "Utilisatrice manquante." }, { status: 400 });
  if (!date || !DATE_RE.test(date)) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  if (service !== "dejeuner" && service !== "diner") return NextResponse.json({ error: "Service invalide." }, { status: 400 });

  // Option avant modification (pour le journal d'audit).
  const { data: prev } = await supabase
    .from("presences_v2")
    .select("option_id")
    .eq("user_id", user_id)
    .eq("date", date)
    .eq("service", service)
    .maybeSingle();
  const optionBeforeId = prev?.option_id ?? null;

  // « Non » → on retire l'inscription
  if (!option_id) {
    const { error: delErr } = await supabase
      .from("presences_v2")
      .delete()
      .eq("user_id", user_id)
      .eq("date", date)
      .eq("service", service);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    await logMealEdit(supabase, userId, { action: "presence_remove", entity: "presence", targetUserId: user_id, dateRepas: date, service, optionBeforeId, optionAfterId: null });
    return NextResponse.json({ success: true });
  }

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
    .from("presences_v2")
    .upsert({ user_id, date, service, option_id }, { onConflict: "user_id,date,service" });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  await logMealEdit(supabase, userId, { action: "presence_set", entity: "presence", targetUserId: user_id, dateRepas: date, service, optionBeforeId, optionAfterId: option_id });
  return NextResponse.json({ success: true });
}
