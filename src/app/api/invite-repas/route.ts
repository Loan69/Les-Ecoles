import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabaseServer";

// --- Créer des invitations repas ---
// body: { nom, prenom, guestId?, dates: string[], service: "dejeuner"|"diner" }
// La compta est rattachée à la résidence de l'inviteur (résolue côté serveur).
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });

  const body = await req.json();
  const { nom, prenom, guestId, dates, service } = body as {
    nom?: string; prenom?: string; guestId?: number; dates?: string[]; service?: string;
  };

  if (!nom?.trim() || !prenom?.trim()) return NextResponse.json({ error: "Nom et prénom requis." }, { status: 400 });
  if (service !== "dejeuner" && service !== "diner") return NextResponse.json({ error: "Repas invalide (midi ou soir)." }, { status: 400 });
  if (!Array.isArray(dates) || dates.length === 0) return NextResponse.json({ error: "Sélectionnez au moins une date." }, { status: 400 });

  // Résidence de compta = celle de l'inviteur.
  const { data: profil } = await supabase.from("residentes").select("residence").eq("user_id", user.id).maybeSingle();
  const comptaResidence = profil?.residence ?? null;

  // Carnet d'invités : réutilise l'existant, sinon crée (et réactive si archivé).
  let inviteId = guestId;
  if (!inviteId) {
    const { data: g, error: gErr } = await supabase
      .from("invites")
      .upsert([{ nom: nom.trim(), prenom: prenom.trim(), is_active: true }], { onConflict: "nom, prenom" })
      .select("id")
      .single();
    if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });
    inviteId = g.id;
  }

  const rows = dates.map((date) => ({
    nom: nom.trim(),
    prenom: prenom.trim(),
    date_repas: date,
    type_repas: service,
    compta_residence: comptaResidence,
    invite_par: user.id,
    id_invite: inviteId,
  }));

  const { error } = await supabase.from("invites_repas").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// --- Supprimer une invitation (la sienne) ---
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });

  const { id } = (await req.json()) as { id?: number };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("invites_repas").delete().eq("id", id).eq("invite_par", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
