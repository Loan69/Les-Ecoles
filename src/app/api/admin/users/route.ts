import { NextResponse } from "next/server";
import { requireSectionView } from "@/lib/apiAuth";
import { rightsFromRow, isSuperAdmin, canEditSection } from "@/lib/roles";

// Liste des utilisatrices pour l'écran d'administration (section « Comptes »).
// - Lecture réservée à Comptes >= 2 (ou super-admin / technique).
// - Le compte technique caché est exclu de la liste.
// - Le réglage des droits (côté UI) n'est proposé qu'au super-admin.
//
// Passe par requireSectionView plutôt que par un contrôle maison : la route lit les
// lignes de TOUTES les utilisatrices et interroge `auth.admin`, deux choses que seul
// le client service role peut faire. L'ancienne version s'appuyait sur le fait que
// createSupabaseServer renvoyait ce client — ce qui n'est plus vrai.
export async function GET() {
  const { supabase, rights: myRights, error } = await requireSectionView("comptes");
  if (error) return error;

  const isTechnique = myRights.is_technique;

  const { data: residentes, error: err1 } = await supabase
    .from("residentes")
    .select("*")
    .eq("is_technique", false) // compte technique caché : jamais listé
    .order("nom", { ascending: true });

  const { data: invitees, error: err2 } = await supabase
    .from("invitees")
    .select("user_id, nom, prenom, email")
    .order("nom", { ascending: true });

  if (err1 || err2) return NextResponse.json({ error: err1?.message || err2?.message }, { status: 500 });

  // Dernière connexion : enrichissement réservé au compte technique.
  const authUsers: Record<string, string | null> = {};
  if (isTechnique) {
    const allUserIds = [
      ...(residentes ?? []).map((r) => r.user_id),
      ...(invitees ?? []).map((i) => i.user_id),
    ];
    await Promise.all(
      allUserIds.map(async (uid) => {
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(uid);
          if (authData?.user?.last_sign_in_at) authUsers[uid] = authData.user.last_sign_in_at;
        } catch {
          // Ignorer les erreurs individuelles
        }
      })
    );
  }

  const users = [
    ...(residentes ?? []).map((r) => {
      const rights = rightsFromRow(r as Record<string, unknown>);
      return {
        id: r.user_id,
        name: `${r.prenom} ${r.nom}`,
        email: r.email,
        role: "résidente" as const,
        rights,
        source_pk: r.user_id,
        ...(isTechnique && { last_sign_in_at: authUsers[r.user_id] || null }),
      };
    }),
    ...(invitees ?? []).map((i) => ({
      id: `inv_${i.user_id}`,
      name: `${i.prenom} ${i.nom}`,
      email: i.email,
      role: "invitée" as const,
      rights: null,
      source_pk: i.user_id,
      ...(isTechnique && { last_sign_in_at: authUsers[i.user_id] || null }),
    })),
  ];

  if (isTechnique) {
    users.sort((a, b) => {
      const dateA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
      const dateB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
      return dateB - dateA;
    });
  }

  return NextResponse.json({
    users,
    canManageRoles: isSuperAdmin(myRights),
    canEditComptes: canEditSection(myRights, "comptes"),
    isTechnique,
  });
}
