import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
  }

  const { date } = await req.json();

  // Absente à cette date si un séjour d'absence la couvre (bornes incluses).
  const { data, error } = await supabase
    .from("absences_sejour")
    .select("id")
    .eq("user_id", user.id)
    .lte("date_debut", date)
    .gte("date_fin", date)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ isAbsent: (data?.length ?? 0) > 0 });
}
