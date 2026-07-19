import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabaseServer";

// Archive douce d'un invité du carnet (Q6) : on garde son historique de repas,
// on ne le propose plus dans la liste. Accessible à toute utilisatrice connectée.
export async function DELETE(req: Request) {
  const session = await createSupabaseServer();
  const { data: { user }, error: userError } = await session.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });

  const { id } = (await req.json()) as { id?: number };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("invites").update({ is_active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
