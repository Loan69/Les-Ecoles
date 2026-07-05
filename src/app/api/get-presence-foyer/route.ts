import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";

export async function POST(req: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { date } = await req.json();

  // Une personne est absente à cette date si un séjour d'absence la couvre (bornes incluses).
  const { data, error: dbError } = await supabase
    .from("absences_sejour")
    .select("user_id")
    .lte("date_debut", date)
    .gte("date_fin", date);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const absenteIds = [...new Set(data?.map((a) => a.user_id) || [])];
  return NextResponse.json({ absenteIds });
}
