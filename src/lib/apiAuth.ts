import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabaseServer";
import type { SupabaseClient } from "@supabase/supabase-js";

type RequireAdminResult =
  | { supabase: SupabaseClient; userId: string; error: null }
  | { supabase: null; userId: null; error: NextResponse };

// Vérifie que l'appelant est authentifié ET administratrice, puis renvoie un client
// **service role** pour les opérations BDD (lecture/écriture cross-utilisateur, RLS bypassée).
// L'auth/autorisation est faite ici ; le service role est donc sûr (réservé aux admins).
export async function requireAdmin(): Promise<RequireAdminResult> {
  const session = await createSupabaseServer();
  const {
    data: { user },
    error: userError,
  } = await session.auth.getUser();

  if (userError || !user) {
    return { supabase: null, userId: null, error: NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 }) };
  }

  const { data: adminCheck } = await session
    .from("residentes")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminCheck?.is_admin) {
    return { supabase: null, userId: null, error: NextResponse.json({ error: "Accès non autorisé" }, { status: 403 }) };
  }

  return { supabase: createSupabaseAdmin(), userId: user.id, error: null };
}
