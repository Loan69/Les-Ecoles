import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function POST() {
  const supabase = await createSupabaseServer();

  try {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = data?.user;

    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const { data: pending, error: pendingError } = await supabase
      .from("pending_users")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (pendingError) throw pendingError;
    if (!pending) {
      return NextResponse.json({ message: "Aucune donnée en attente." });
    }

    if (pending.role === "residente") {
      // Lot 3 : les résidentes sont créées par invitation de l'intendance
      // (plus de self-signup). On refuse toute création résidente par cette voie.
      return NextResponse.json(
        { error: "Les comptes résidents sont créés par invitation de l'intendance." },
        { status: 403 }
      );
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
    } else {
      return NextResponse.json({ error: "Rôle inconnu." }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from("pending_users")
      .delete()
      .eq("email", user.email);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erreur lors de la synchronisation utilisateur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
