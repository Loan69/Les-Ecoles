import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// --- Mes inscriptions sur une période ---
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });

  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json({ error: "Paramètres start/end invalides." }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("presences_v2")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", start)
    .lte("date", end);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ presences: data ?? [] });
}

// --- Définir mon choix pour un (jour, service). option_id null = "Non" ---
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });

  const body = await req.json();
  const { date, service, option_id, commentaire } = body as {
    date?: string;
    service?: string;
    option_id?: string | null;
    commentaire?: string | null;
  };

  if (!date || !DATE_RE.test(date)) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  if (service !== "dejeuner" && service !== "diner") return NextResponse.json({ error: "Service invalide." }, { status: 400 });

  // « Non » → on retire l'inscription
  if (!option_id) {
    const { error: delErr } = await supabase
      .from("presences_v2")
      .delete()
      .eq("user_id", user.id)
      .eq("date", date)
      .eq("service", service);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Vérifier que l'option est bien proposée ce jour, active, et autorisée
  const { data: so } = await supabase
    .from("meal_service_options")
    .select("option:meal_options(is_active, admin_only)")
    .eq("date", date)
    .eq("service", service)
    .eq("option_id", option_id)
    .maybeSingle();

  const opt = so?.option as { is_active?: boolean; admin_only?: boolean } | null;
  if (!opt) return NextResponse.json({ error: "Cette option n'est pas proposée ce jour." }, { status: 400 });
  if (!opt.is_active) return NextResponse.json({ error: "Cette option n'est plus disponible." }, { status: 400 });

  if (opt.admin_only) {
    const { data: adminCheck } = await supabase.from("residentes").select("is_admin").eq("user_id", user.id).maybeSingle();
    if (!adminCheck?.is_admin) return NextResponse.json({ error: "Option réservée à l'intendance." }, { status: 403 });
  }

  const { error: upErr } = await supabase
    .from("presences_v2")
    .upsert(
      { user_id: user.id, date, service, option_id, commentaire: commentaire?.trim() || null },
      { onConflict: "user_id,date,service" }
    );

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
