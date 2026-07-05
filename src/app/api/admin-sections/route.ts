import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/apiAuth";

// --- Lecture : toutes les sections, pour toute utilisatrice connectée ---
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("admin_sections")
    .select("*")
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sections: data ?? [] });
}

// --- Créer une section (admin) ---
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { title, type } = body as { title?: string; type?: string };
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
    .insert({ title: title.trim(), type, position: nextPos, content })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true, section: data });
}

// --- Modifier une section (titre et/ou contenu) (admin) ---
export async function PUT(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { id, title, content } = body as { id?: string; title?: string; content?: unknown };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title != null) {
    if (!title.trim()) return NextResponse.json({ error: "Titre requis." }, { status: 400 });
    update.title = title.trim();
  }
  if (content !== undefined) update.content = content;

  const { error: dbError } = await supabase.from("admin_sections").update(update).eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// --- Réordonner (admin) : corps { order: [id, id, ...] } ---
export async function PATCH(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
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
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { id } = body as { id?: string };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const { error: dbError } = await supabase.from("admin_sections").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
