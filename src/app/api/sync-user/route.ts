import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });

  // 🔹 Récupérer la session pour obtenir le user.id
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Non authentifié." },
      { status: 401 }
    );
  }

  const user = session.user;

  try {
    // 1️⃣ Cherche si le user existe dans pending_users
    const { data: pending, error: pendingError } = await supabase
      .from("pending_users")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (pendingError) throw pendingError;

    if (!pending) {
      return NextResponse.json({ message: "Aucune donnée en attente." });
    }

    // 2️⃣ Selon le rôle, insérer dans la bonne table
    if (pending.role === "residente") {
      const { error: insertError } = await supabase.from("residentes").insert([
        {
          user_id: user.id,
          email: user.email,
          is_admin: false,
          nom: pending.prenom,
          prenom:pending.prenom,
          date_naissance: pending.date_naissance,
          residence:pending.residence,
          etage:pending.etage,
          chambre:pending.chambre,
          created_at: new Date().toISOString(),
        },
      ]);
      if (insertError) throw insertError;
    } else if (pending.role === "invitee") {
      const { error: insertError } = await supabase.from("invitees").insert([
        {
          user_id: user.id,
          email: user.email,
          nom: pending.nom,
          prenom: pending.prenom,
          created_at: new Date().toISOString(),
        },
      ]);
      if (insertError) throw insertError;
    }

    // 3️⃣ Supprime la ligne de pending_users
    const { error: deleteError } = await supabase
      .from("pending_users")
      .delete()
      .eq("email", user.email);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erreur sync-user:", error.message);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation utilisateur." },
      { status: 500 }
    );
  }
}
