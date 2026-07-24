import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/apiAuth";

// Suppression d'un compte : réservée au super-admin (niveau 4) ou au compte technique.
// Action dangereuse (irréversible) → volontairement plus restrictive que l'édition.
export async function DELETE(req: NextRequest) {
  try {
    const { supabase, userId, error } = await requireSuperAdmin();
    if (error) return error;

    const { userId: target } = await req.json();
    if (!target) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }
    if (target === userId) {
      return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });
    }

    // Le compte technique caché ne peut pas être supprimé.
    const { data: tgt } = await supabase.from("residentes").select("is_technique").eq("user_id", target).maybeSingle();
    if (tgt?.is_technique) {
      return NextResponse.json({ error: "Ce compte ne peut pas être supprimé." }, { status: 403 });
    }

    const { error: deleteResidenteError } = await supabase.from("residentes").delete().eq("user_id", target);
    if (deleteResidenteError) {
      return NextResponse.json({ error: "Erreur lors de la suppression de la résidente" }, { status: 500 });
    }

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(target);
    if (deleteAuthError) {
      return NextResponse.json({ error: "Erreur lors de la suppression du compte utilisateur" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Utilisatrice supprimée avec succès" });
  } catch (error) {
    console.error("Erreur DELETE user:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
