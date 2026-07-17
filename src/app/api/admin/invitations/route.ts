import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Vérifie qu'une place est libre pour une invitation (existe, active, sans occupant actif, sans invitation en attente).
async function placeAvailability(supabase: import("@supabase/supabase-js").SupabaseClient, placeId: string) {
  const { data: place } = await supabase.from("places").select("id, is_active").eq("id", placeId).maybeSingle();
  if (!place) return { error: "Place introuvable.", status: 404 };
  if (!place.is_active) return { error: "Cette place est désactivée." , status: 400 };

  const { count: occ } = await supabase.from("residentes").select("id", { count: "exact", head: true }).eq("place_id", placeId).eq("statut", "active");
  if (occ && occ > 0) return { error: "Cette place est déjà occupée.", status: 409 };

  return { error: null, status: 200 };
}

async function sendInvite(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  email: string,
  placeId: string,
  origin: string
) {
  return supabase.auth.admin.inviteUserByEmail(email, {
    data: { role: "residente", place_id: placeId },
    redirectTo: `${origin}/activation`,
  });
}

// --- Envoyer une invitation pour une place libre ---
export async function POST(req: NextRequest) {
  const { supabase, userId, error } = await requireAdmin();
  if (error) return error;

  const { place_id, email } = (await req.json()) as { place_id?: string; email?: string };
  if (!place_id) return NextResponse.json({ error: "Place manquante." }, { status: 400 });
  if (!email || !EMAIL_RE.test(email.trim())) return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  const mail = email.trim().toLowerCase();

  const avail = await placeAvailability(supabase, place_id);
  if (avail.error) return NextResponse.json({ error: avail.error }, { status: avail.status });

  const { data: pending } = await supabase.from("invitations").select("id").eq("place_id", place_id).eq("statut", "envoyee").maybeSingle();
  if (pending) return NextResponse.json({ error: "Une invitation est déjà en attente pour cette place." }, { status: 409 });

  const { data: invited, error: invErr } = await sendInvite(supabase, mail, place_id, req.nextUrl.origin);
  if (invErr) {
    const msg = /already/i.test(invErr.message) ? "Cet email a déjà un compte." : invErr.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: dbErr } = await supabase.from("invitations").insert({
    email: mail,
    place_id,
    role: "residente",
    auth_user_id: invited.user?.id ?? null,
    statut: "envoyee",
    invited_by: userId,
  });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// --- Relancer l'invitation en attente d'une place (renvoie l'email) ---
export async function PATCH(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { place_id } = (await req.json()) as { place_id?: string };
  if (!place_id) return NextResponse.json({ error: "Place manquante." }, { status: 400 });

  const { data: inv } = await supabase
    .from("invitations")
    .select("id, email, auth_user_id")
    .eq("place_id", place_id)
    .eq("statut", "envoyee")
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: "Aucune invitation en attente." }, { status: 404 });

  // Renvoyer = supprimer le user invité (non accepté) puis ré-inviter proprement.
  if (inv.auth_user_id) await supabase.auth.admin.deleteUser(inv.auth_user_id).catch(() => {});

  const { data: invited, error: invErr } = await sendInvite(supabase, inv.email, place_id, req.nextUrl.origin);
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 });

  await supabase
    .from("invitations")
    .update({ auth_user_id: invited.user?.id ?? null, expires_at: new Date(Date.now() + 14 * 864e5).toISOString() })
    .eq("id", inv.id);

  return NextResponse.json({ success: true });
}

// --- Annuler l'invitation en attente d'une place ---
export async function DELETE(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { place_id } = (await req.json()) as { place_id?: string };
  if (!place_id) return NextResponse.json({ error: "Place manquante." }, { status: 400 });

  const { data: inv } = await supabase
    .from("invitations")
    .select("id, auth_user_id")
    .eq("place_id", place_id)
    .eq("statut", "envoyee")
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: "Aucune invitation en attente." }, { status: 404 });

  if (inv.auth_user_id) await supabase.auth.admin.deleteUser(inv.auth_user_id).catch(() => {});
  await supabase.from("invitations").update({ statut: "annulee" }).eq("id", inv.id);

  return NextResponse.json({ success: true });
}
