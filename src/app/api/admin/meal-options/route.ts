import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";

type Body = {
  id?: string;
  label?: string;
  residence?: string;
  delai_commande?: number;
  admin_only?: boolean;
  is_active?: boolean;
};

function validate(body: Body): string | null {
  if (!body.label || !body.label.trim()) return "Le libellé est requis.";
  if (!["12", "36", "personne"].includes(body.residence ?? ""))
    return "Rattachement invalide (12, 36 ou résidence de la personne).";
  if (body.delai_commande != null && (!Number.isInteger(body.delai_commande) || body.delai_commande < 0))
    return "Le délai de commande doit être un entier positif.";
  return null;
}

// --- Liste du catalogue (toutes options, actives ou non) ---
export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("meal_options")
    .select("*")
    .order("residence", { ascending: true })
    .order("label", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ options: data ?? [] });
}

// --- Créer une option ---
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body: Body = await req.json();
  const v = validate(body);
  if (v) return NextResponse.json({ error: v }, { status: 400 });

  const { data, error: dbError } = await supabase
    .from("meal_options")
    .insert({
      label: body.label!.trim(),
      residence: body.residence,
      delai_commande: body.delai_commande ?? 0,
      admin_only: body.admin_only ?? false,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true, option: data });
}

// --- Modifier une option ---
export async function PUT(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body: Body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  const v = validate(body);
  if (v) return NextResponse.json({ error: v }, { status: 400 });

  const { error: dbError } = await supabase
    .from("meal_options")
    .update({
      label: body.label!.trim(),
      residence: body.residence,
      delai_commande: body.delai_commande ?? 0,
      admin_only: body.admin_only ?? false,
      is_active: body.is_active ?? true,
    })
    .eq("id", body.id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// --- Supprimer une option (refusé si déjà choisie par une résidente) ---
export async function DELETE(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body: Body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const { count } = await supabase
    .from("presences_v2")
    .select("id", { count: "exact", head: true })
    .eq("option_id", body.id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Option déjà utilisée dans des inscriptions : désactivez-la plutôt que de la supprimer." },
      { status: 409 }
    );
  }

  const { error: dbError } = await supabase.from("meal_options").delete().eq("id", body.id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
