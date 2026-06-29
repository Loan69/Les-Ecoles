import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

// UUID du super-admin — serveur uniquement, jamais exposé au client
const SUPER_ADMIN_UID = process.env.SUPER_ADMIN_UID ?? "17e3e1c7-3219-46e4-8aad-324f93b7b5de";

export async function GET() {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: currentRes } = await supabase
    .from("residentes")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!currentRes?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isSuperAdmin = user.id === SUPER_ADMIN_UID;

  const { data: residentes, error: err1 } = await supabase
    .from("residentes")
    .select("user_id, nom, prenom, email, is_admin")
    .order("nom", { ascending: true });

  const { data: invitees, error: err2 } = await supabase
    .from("invitees")
    .select("user_id, nom, prenom, email")
    .order("nom", { ascending: true });

  if (err1 || err2)
    return NextResponse.json({ error: err1?.message || err2?.message }, { status: 500 });

  const authUsers: Record<string, string | null> = {};

  if (isSuperAdmin) {
    const allUserIds = [
      ...residentes.map((r) => r.user_id),
      ...invitees.map((i) => i.user_id),
    ];

    await Promise.all(
      allUserIds.map(async (userId) => {
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(userId);
          if (authData?.user?.last_sign_in_at) {
            authUsers[userId] = authData.user.last_sign_in_at;
          }
        } catch {
          // Ignorer les erreurs individuelles
        }
      })
    );
  }

  const users = [
    ...residentes.map((r) => ({
      id: r.user_id,
      name: `${r.prenom} ${r.nom}`,
      email: r.email,
      role: "résidente",
      is_admin: r.is_admin,
      source_pk: r.user_id,
      ...(isSuperAdmin && { last_sign_in_at: authUsers[r.user_id] || null }),
    })),
    ...invitees.map((i) => ({
      id: `inv_${i.user_id}`,
      name: `${i.prenom} ${i.nom}`,
      email: i.email,
      role: "invitée",
      is_admin: false,
      source_pk: i.user_id,
      ...(isSuperAdmin && { last_sign_in_at: authUsers[i.user_id] || null }),
    })),
  ];

  if (isSuperAdmin) {
    users.sort((a, b) => {
      const dateA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
      const dateB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
      return dateB - dateA;
    });
  }

  return NextResponse.json({ users, isSuperAdmin });
}
