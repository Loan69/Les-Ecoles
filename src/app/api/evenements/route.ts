// app/api/evenements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const supabase = createServerComponentClient({ cookies });

  // Récupérer l'utilisateur connecté via la session
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("Erreur getUser:", userError);
    return NextResponse.json({ error: "Impossible de récupérer l'utilisateur" }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "Utilisateur non connecté" }, { status: 401 });
  }

  // Récupérer les données envoyées depuis le client
  const body = await req.json();

  // Insérer l'événement en ajoutant user_id
  const { data, error: insertError } = await supabase
    .from("evenements")
    .insert([{ ...body, user_id: user.id }])
    .select();

  if (insertError) {
    console.error("Erreur insertion :", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
