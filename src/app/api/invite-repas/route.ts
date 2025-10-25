import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const body = await req.json();
  const { nom, prenom, date, repas, lieuRepas, userId } = body;
  
 // 🧩 Correction ici : cookies() est une Promise en Next 15+
 const cookieStore = await cookies();


 const supabase = createServerClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ service role key côté serveur uniquement
   {
     cookies: {
       get(name: string) {
         return cookieStore.get(name)?.value;
       },
       set() {},
       remove() {},
     },
   }
 );

  // Vérification des champs
  if (!nom || !prenom || !date || !repas || !lieuRepas || !userId) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  // Insertion directe
  const { error } = await supabase.from("invites_repas").insert([
    {
      nom,
      prenom,
      date_repas: date,
      type_repas: repas,
      lieu_repas: lieuRepas,
      invite_par: userId,
    },
  ]);

  if (error) {
    console.error("Erreur Supabase :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
