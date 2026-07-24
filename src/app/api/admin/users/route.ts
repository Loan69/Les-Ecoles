import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { canView, canEdit, canManageRoles, asNiveau } from "@/lib/roles";

// Liste des utilisatrices pour l'écran d'administration.
// - Lecture réservée aux admins (niveau >= 2, ou compte technique).
// - Le compte technique caché est exclu de la liste.
// - Le réglage des niveaux (côté UI) n'est proposé qu'au super-admin / compte technique.
export async function GET() {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("residentes")
    .select("niveau, is_technique")
    .eq("user_id", user.id)
    .maybeSingle();

  const myNiveau = (me?.niveau ?? 1) as number;
  const isTechnique = !!me?.is_technique;
  if (!canView(myNiveau, isTechnique)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: residentes, error: err1 } = await supabase
    .from("residentes")
    .select("user_id, nom, prenom, email, niveau")
    .eq("is_technique", false) // compte technique caché : jamais listé
    .order("nom", { ascending: true });

  const { data: invitees, error: err2 } = await supabase
    .from("invitees")
    .select("user_id, nom, prenom, email")
    .order("nom", { ascending: true });

  if (err1 || err2)
    return NextResponse.json({ error: err1?.message || err2?.message }, { status: 500 });

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
    ...(residentes ?? []).map((r) => ({
      id: r.user_id,
      name: `${r.prenom} ${r.nom}`,
      email: r.email,
      role: "résidente" as const,
      niveau: asNiveau(r.niveau),
      source_pk: r.user_id,
      ...(isTechnique && { last_sign_in_at: authUsers[r.user_id] || null }),
    })),
    ...(invitees ?? []).map((i) => ({
      id: `inv_${i.user_id}`,
      name: `${i.prenom} ${i.nom}`,
      email: i.email,
      role: "invitée" as const,
      niveau: 1 as const,
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
    canEdit: canEdit(myNiveau, isTechnique),
    canManageRoles: canManageRoles(myNiveau, isTechnique),
    isTechnique,
  });
}
