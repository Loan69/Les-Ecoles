import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabaseServer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rightsFromRow, isSuperAdmin, canAccessSection, canViewSection, canEditSection, RIGHTS_COLUMNS, type Rights, type Section, EMPTY_RIGHTS } from "@/lib/roles";

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
  return { supabase: await createSupabaseAdmin(), userId, rights, error: null };
}

// La section existe-t-elle pour l'appelante ? (niveau >= 1). Utilisé par les routes
// « résidente » (ses propres repas, ses propres absences) : au niveau 0 la page est masquée,
// l'API doit refuser aussi, sinon le masquage n'est que cosmétique. Voir R-NIV-11.
// N'utilise PAS le client service role : la route continue de travailler sous RLS
// avec la session de l'utilisatrice.
export async function requireSectionAccess(section: Section): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const { userId, rights } = await callerRights();
  if (!userId) return { userId: null, error: unauth().error };
  if (!canAccessSection(rights, section)) return { userId: null, error: forbidden().error };
  return { userId, error: null };
}

// Lecture d'une section : niveau >= 2 (ou super-admin / technique).
export function requireSectionView(section: Section): Promise<GuardResult> {
  return guard((r) => canViewSection(r, section));
}

// Écriture d'une section : niveau >= 3 (ou super-admin / technique).
export function requireSectionEdit(section: Section): Promise<GuardResult> {
  return guard((r) => canEditSection(r, section));
}

// Réservé au COMPTE TECHNIQUE seul — celui de la personne qui installe et maintient
// l'application, distinct des super-admins clients. Sert à ce qu'un foyer ne puisse
// pas se donner lui-même de nouveaux super-admins.
export function requireTechnique(): Promise<GuardResult> {
  return guard((r) => r.is_technique);
}

// Réservé au super-admin (attribution des droits, suppression de compte…) ou au compte technique.
export function requireSuperAdmin(): Promise<GuardResult> {
  return guard(isSuperAdmin);
}

// Peut **cibler** un contenu sur des groupes : quiconque édite un objet dont la visibilité
// se règle (événements, options de repas, rubriques Administratif), plus la section Comptes
// qui gère les groupes eux-mêmes. Sert à lire la composition des groupes — nécessaire pour
// afficher qui est concerné par un ciblage, sans exiger la section Comptes d'une personne
// qui ne fait que créer un événement.
export function requireGroupesRead(): Promise<GuardResult> {
  return guard(
    (r) =>
      canViewSection(r, "comptes") ||
      canEditSection(r, "evenements") ||
      canEditSection(r, "repas") ||
      canEditSection(r, "infos")
  );
}
