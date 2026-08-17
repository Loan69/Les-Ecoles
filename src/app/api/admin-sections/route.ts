import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { requireSectionEdit } from "@/lib/apiAuth";
import { cibleEstVide, dansCible, estExclue, type Cible } from "@/lib/visibilite";

// --- Lecture : sections visibles pour l'utilisatrice connectée ---
// Une rubrique n'est transmise qu'aux personnes visées par son ciblage (R-VIS-02/03).
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
  }

  const [{ data: profil }, { data: mesGroupes }] = await Promise.all([
    supabase.from("residentes").select("residence, etage, chambre").eq("user_id", user.id).maybeSingle(),
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
  const viewer = {
    residence: profil?.residence,
    etage: profil?.etage,
    chambre: profil?.chambre,
    user_id: user.id,
    groupes: (mesGroupes ?? []).map((g) => g.groupe_id as string),
  };
  const sections = (data ?? []).filter((s) => {
    const vis = s.visibilite as Cible | null | undefined;
    if (cibleEstVide(vis)) return true;
    return !estExclue(vis, viewer) && dansCible(vis, viewer);
  });

  return NextResponse.json({ sections });
}

// --- Créer une section (admin) ---
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireSectionEdit('infos');
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

  const { data, error: dbError } = await supabase
    .from("admin_sections")
    .insert({ title: title.trim(), type, position: nextPos, content, visibilite: visibilite ?? null })
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
