import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import type { PlaceKind } from "@/types/Place";

type Body = {
  id?: string;
  residence?: string;
  kind?: PlaceKind;
  etage?: string | null;
  code?: string;
  label?: string | null;
  is_active?: boolean;
};

// Règles : 12/36 → chambre (avec étage) ; corail → poste (sans étage).
function validate(body: Body): string | null {
  if (!["12", "36", "corail"].includes(body.residence ?? "")) return "Résidence invalide (12, 36 ou corail).";
  if (body.kind !== "chambre" && body.kind !== "poste") return "Type invalide (chambre ou poste).";
  if (body.residence === "corail" && body.kind !== "poste") return "La résidence corail ne comporte que des postes.";
  if ((body.residence === "12" || body.residence === "36") && body.kind !== "chambre") return "Les résidences 12 et 36 ne comportent que des chambres.";
  if (body.kind === "chambre" && !(body.etage ?? "").trim()) return "L'étage est requis pour une chambre.";
  if (!(body.code ?? "").trim()) return body.kind === "poste" ? "Le libellé du poste est requis." : "Le code de la chambre est requis.";
  return null;
}

// --- Liste des places + état d'occupation (occupant actif / invitation en attente) ---
export async function GET() {
  const { supabase, error } = await requireAdmin();
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
    invitation: invByPlace.get(p.id)
      ? { email: invByPlace.get(p.id)!.email, expires_at: invByPlace.get(p.id)!.expires_at }
      : null,
  }));

  return NextResponse.json({ places: result });
}

// --- Créer une place ---
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body: Body = await req.json();
  const v = validate(body);
  if (v) return NextResponse.json({ error: v }, { status: 400 });

  const { data, error: dbError } = await supabase
    .from("places")
    .insert({
      residence: body.residence,
      kind: body.kind,
      etage: body.kind === "chambre" ? body.etage!.trim() : null,
      code: body.code!.trim(),
      label: body.label?.trim() || null,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (dbError) {
    const msg = dbError.code === "23505" ? "Une place avec ce code existe déjà dans cette résidence." : dbError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ success: true, place: data });
}

// --- Modifier une place (code, libellé, étage, activation) ---
export async function PUT(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body: Body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (body.code !== undefined) {
    if (!body.code.trim()) return NextResponse.json({ error: "Le code / libellé est requis." }, { status: 400 });
    update.code = body.code.trim();
  }
  if (body.label !== undefined) update.label = body.label?.trim() || null;
  if (body.etage !== undefined) update.etage = body.etage ? body.etage.trim() : null;
  if (body.is_active !== undefined) update.is_active = body.is_active;

  const { error: dbError } = await supabase.from("places").update(update).eq("id", body.id);
  if (dbError) {
    const msg = dbError.code === "23505" ? "Une place avec ce code existe déjà dans cette résidence." : dbError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

// --- Supprimer une place (uniquement si jamais utilisée) ---
export async function DELETE(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  // Refus si une résidente (active OU archivée) ou une invitation y est rattachée → préférer la désactivation.
  const { count: resCount } = await supabase.from("residentes").select("id", { count: "exact", head: true }).eq("place_id", id);
  if (resCount && resCount > 0)
    return NextResponse.json({ error: "Place déjà utilisée (occupant ou historique). Désactivez-la plutôt que de la supprimer." }, { status: 409 });

  const { count: invCount } = await supabase.from("invitations").select("id", { count: "exact", head: true }).eq("place_id", id);
  if (invCount && invCount > 0)
    return NextResponse.json({ error: "Une invitation est rattachée à cette place. Désactivez-la plutôt." }, { status: 409 });

  const { error: dbError } = await supabase.from("places").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
