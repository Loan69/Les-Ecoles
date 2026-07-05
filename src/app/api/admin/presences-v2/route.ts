import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// --- Toutes les inscriptions repas (nouveau modèle) sur une période (admin) ---
export async function GET(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
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
