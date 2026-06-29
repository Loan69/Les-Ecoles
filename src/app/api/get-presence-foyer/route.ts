import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
  }

  // Vérification que l'utilisateur est admin
  const { data: adminCheck } = await supabase
    .from("residentes")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminCheck?.is_admin) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }

  const { date } = await req.json();

  // Une personne est absente à cette date si elle a un séjour d'absence
  // qui couvre la date (bornes incluses).
  const { data, error } = await supabase
    .from("absences_sejour")
    .select("user_id")
    .lte("date_debut", date)
    .gte("date_fin", date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const absenteIds = [...new Set(data?.map((a) => a.user_id) || [])];
  return NextResponse.json({ absenteIds });
}
