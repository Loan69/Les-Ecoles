import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAdminView } from "@/lib/apiAuth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Assignment = { date: string; service: "dejeuner" | "diner"; option_ids: string[] };

// --- Options ouvertes sur une période (hydratées avec l'option) ---
export async function GET(req: NextRequest) {
  const { supabase, error } = await requireAdminView();
  if (error) return error;

  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json({ error: "Paramètres start/end invalides." }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("meal_service_options")
    .select("*, option:meal_options(*)")
    .gte("date", start)
    .lte("date", end)
    .order("position", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ serviceOptions: data ?? [] });
}

// --- Définir l'ensemble des options ouvertes pour un ou plusieurs (jour, service) ---
// Corps : { assignments: [{ date, service, option_ids: [...] }] }  (remplace l'existant)
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = (await req.json()) as { assignments?: Assignment[] };
  const assignments = body.assignments;
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return NextResponse.json({ error: "Aucune affectation fournie." }, { status: 400 });
  }

  for (const a of assignments) {
    if (!a.date || !DATE_RE.test(a.date)) return NextResponse.json({ error: `Date invalide : ${a.date}` }, { status: 400 });
    if (a.service !== "dejeuner" && a.service !== "diner")
      return NextResponse.json({ error: `Service invalide : ${a.service}` }, { status: 400 });

    // Remplacement : on efface l'existant du (jour, service) puis on réinsère la nouvelle liste.
    const { error: delErr } = await supabase
      .from("meal_service_options")
      .delete()
      .eq("date", a.date)
      .eq("service", a.service);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    const optionIds = [...new Set(a.option_ids ?? [])];
    if (optionIds.length > 0) {
      const rows = optionIds.map((option_id, i) => ({
        date: a.date,
        service: a.service,
        option_id,
        position: i,
      }));
      const { error: insErr } = await supabase.from("meal_service_options").insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
