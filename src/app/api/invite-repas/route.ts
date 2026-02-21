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

  let inviteId: number;

  // Création d'un invité s'il n'existe pas déjà
  const {data : newinvite, error : errorInsert } = await supabase
    .from("invites")
    .upsert([{ nom, prenom }], {onConflict: "nom, prenom"})
    .select("id") // On récupère l'id nouvellement créé
    .single()
  
  if(errorInsert) {
    console.error("Erreur lors de l'insertion dans invites :", errorInsert);
    return NextResponse.json({ error: errorInsert.message }, { status: 500 });
  }
  inviteId = newinvite.id
  
  // Ensuite Insertion dans la table invites_repas
  const { error } = await supabase.from("invites_repas").insert([
    {
      nom,
      prenom,
      date_repas: date,
      type_repas: repas,
      lieu_repas: lieuRepas,
      invite_par: userId,
      id_invite: inviteId,
    },
  ]);

  if (error) {
    console.error("Erreur lors de l'insertion dans invites_repas :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  

  return NextResponse.json({ success: true });
}
