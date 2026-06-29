import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();

  // Récupération de l'utilisateur authentifié (pas du body)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const { nom, prenom, date, repas, lieuRepas } = body;

  if (!nom || !prenom || !date || !repas || !lieuRepas) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const { data: newInvite, error: errorInsert } = await supabase
    .from("invites")
    .upsert([{ nom, prenom }], { onConflict: "nom, prenom" })
    .select("id")
    .single();

  if (errorInsert) {
    return NextResponse.json({ error: errorInsert.message }, { status: 500 });
  }

  const { error } = await supabase.from("invites_repas").insert([
    {
      nom,
      prenom,
      date_repas: date,
      type_repas: repas,
      lieu_repas: lieuRepas,
      invite_par: user.id,
      id_invite: newInvite.id,
    },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
