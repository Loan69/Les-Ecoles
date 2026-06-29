import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: adminCheck } = await supabase
      .from("residentes")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte" },
        { status: 400 }
      );
    }

    const { error: deleteResidenteError } = await supabase
      .from("residentes")
      .delete()
      .eq("user_id", userId);

    if (deleteResidenteError) {
      return NextResponse.json(
        { error: "Erreur lors de la suppression de la résidente" },
        { status: 500 }
      );
    }

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      return NextResponse.json(
        { error: "Erreur lors de la suppression du compte utilisateur" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Utilisatrice supprimée avec succès" });
  } catch (error) {
    console.error("Erreur DELETE user:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
