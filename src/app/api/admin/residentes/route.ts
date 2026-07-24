import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAdminView } from "@/lib/apiAuth";

// --- Liste des comptes archivés (pour réassignation rapide) : GET ---
export async function GET() {
  const { supabase, error } = await requireAdminView();
  if (error) return error;

  const { data } = await supabase
    .from("residentes")
    .select("user_id, nom, prenom, email")
    .eq("statut", "archivee")
    .eq("is_technique", false)
    .order("nom", { ascending: true })
    .order("prenom", { ascending: true });

  return NextResponse.json({ archived: data ?? [] });
}

// --- Archiver (libérer la place) une résidente : PATCH { user_id } ---
// Le compte est désactivé (plus de connexion) mais conservé pour la compta ;
// la place redevient libre (plus de compte actif rattaché).
export async function PATCH(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { user_id } = (await req.json()) as { user_id?: string };
  if (!user_id) return NextResponse.json({ error: "Utilisatrice manquante." }, { status: 400 });

  const { data: r } = await supabase.from("residentes").select("id, is_technique, statut").eq("user_id", user_id).maybeSingle();
  if (!r) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  if (r.is_technique) return NextResponse.json({ error: "Le compte super-admin ne peut pas être archivé." }, { status: 403 });

  const { error: dbErr } = await supabase
    .from("residentes")
    .update({ statut: "archivee", archived_at: new Date().toISOString() })
    .eq("user_id", user_id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // Bloque la connexion du compte archivé (réversible via ré-invitation ultérieure).
  await supabase.auth.admin.updateUserById(user_id, { ban_duration: "876000h" }).catch(() => {});

  return NextResponse.json({ success: true });
}

// --- Déplacer une résidente active vers une autre place libre : POST { user_id, place_id } ---
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { user_id, place_id } = (await req.json()) as { user_id?: string; place_id?: string };
  if (!user_id || !place_id) return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });

  const { data: r } = await supabase.from("residentes").select("id, is_technique, statut").eq("user_id", user_id).maybeSingle();
  if (!r) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  if (r.is_technique) return NextResponse.json({ error: "Le compte super-admin n'occupe pas de place." }, { status: 403 });
  if (r.statut !== "active") return NextResponse.json({ error: "Seule une résidente active peut être déplacée." }, { status: 400 });

  const { data: place } = await supabase.from("places").select("*").eq("id", place_id).maybeSingle();
  if (!place) return NextResponse.json({ error: "Place de destination introuvable." }, { status: 404 });
  if (!place.is_active) return NextResponse.json({ error: "La place de destination est désactivée." }, { status: 400 });

  const { count: occ } = await supabase.from("residentes").select("id", { count: "exact", head: true }).eq("place_id", place_id).eq("statut", "active");
  if (occ && occ > 0) return NextResponse.json({ error: "La place de destination est déjà occupée." }, { status: 409 });

  const { error: dbErr } = await supabase
    .from("residentes")
    .update({
      place_id: place.id,
      residence: place.residence,
      etage: place.kind === "chambre" ? place.etage : null,
      chambre: place.kind === "chambre" ? place.code : null,
    })
    .eq("user_id", user_id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
