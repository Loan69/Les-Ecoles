import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { requireSectionEdit } from "@/lib/apiAuth";
import { cibleEstVide, contourneLeCiblage, dansCible, estExclue, type Cible } from "@/lib/visibilite";
import { rightsFromRow, canEditSection, RIGHTS_COLUMNS } from "@/lib/roles";

// --- Lecture : sections visibles pour l'utilisatrice connectée ---
// Une rubrique n'est transmise qu'aux personnes visées par son ciblage (R-VIS-02/03).
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
  }

  const [{ data: profil }, { data: mesGroupes }] = await Promise.all([
    supabase.from("residentes").select(RIGHTS_COLUMNS).eq("user_id", user.id).maybeSingle(),
    supabase.from("groupe_membres").select("groupe_id").eq("user_id", user.id),
  ]);

  const { data, error } = await supabase
    .from("admin_sections")
    .select("*")
    .order("position", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ciblage (résidences / étages / groupes) : une rubrique sans ciblage reste visible par
  // toutes. Le filtrage se fait ici, côté serveur : une rubrique hors périmètre n'est même
  // pas transmise au navigateur.
  //
  // ⚠️ Ce que ce filtre ne fait PLUS. Jusqu'au 2026-09-11, toute personne ayant
  // *Infos = Admin · gérer* recevait l'intégralité des rubriques et sortait d'ici par
  // un retour anticipé. Cette exception ne servait qu'à empêcher un enfermement — une
  // administratrice qui ciblait une rubrique en s'excluant elle-même la perdait, y
  // compris en modification, sans recours hors de la base. Il suffit de l'autrice pour
  // ça : le ciblage vaut désormais aussi entre administratrices.
  const rights = rightsFromRow(profil as Record<string, unknown> | null);
  const viewer = {
    residence: (profil as { residence?: string | null } | null)?.residence,
    etage: (profil as { etage?: string | null } | null)?.etage,
    chambre: (profil as { chambre?: string | null } | null)?.chambre,
    user_id: user.id,
    groupes: (mesGroupes ?? []).map((g) => g.groupe_id as string),
    estTechnique: rights.is_technique,
    // Rubriques **sans autrice** — celles d'avant la migration, ou dont le compte a été
    // supprimé (`ON DELETE SET NULL`). Elles restent rattrapables par qui les gère,
    // sans quoi une rubrique restreinte d'avant deviendrait irrécupérable : exactement
    // le mal qu'on soigne. Les rubriques créées depuis ont une autrice et ne passent
    // jamais par ce rattrapage.
    rattrapageGestion: canEditSection(rights, "infos"),
  };
  const sections = (data ?? []).filter((s) => {
    if (contourneLeCiblage(s.auteur_user_id as string | null, viewer)) return true;
    const vis = s.visibilite as Cible | null | undefined;
    if (cibleEstVide(vis)) return true;
    return !estExclue(vis, viewer) && dansCible(vis, viewer);
  });

  return NextResponse.json({ sections });
}

// --- Créer une section (admin) ---
export async function POST(req: NextRequest) {
  const { supabase, userId, error } = await requireSectionEdit('infos');
  if (error) return error;

  const body = await req.json();
  const { title, type, visibilite } = body as { title?: string; type?: string; visibilite?: Cible | null };
  if (!title || !title.trim()) return NextResponse.json({ error: "Titre requis." }, { status: 400 });
  if (type !== "richtext" && type !== "contacts") return NextResponse.json({ error: "Type invalide." }, { status: 400 });

  const { data: last } = await supabase
    .from("admin_sections")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = (last?.position ?? -1) + 1;

  const content = type === "contacts" ? { contacts: [] } : { type: "doc", content: [] };

  // L'autrice est enregistrée ici, et nulle part ailleurs : c'est elle qui garantit
  // qu'une rubrique restreinte reste joignable par qui l'a écrite (`contourneLeCiblage`).
  // Une modification ultérieure ne la réécrit pas — la première main compte, pas la
  // dernière.
  //
  // ⚠️ `userId` vient du garde, et non de `supabase.auth.getUser()` : le client rendu
  // par `requireSectionEdit` est un client **service role**, sans session. L'interroger
  // renverrait `null`, et toutes les rubriques naîtraient sans autrice — le défaut
  // serait passé inaperçu, puisque « sans autrice » est un état parfaitement légitime.
  const { data, error: dbError } = await supabase
    .from("admin_sections")
    .insert({
      title: title.trim(),
      type,
      position: nextPos,
      content,
      visibilite: visibilite ?? null,
      auteur_user_id: userId,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true, section: data });
}

// --- Modifier une section (titre et/ou contenu) (admin) ---
export async function PUT(req: NextRequest) {
  const { supabase, error } = await requireSectionEdit('infos');
  if (error) return error;

  const body = await req.json();
  const { id, title, content, visibilite } = body as { id?: string; title?: string; content?: unknown; visibilite?: Cible | null };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title != null) {
    if (!title.trim()) return NextResponse.json({ error: "Titre requis." }, { status: 400 });
    update.title = title.trim();
  }
  if (content !== undefined) update.content = content;
  if (visibilite !== undefined) update.visibilite = visibilite ?? null;

  const { error: dbError } = await supabase.from("admin_sections").update(update).eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// --- Réordonner (admin) : corps { order: [id, id, ...] } ---
export async function PATCH(req: NextRequest) {
  const { supabase, error } = await requireSectionEdit('infos');
  if (error) return error;

  const body = await req.json();
  const order = (body as { order?: string[] }).order;
  if (!Array.isArray(order)) return NextResponse.json({ error: "Ordre invalide." }, { status: 400 });

  for (let i = 0; i < order.length; i++) {
    const { error: e } = await supabase.from("admin_sections").update({ position: i }).eq("id", order[i]);
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// --- Supprimer une section (admin) ---
export async function DELETE(req: NextRequest) {
  const { supabase, error } = await requireSectionEdit('infos');
  if (error) return error;

  const body = await req.json();
  const { id } = body as { id?: string };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const { error: dbError } = await supabase.from("admin_sections").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
