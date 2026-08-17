import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabaseServer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cibleEstVide, dansCible, estExclue, type Cible } from "@/lib/visibilite";

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
  if (!b.nom?.trim() || !b.prenom?.trim()) return "Nom et prénom requis.";
  if (b.service !== "dejeuner" && b.service !== "diner") return "Repas invalide (midi ou soir).";
  if (!b.date) return "Date requise.";
  if (!b.option_id) return "Option requise.";
  return null;
}

// Vérifie qu'une option est bien ouverte ce jour-là ET proposée à l'invitante.
// Renvoie le message d'erreur, ou null si tout va bien.
async function optionRefusee(
  supabase: SupabaseClient,
  userId: string,
  profil: { residence?: string | null; etage?: string | null; chambre?: string | null } | null,
  body: Body
): Promise<string | null> {
  const { data: so } = await supabase
    .from("meal_service_options")
    .select("option:meal_options(is_active, visibilite)")
    .eq("date", body.date!)
    .eq("service", body.service!)
    .eq("option_id", body.option_id!)
    .maybeSingle();

  const opt = so?.option as { is_active?: boolean; visibilite?: Cible | null } | null;
  if (!opt) return "Cette option n'est pas proposée ce jour.";
  if (!opt.is_active) return "Cette option n'est plus disponible.";
  if (cibleEstVide(opt.visibilite)) return null;

  const { data: mesGroupes } = await supabase.from("groupe_membres").select("groupe_id").eq("user_id", userId);
  const viewer = {
    residence: profil?.residence,
    etage: profil?.etage,
    chambre: profil?.chambre,
    user_id: userId,
    groupes: (mesGroupes ?? []).map((g) => g.groupe_id as string),
  };
  if (estExclue(opt.visibilite, viewer) || !dansCible(opt.visibilite, viewer)) {
    return "Cette option ne vous est pas proposée.";
  }
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

  const { data: profil } = await supabase.from("residentes").select("residence, etage, chambre").eq("user_id", user.id).maybeSingle();
  const comptaResidence = profil?.residence ?? null;

  // On n'invite que sur une option que l'invitante peut elle-même choisir : réservée à
  // l'intendance ou ciblée ailleurs, elle est refusée (l'écran ne la propose déjà pas).
  const refus = await optionRefusee(supabase, user.id, profil, body);
  if (refus) return NextResponse.json({ error: refus }, { status: 403 });

  const g = await resolveGuest(supabase, body.guestId, body.nom!.trim(), body.prenom!.trim());
  if (g.error || !g.id) return NextResponse.json({ error: g.error ?? "Invité introuvable." }, { status: 500 });

  const { error } = await supabase.from("invites_repas").insert({
    nom: body.nom!.trim(),
    prenom: body.prenom!.trim(),
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

  const g = await resolveGuest(supabase, body.guestId, body.nom!.trim(), body.prenom!.trim());
  if (g.error || !g.id) return NextResponse.json({ error: g.error ?? "Invité introuvable." }, { status: 500 });

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("invites_repas")
    .update({
      nom: body.nom!.trim(),
      prenom: body.prenom!.trim(),
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

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("invites_repas").delete().eq("id", id).eq("invite_par", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
