import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/apiAuth";
import { CLES_IDENTITE, type CleIdentite } from "@/lib/foyer";

// Identité du foyer : nom, description, couleur, fuseau, locale.
// Réservée au super-admin — ce n'est pas un réglage d'intendance courante, et une
// « Admin · gérer Repas » n'a pas à renommer le foyer. La policy SQL dit la même
// chose (supabase/p2b-identite-admin.sql) : la garde est ici ET en base.

export async function GET() {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("app_settings")
    .select("key, value, label")
    .in("key", [...CLES_IDENTITE]);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ reglages: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const body = (await req.json()) as Record<string, unknown>;

  // On n'accepte que les clés connues : sans ce filtre, un appel direct pourrait
  // écrire n'importe quelle ligne d'app_settings, verrous compris.
  const aEcrire = CLES_IDENTITE.filter((c) => typeof body[c] === "string").map((c) => ({
    key: c,
    value: String(body[c as CleIdentite]).trim(),
  }));
  if (aEcrire.length === 0) return NextResponse.json({ error: "Aucun réglage reconnu." }, { status: 400 });

  const nom = aEcrire.find((r) => r.key === "foyer_nom");
  if (nom && nom.value === "") return NextResponse.json({ error: "Le nom du foyer ne peut pas être vide." }, { status: 400 });

  const fuseau = aEcrire.find((r) => r.key === "foyer_fuseau");
  if (fuseau) {
    // Un fuseau erroné ferait échouer tous les calculs de verrouillage, sans message
    // clair. On le valide ici, pendant qu'on peut encore refuser proprement.
    try { new Date().toLocaleString("en-US", { timeZone: fuseau.value }); }
    catch { return NextResponse.json({ error: `Fuseau horaire inconnu : ${fuseau.value}` }, { status: 400 }); }
  }

  for (const ligne of aEcrire) {
    const { error: upErr } = await supabase
      .from("app_settings")
      .update({ value: ligne.value, updated_at: new Date().toISOString() })
      .eq("key", ligne.key);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
