import { NextRequest, NextResponse } from "next/server";
import { requireTechnique } from "@/lib/apiAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Inviter une super-administratrice, sans lui attribuer de chambre.
//
// Au démarrage d'un foyer il n'existe encore ni bloc, ni étage, ni chambre : on ne
// peut donc pas passer par /api/admin/invitations, qui exige une place libre. C'est
// pourtant le moment où il faut donner la main côté client, pour que l'installation
// ne dépende plus du compte technique.
//
// Réservé au COMPTE TECHNIQUE, pas aux super-admins : nommer une super-administratrice
// relève de l'installation du foyer, pas de son administration courante. Un foyer ne se
// donne pas lui-même de nouveaux détenteurs des pleins droits.

export async function GET() {
  const { supabase, error } = await requireTechnique();
  if (error) return error;

  const { data, error: dbErr } = await supabase
    .from("invitations")
    .select("id, email, statut, created_at, expires_at")
    .eq("role", "super_admin")
    .eq("statut", "envoyee")
    .order("created_at", { ascending: false });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error } = await requireTechnique();
  if (error) return error;

  const { email } = (await req.json()) as { email?: string };
  if (!email || !EMAIL_RE.test(email.trim()))
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  const mail = email.trim().toLowerCase();

  // Compte déjà existant : on le promeut plutôt que d'envoyer une invitation qui
  // échouerait. C'est le cas courant — une administratrice déjà en place à qui on
  // veut donner les pleins droits.
  const { data: existant } = await supabase
    .from("residentes")
    .select("user_id, prenom, nom")
    .eq("email", mail)
    .maybeSingle();
  if (existant) {
    const { error: upErr } = await supabase
      .from("residentes")
      .update({ is_super_admin: true })
      .eq("user_id", existant.user_id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({
      success: true,
      promue: true,
      message: `${existant.prenom} ${existant.nom} est désormais super-administratrice.`,
    });
  }

  const { data: enAttente } = await supabase
    .from("invitations")
    .select("id")
    .eq("email", mail)
    .eq("statut", "envoyee")
    .maybeSingle();
  if (enAttente)
    return NextResponse.json({ error: "Une invitation est déjà en attente pour cette adresse." }, { status: 409 });

  const { data: invitee, error: invErr } = await supabase.auth.admin.inviteUserByEmail(mail, {
    data: { role: "super_admin" }, // pas de place_id : la page d'activation n'affichera pas de logement
    redirectTo: `${req.nextUrl.origin}/activation`,
  });
  if (invErr) {
    const msg = /already/i.test(invErr.message) ? "Cet email a déjà un compte." : invErr.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: dbErr } = await supabase.from("invitations").insert({
    email: mail,
    place_id: null,
    role: "super_admin",
    auth_user_id: invitee.user?.id ?? null,
    statut: "envoyee",
    invited_by: userId,
  });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// Annuler une invitation encore en attente.
export async function DELETE(req: NextRequest) {
  const { supabase, error } = await requireTechnique();
  if (error) return error;

  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const { data: inv } = await supabase
    .from("invitations")
    .select("id, auth_user_id")
    .eq("id", id)
    .eq("role", "super_admin")
    .eq("statut", "envoyee")
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 });

  if (inv.auth_user_id) await supabase.auth.admin.deleteUser(inv.auth_user_id).catch(() => {});
  await supabase.from("invitations").update({ statut: "annulee" }).eq("id", inv.id);

  return NextResponse.json({ success: true });
}
