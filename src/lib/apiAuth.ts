import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabaseServer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rightsFromRow, isSuperAdmin, canViewSection, canEditSection, RIGHTS_COLUMNS, type Rights, type Section, EMPTY_RIGHTS } from "@/lib/roles";

type GuardResult =
  | { supabase: SupabaseClient; userId: string; rights: Rights; error: null }
  | { supabase: null; userId: null; rights: null; error: NextResponse };

const unauth = () => ({ supabase: null, userId: null, rights: null, error: NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 }) } as const);
const forbidden = () => ({ supabase: null, userId: null, rights: null, error: NextResponse.json({ error: "Accès non autorisé" }, { status: 403 }) } as const);

// Droits de l'appelant (par section + rôles globaux).
async function callerRights(): Promise<{ userId: string | null; rights: Rights }> {
  const session = await createSupabaseServer();
  const { data: { user }, error: userError } = await session.auth.getUser();
  if (userError || !user) return { userId: null, rights: EMPTY_RIGHTS };
  const { data } = await session.from("residentes").select(RIGHTS_COLUMNS).eq("user_id", user.id).maybeSingle();
  return { userId: user.id, rights: rightsFromRow(data as Record<string, unknown> | null) };
}

// Garde générique : renvoie un client **service role** (RLS bypassée) si `predicate` est satisfait.
async function guard(predicate: (r: Rights) => boolean): Promise<GuardResult> {
  const { userId, rights } = await callerRights();
  if (!userId) return unauth();
  if (!predicate(rights)) return forbidden();
  return { supabase: createSupabaseAdmin(), userId, rights, error: null };
}

// Lecture d'une section : niveau >= 2 (ou super-admin / technique).
export function requireSectionView(section: Section): Promise<GuardResult> {
  return guard((r) => canViewSection(r, section));
}

// Écriture d'une section : niveau >= 3 (ou super-admin / technique).
export function requireSectionEdit(section: Section): Promise<GuardResult> {
  return guard((r) => canEditSection(r, section));
}

// Réservé au super-admin (attribution des droits, suppression de compte…) ou au compte technique.
export function requireSuperAdmin(): Promise<GuardResult> {
  return guard(isSuperAdmin);
}
