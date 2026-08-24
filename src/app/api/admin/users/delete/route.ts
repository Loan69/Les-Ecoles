import { NextRequest, NextResponse } from "next/server";
import { requireSectionEdit } from "@/lib/apiAuth";
import { isSuperAdmin } from "@/lib/roles";

// Suppression définitive d'un compte (ligne `residentes` + compte d'authentification).
//
// Qui peut supprimer quoi :
//   - **Super-admin / compte technique** : n'importe quel compte, actif ou non, y compris
//     un autre super-admin — hors compte technique, jamais supprimable.
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

    // Invitation encore rattachée à ce compte : une super-administratrice invitée puis
    // supprimée laissait derrière elle une ligne `invitations` pointant sur un compte
    // d'authentification disparu. On nettoie avant, pas après.
    const { error: invErr } = await supabase.from("invitations").delete().eq("auth_user_id", target);
    if (invErr) {
      return NextResponse.json({ error: `Invitation liée non supprimée : ${invErr.message}` }, { status: 500 });
    }

    // Les messages renvoient désormais la cause exacte. Le message générique d'avant
    // (« Erreur lors de la suppression de la résidente ») masquait la contrainte ou la
    // policy en cause, et rendait tout diagnostic impossible depuis l'écran.
    const { error: deleteResidenteError } = await supabase.from("residentes").delete().eq("user_id", target);
    if (deleteResidenteError) {
      return NextResponse.json(
        { error: `Suppression du profil impossible : ${deleteResidenteError.message}` },
        { status: 500 }
      );
    }

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(target);
    if (deleteAuthError) {
      // Le profil est déjà parti : on le dit, sans quoi l'écran laisserait croire que
      // rien n'a été fait alors que le compte est à moitié supprimé.
      return NextResponse.json(
        { error: `Profil supprimé, mais le compte de connexion subsiste : ${deleteAuthError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Utilisatrice supprimée avec succès" });
  } catch (error) {
    console.error("Erreur DELETE user:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
