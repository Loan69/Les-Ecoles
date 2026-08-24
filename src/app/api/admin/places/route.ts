import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSectionView, requireSuperAdmin } from "@/lib/apiAuth";
import { toResidence } from "@/lib/residences";
import type { PlaceKind } from "@/types/Place";

type Body = {
  id?: string;
  residence?: string;
  kind?: PlaceKind;
  etage?: string | null;
  name?: string; // ce que saisit l'admin (nom de chambre ou de poste) — le code interne en est dérivé
  is_active?: boolean;
};

// Code technique interne dérivé du nom (jamais saisi par l'admin).
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Le bloc d'accueil (`residences`) décide du type de ses places : un bloc « chambres »
// n'accueille que des chambres (avec étage), un bloc « postes » que des postes (sans étage).
// Rien n'est écrit en dur ici : un bloc ajouté depuis l'Administration est accepté aussitôt.
async function validate(supabase: SupabaseClient, body: Body): Promise<string | null> {
  if (!(body.residence ?? "").trim()) return "Bloc requis.";
  const { data: bloc } = await supabase.from("residences").select("*").eq("value", body.residence).maybeSingle();
  if (!bloc) return "Bloc inconnu.";
  const r = toResidence(bloc as Record<string, unknown>);
  if (!r.is_active) return `Le bloc « ${r.label} » est désactivé.`;
  if (body.kind !== "chambre" && body.kind !== "poste") return "Type invalide (chambre ou poste).";
  if (body.kind !== r.kind)
    return r.kind === "poste" ? `Le bloc « ${r.label} » ne comporte que des postes.` : `Le bloc « ${r.label} » ne comporte que des chambres.`;
  if (body.kind === "chambre") {
    const etage = (body.etage ?? "").trim();
    if (!etage) return "L'étage est requis pour une chambre.";
    // L'étage doit exister dans la liste du bloc : on ne crée plus d'étage « par
    // effet de bord » en le tapant à la main, sinon deux orthographes = deux étages.
    // Tolérant : tant que supabase/etages-dynamiques.sql n'est pas passé, on accepte
    // la saisie libre d'avant.
    const { data: etages, error: eErr } = await supabase.from("etages").select("value").eq("residence", body.residence);
    if (!eErr && !(etages ?? []).some((e) => e.value === etage))
      return "Cet étage n'existe pas dans ce bloc. Créez-le d'abord depuis « Gérer les blocs, chambres & étages ».";
  }
  if (!(body.name ?? "").trim()) return body.kind === "poste" ? "Le nom du poste est requis." : "Le nom de la chambre est requis.";
  return null;
}

// --- Liste des places + état d'occupation (occupant actif / invitation en attente) ---
export async function GET() {
  const { supabase, error } = await requireSectionView('comptes');
  if (error) return error;

  const { data: places, error: e1 } = await supabase
    .from("places")
    .select("*")
    .order("residence", { ascending: true })
    .order("etage", { ascending: true })
    .order("code", { ascending: true });
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const { data: occupants } = await supabase
    .from("residentes")
    .select("user_id, nom, prenom, place_id")
    .eq("statut", "active")
    .not("place_id", "is", null);

  const { data: invites } = await supabase
    .from("invitations")
    .select("email, expires_at, place_id")
    .eq("statut", "envoyee");

  const occByPlace = new Map((occupants ?? []).map((o) => [o.place_id, o]));
  const invByPlace = new Map((invites ?? []).map((i) => [i.place_id, i]));

  const result = (places ?? []).map((p) => ({
    ...p,
    occupant: occByPlace.get(p.id)
      ? { user_id: occByPlace.get(p.id)!.user_id, nom: occByPlace.get(p.id)!.nom, prenom: occByPlace.get(p.id)!.prenom }
      : null,
    invitation: invByPlace.get(p.id) ? { email: invByPlace.get(p.id)!.email, expires_at: invByPlace.get(p.id)!.expires_at } : null,
  }));

  return NextResponse.json({ places: result });
}

// --- Créer une place (super-admin) ---
// La structure physique du foyer est réservée au super-admin : la lecture (GET) suffit à
// l'écran Utilisatrices, mais créer/modifier/supprimer une chambre ou un poste engage tout
// le reste (occupations, ciblage des événements). Une Édition « Comptes » ne suffit pas.
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const body: Body = await req.json();
  const v = await validate(supabase, body);
  if (v) return NextResponse.json({ error: v }, { status: 400 });

  const name = body.name!.trim();
  const etage = body.kind === "chambre" ? body.etage!.trim() : null;
  // Code interne unique, dérivé du nom (+ étage pour les chambres, pour éviter les collisions inter-étages).
  const code = body.kind === "chambre" ? slugify(`${etage}_${name}`) : slugify(name);

  const { data, error: dbError } = await supabase
    .from("places")
    .insert({ residence: body.residence, kind: body.kind, etage, code, label: name, is_active: true })
    .select()
    .single();

  if (dbError) {
    const msg = dbError.code === "23505" ? "Une place portant ce nom existe déjà à cet endroit." : dbError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ success: true, place: data });
}

// --- Modifier une place (nom affiché, étage, activation) — le code interne reste stable ---
export async function PUT(req: NextRequest) {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const body: Body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!body.name.trim()) return NextResponse.json({ error: "Le nom est requis." }, { status: 400 });
    update.label = body.name.trim();
  }
  if (body.etage !== undefined) update.etage = body.etage ? body.etage.trim() : null;
  if (body.is_active !== undefined) update.is_active = body.is_active;

  const { error: dbError } = await supabase.from("places").update(update).eq("id", body.id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

// --- Supprimer une place (uniquement si jamais utilisée) ---
export async function DELETE(req: NextRequest) {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  // Une place libérée doit pouvoir être supprimée. Avant, le contrôle comptait TOUTES
  // les résidentes rattachées, archivées comprises : une chambre ayant été occupée une
  // fois ne pouvait plus jamais être supprimée, seulement désactivée. Ce n'est pas ce
  // qu'attend l'intendance quand elle vient de libérer la chambre.
  //
  // On distingue donc ce qui bloque vraiment de ce qui n'est qu'une trace.

  // Occupante ACTIVE : la place n'est pas libre. Blocage.
  const { count: actives } = await supabase
    .from("residentes").select("id", { count: "exact", head: true })
    .eq("place_id", id).eq("statut", "active");
  if (actives && actives > 0)
    return NextResponse.json({ error: "Cette place est occupée. Libérez-la d'abord (le compte sera désactivé)." }, { status: 409 });

  // Invitation EN ATTENTE : quelqu'un est sur le point d'arriver. Blocage.
  const { count: enAttente } = await supabase
    .from("invitations").select("id", { count: "exact", head: true })
    .eq("place_id", id).eq("statut", "envoyee");
  if (enAttente && enAttente > 0)
    return NextResponse.json({ error: "Une invitation est en attente pour cette place. Annulez-la d'abord." }, { status: 409 });

  // Résidentes ARCHIVÉES : leur historique de chambre est conservé dans les colonnes
  // texte residence/etage/chambre, indépendantes de place_id. On détache donc la
  // référence — rien n'est perdu, et la clé étrangère cesse de bloquer.
  const { error: detachErr } = await supabase
    .from("residentes").update({ place_id: null }).eq("place_id", id).eq("statut", "archivee");
  if (detachErr) return NextResponse.json({ error: detachErr.message }, { status: 500 });

  // Invitations closes (acceptées, annulées, expirées) : simple trace du geste
  // d'invitation, dont le résultat vit déjà dans la ligne residentes. La contrainte
  // invitations_place_role_chk interdit de les détacher — on les supprime.
  const { error: invErr } = await supabase
    .from("invitations").delete().eq("place_id", id).neq("statut", "envoyee");
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  const { error: dbError } = await supabase.from("places").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
