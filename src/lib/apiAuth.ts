import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabaseServer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canView, canEdit, canManageRoles } from "@/lib/roles";

type RequireAdminResult =
  | { supabase: SupabaseClient; userId: string; niveau: number; isTechnique: boolean; error: null }
  | { supabase: null; userId: null; niveau: null; isTechnique: null; error: NextResponse };

const unauth = () => ({ supabase: null, userId: null, niveau: null, isTechnique: null, error: NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 }) } as const);
const forbidden = () => ({ supabase: null, userId: null, niveau: null, isTechnique: null, error: NextResponse.json({ error: "Accès non autorisé" }, { status: 403 }) } as const);

// Profil de droits de l'appelant (niveau + compte technique).
async function callerProfile() {
  const session = await createSupabaseServer();
  const { data: { user }, error: userError } = await session.auth.getUser();
  if (userError || !user) return { user: null, niveau: 1, isTechnique: false };
  const { data } = await session
    .from("residentes")
    .select("niveau, is_technique")
    .eq("user_id", user.id)
    .maybeSingle();
  return { user, niveau: (data?.niveau ?? 1) as number, isTechnique: !!data?.is_technique };
}

// Garde générique : renvoie un client **service role** (RLS bypassée) si l'appelant
// satisfait `predicate`. L'autorisation est faite ici, le service role est donc sûr.
async function guard(predicate: (niveau: number, isTechnique: boolean) => boolean): Promise<RequireAdminResult> {
  const { user, niveau, isTechnique } = await callerProfile();
  if (!user) return unauth();
  if (!predicate(niveau, isTechnique)) return forbidden();
  return { supabase: createSupabaseAdmin(), userId: user.id, niveau, isTechnique, error: null };
}

// Lecture admin : niveau >= 2 (ou compte technique).
export function requireAdminView(): Promise<RequireAdminResult> {
  return guard(canView);
}

// Écriture admin : niveau >= 3 (ou compte technique).
export function requireAdminEdit(): Promise<RequireAdminResult> {
  return guard(canEdit);
}

// Réglage des niveaux : super-admin (niveau 4) ou compte technique uniquement.
export function requireSuperAdmin(): Promise<RequireAdminResult> {
  return guard(canManageRoles);
}

// Rétro-compat : ancien `requireAdmin` = accès admin en écriture (niveau >= 3).
export const requireAdmin = requireAdminEdit;
