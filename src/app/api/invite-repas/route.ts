import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabaseServer";
import { optionRefuseePour } from "@/lib/mealOptionAccess";
import { nomInviteManquant } from "@/lib/invites";

type Body = {
  id?: number;
  nom?: string;
  prenom?: string;
  guestId?: number;
  date?: string;
  service?: string;
  option_id?: string;
};

// Résout / crée l'invité du carnet, renvoie son id.
async function resolveGuest(supabase: import("@supabase/supabase-js").SupabaseClient, guestId: number | undefined, nom: string, prenom: string) {
  if (guestId) return { id: guestId, error: null as string | null };
  const { data, error } = await supabase
    .from("invites")
    .upsert([{ nom, prenom, is_active: true }], { onConflict: "nom, prenom" })
    .select("id")
    .single();
  return { id: data?.id as number | undefined, error: error?.message ?? null };
}

function validate(b: Body): string | null {
  // Nom OU prénom : on ne connaît pas toujours les deux (cf. src/lib/invites.ts).
  if (nomInviteManquant(b.nom, b.prenom)) return "Indiquez au moins le nom ou le prénom de l'invité.";
  if (b.service !== "dejeuner" && b.service !== "diner") return "Repas invalide (midi ou soir).";
  if (!b.date) return "Date requise.";
  if (!b.option_id) return "Option requise.";
  return null;
}

// --- Créer une invitation repas (une date, un service, une option) ---
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });

  const body: Body = await req.json();
  const v = validate(body);
  if (v) return NextResponse.json({ error: v }, { status: 400 });

  const { data: profil } = await supabase.from("residentes").select("residence").eq("user_id", user.id).maybeSingle();
  const comptaResidence = profil?.residence ?? null;

  // On n'invite que sur une option que l'invitante peut elle-même choisir : réservée à
  // l'intendance ou ciblée ailleurs, elle est refusée (l'écran ne la propose déjà pas).
  const refus = await optionRefuseePour(supabase, user.id, body.date!, body.service!, body.option_id!);
  if (refus) return NextResponse.json({ error: refus }, { status: 403 });

  const g = await resolveGuest(supabase, body.guestId, (body.nom ?? "").trim(), (body.prenom ?? "").trim());
  if (g.error || !g.id) return NextResponse.json({ error: g.error ?? "Invité introuvable." }, { status: 500 });

  const { error } = await supabase.from("invites_repas").insert({
    nom: (body.nom ?? "").trim(),
    prenom: (body.prenom ?? "").trim(),
    date_repas: body.date,
    type_repas: body.service,
    option_id: body.option_id,
    compta_residence: comptaResidence,
    invite_par: user.id,
    id_invite: g.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// --- Modifier une invitation (la sienne) ---
export async function PUT(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });

  const body: Body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  const v = validate(body);
  if (v) return NextResponse.json({ error: v }, { status: 400 });

  // Même contrôle qu'à la création : on ne déplace pas un invité vers une option
  // qui n'est pas ouverte à l'invitante.
  const refus = await optionRefuseePour(supabase, user.id, body.date!, body.service!, body.option_id!);
  if (refus) return NextResponse.json({ error: refus }, { status: 403 });

  const g = await resolveGuest(supabase, body.guestId, (body.nom ?? "").trim(), (body.prenom ?? "").trim());
  if (g.error || !g.id) return NextResponse.json({ error: g.error ?? "Invité introuvable." }, { status: 500 });

  const admin = await createSupabaseAdmin();
  const { error } = await admin
    .from("invites_repas")
    .update({
      nom: (body.nom ?? "").trim(),
      prenom: (body.prenom ?? "").trim(),
      date_repas: body.date,
      type_repas: body.service,
      option_id: body.option_id,
      id_invite: g.id,
    })
    .eq("id", body.id)
    .eq("invite_par", user.id);
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

  const admin = await createSupabaseAdmin();
  const { error } = await admin.from("invites_repas").delete().eq("id", id).eq("invite_par", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
