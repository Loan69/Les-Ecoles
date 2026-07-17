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

  const admin = createSupabaseAdmin();

  const { data: inv } = await admin
    .from("invitations")
    .select("id, place_id")
    .eq("auth_user_id", user.id)
    .eq("statut", "envoyee")
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: "Invitation introuvable ou déjà utilisée. Contactez l'intendance." }, { status: 400 });

  const { data: place } = await admin.from("places").select("*").eq("id", inv.place_id).maybeSingle();
  if (!place) return NextResponse.json({ error: "Place introuvable." }, { status: 400 });

  const { count: occ } = await admin
    .from("residentes")
    .select("id", { count: "exact", head: true })
    .eq("place_id", place.id)
    .eq("statut", "active");
  if (occ && occ > 0) return NextResponse.json({ error: "Cette place a déjà été attribuée. Contactez l'intendance." }, { status: 409 });

  const row = {
    email: user.email,
    is_admin: false,
    nom: nom.trim(),
    prenom: prenom.trim(),
    date_naissance: datenaissance || null,
    residence: place.residence,
    etage: place.kind === "chambre" ? place.etage : null,
    chambre: place.kind === "chambre" ? place.code : null,
    place_id: place.id,
    statut: "active",
  };

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
