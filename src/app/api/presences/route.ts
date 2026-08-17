import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { CHOIX_NON } from "@/lib/presenceStatut";
import { requireSectionAccess } from "@/lib/apiAuth";
import { cibleEstVide, dansCible, estExclue, type Cible } from "@/lib/visibilite";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// --- Mes inscriptions sur une période ---
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });

  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json({ error: "Paramètres start/end invalides." }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("presences")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", start)
    .lte("date", end);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ presences: data ?? [] });
}

// --- Définir mon choix pour un (jour, service). ---
// choix = "" → sans réponse (aucune ligne) · "non" → « Non » explicite (ligne option_id null)
//       · <uuid> → inscription à cette option.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });

  // Repas = Aucun : la section n'existe pas pour cette personne (page masquée) → on refuse.
  const { error: accessError } = await requireSectionAccess("repas");
  if (accessError) return accessError;

  const body = await req.json();
  const { date, service, choix, commentaire } = body as {
    date?: string;
    service?: string;
    choix?: string | null;
    commentaire?: string | null;
  };

  if (!date || !DATE_RE.test(date)) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  if (service !== "dejeuner" && service !== "diner") return NextResponse.json({ error: "Service invalide." }, { status: 400 });

  // Sans réponse → on retire la ligne
  if (!choix) {
    const { error: delErr } = await supabase
      .from("presences")
      .delete()
      .eq("user_id", user.id)
      .eq("date", date)
      .eq("service", service);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // « Non » explicite → ligne sans option
  if (choix === CHOIX_NON) {
    const { error: nonErr } = await supabase
      .from("presences")
      .upsert(
        { user_id: user.id, date, service, option_id: null, commentaire: commentaire?.trim() || null },
        { onConflict: "user_id,date,service" }
      );
    if (nonErr) return NextResponse.json({ error: nonErr.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const option_id = choix;

  // Vérifier que l'option est bien proposée ce jour, active, et autorisée
  const { data: so } = await supabase
    .from("meal_service_options")
    .select("option:meal_options(is_active, visibilite)")
    .eq("date", date)
    .eq("service", service)
    .eq("option_id", option_id)
    .maybeSingle();

  const opt = so?.option as { is_active?: boolean; visibilite?: Cible | null } | null;
  if (!opt) return NextResponse.json({ error: "Cette option n'est pas proposée ce jour." }, { status: 400 });
  if (!opt.is_active) return NextResponse.json({ error: "Cette option n'est plus disponible." }, { status: 400 });

  // L'option peut être ciblée (résidence, étage, groupe). Le sélecteur ne la propose déjà
  // pas, mais l'écran n'est pas une sécurité : on revérifie ici, sinon un appel direct
  // suffirait à s'inscrire.
  if (!cibleEstVide(opt.visibilite)) {
    const [{ data: profil }, { data: mesGroupes }] = await Promise.all([
      supabase.from("residentes").select("residence, etage, chambre").eq("user_id", user.id).maybeSingle(),
      supabase.from("groupe_membres").select("groupe_id").eq("user_id", user.id),
    ]);

    const viewer = {
      residence: profil?.residence,
      etage: profil?.etage,
      chambre: profil?.chambre,
      user_id: user.id,
      groupes: (mesGroupes ?? []).map((g) => g.groupe_id as string),
    };
    if (estExclue(opt.visibilite, viewer) || !dansCible(opt.visibilite, viewer)) {
      return NextResponse.json({ error: "Cette option ne vous est pas proposée." }, { status: 403 });
    }
  }

  const { error: upErr } = await supabase
    .from("presences")
    .upsert(
      { user_id: user.id, date, service, option_id, commentaire: commentaire?.trim() || null },
      { onConflict: "user_id,date,service" }
    );

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
