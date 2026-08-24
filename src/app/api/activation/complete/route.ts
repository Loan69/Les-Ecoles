import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabaseServer";

// Finalise l'activation d'un compte invité : crée la ligne residentes (place imposée),
// occupe la place et marque l'invitation acceptée. Appelée par la page /activation
// une fois la session établie (lien d'invitation) et le mot de passe défini.
export async function POST(req: NextRequest) {
  const session = await createSupabaseServer();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Lien invalide ou expiré. Rouvrez le lien reçu par email." }, { status: 401 });

  const { nom, prenom, datenaissance } = (await req.json()) as { nom?: string; prenom?: string; datenaissance?: string };
  if (!nom?.trim() || !prenom?.trim()) return NextResponse.json({ error: "Nom et prénom requis." }, { status: 400 });

  const admin = await createSupabaseAdmin();

  const { data: inv } = await admin
    .from("invitations")
    .select("id, place_id, role")
    .eq("auth_user_id", user.id)
    .eq("statut", "envoyee")
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: "Invitation introuvable ou déjà utilisée. Contactez l'intendance." }, { status: 400 });

  // Identité commune aux deux cas.
  const base = {
    email: user.email,
    nom: nom.trim(),
    prenom: prenom.trim(),
    date_naissance: datenaissance || null,
    statut: "active",
  };

  let row: Record<string, unknown>;

  if (inv.place_id === null) {
    // Invitation de super-administratrice (cf. supabase/p2c-super-admin-sans-place.sql) :
    // aucune chambre, donc aucune place à réserver ni à vérifier. Ce compte n'entre
    // pas dans la capacité du foyer, comme le compte technique.
    row = {
      ...base,
      residence: null,
      etage: null,
      chambre: null,
      place_id: null,
      is_super_admin: true,
    };
  } else {
    const { data: place } = await admin.from("places").select("*").eq("id", inv.place_id).maybeSingle();
    if (!place) return NextResponse.json({ error: "Place introuvable." }, { status: 400 });

    const { count: occ } = await admin
      .from("residentes")
      .select("id", { count: "exact", head: true })
      .eq("place_id", place.id)
      .eq("statut", "active");
    if (occ && occ > 0) return NextResponse.json({ error: "Cette place a déjà été attribuée. Contactez l'intendance." }, { status: 409 });

    row = {
      ...base,
      residence: place.residence,
      etage: place.kind === "chambre" ? place.etage : null,
      chambre: place.kind === "chambre" ? place.code : null,
      place_id: place.id,
    };
  }

  const { data: existing } = await admin.from("residentes").select("id").eq("user_id", user.id).maybeSingle();
  if (existing) {
    const { error } = await admin.from("residentes").update(row).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await admin.from("residentes").insert({ user_id: user.id, created_at: new Date().toISOString(), ...row });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("invitations").update({ statut: "acceptee" }).eq("id", inv.id);

  return NextResponse.json({ success: true });
}
