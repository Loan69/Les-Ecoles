import { NextRequest, NextResponse } from "next/server";
import { requireSectionEdit } from "@/lib/apiAuth";
import { isSuperAdmin } from "@/lib/roles";

// Suppression définitive d'un compte (ligne `residentes` + compte d'authentification).
//
// Qui peut supprimer quoi :
//   - **Super-admin / compte technique** : n'importe quel compte (hors compte technique).
//   - **Édition de la section Comptes** : uniquement les comptes **désactivés**
//     (`statut = 'archivee'`), et jamais un super-admin.
// Un compte encore actif doit donc d'abord être désactivé (« Libérer / désactiver »),
// ce qui laisse le temps de constater l'erreur avant l'irréversible. Voir R-NIV-07.
export async function DELETE(req: NextRequest) {
  try {
    const { supabase, userId, rights, error } = await requireSectionEdit('comptes');
    if (error) return error;

    const { userId: target } = await req.json();
    if (!target) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }
    if (target === userId) {
      return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });
    }

    const { data: tgt } = await supabase
      .from("residentes")
      .select("is_technique, is_super_admin, statut")
      .eq("user_id", target)
      .maybeSingle();

    // Le compte technique caché ne peut pas être supprimé.
    if (tgt?.is_technique) {
      return NextResponse.json({ error: "Ce compte ne peut pas être supprimé." }, { status: 403 });
    }

    if (!isSuperAdmin(rights)) {
      if (tgt?.is_super_admin) {
        return NextResponse.json({ error: "Seul un super-admin peut supprimer un compte super-admin." }, { status: 403 });
      }
      if (tgt?.statut !== "archivee") {
        return NextResponse.json(
          { error: "Ce compte est encore actif : désactivez-le d'abord (« Libérer / désactiver »), puis supprimez-le." },
          { status: 403 }
        );
      }
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
