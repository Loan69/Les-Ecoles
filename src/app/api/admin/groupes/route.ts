import { NextRequest, NextResponse } from "next/server";
import { requireGroupesRead, requireSectionEdit } from "@/lib/apiAuth";

// --- Groupes de personnes (ciblage de visibilité) ---
//
// Un groupe n'accorde AUCUN droit : il sert uniquement à cibler un contenu (événement,
// option de repas, rubrique Administratif). Les droits restent réglés par section.
// Voir supabase/groupes.sql et src/lib/visibilite.ts.
//
// Lecture : quiconque peut cibler un contenu (cf. requireGroupesRead) — il faut voir la
// composition pour savoir qui est concerné.
// Écriture : section **Comptes en Édition**, comme la gestion des comptes elle-même.

type Body = {
  id?: string;
  nom?: string;
  description?: string | null;
  user_id?: string;
  membre?: boolean; // true = ajouter au groupe, false = retirer
};

// La table `groupes` peut ne pas encore exister (SQL non passé) : on le détecte pour
// renvoyer une liste vide plutôt qu'une erreur qui casserait les écrans appelants.
const TABLE_ABSENTE = "42P01";

export async function GET() {
  const { supabase, error } = await requireGroupesRead();
  if (error) return error;

  const { data: groupes, error: dbError } = await supabase
    .from("groupes")
    .select("id, nom, description, created_at")
    .order("nom", { ascending: true });

  if (dbError) {
    if (dbError.code === TABLE_ABSENTE) return NextResponse.json({ groupes: [], installe: false });
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const { data: membres } = await supabase.from("groupe_membres").select("groupe_id, user_id");
  const parGroupe = new Map<string, string[]>();
  (membres ?? []).forEach((m) => {
    const liste = parGroupe.get(m.groupe_id) ?? [];
    liste.push(m.user_id);
    parGroupe.set(m.groupe_id, liste);
  });

  return NextResponse.json({
    installe: true,
    groupes: (groupes ?? []).map((g) => ({ ...g, membres: parGroupe.get(g.id) ?? [] })),
  });
}

// --- Créer un groupe ---
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireSectionEdit("comptes");
  if (error) return error;

  const { nom, description } = (await req.json()) as Body;
  if (!nom?.trim()) return NextResponse.json({ error: "Le nom du groupe est requis." }, { status: 400 });

  const { data, error: dbError } = await supabase
    .from("groupes")
    .insert({ nom: nom.trim(), description: description?.trim() || null })
    .select("id, nom, description, created_at")
    .single();

  if (dbError) {
    const msg = dbError.code === "23505" ? "Un groupe porte déjà ce nom." : dbError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ success: true, groupe: { ...data, membres: [] } });
}

// --- Renommer un groupe, ou ajouter / retirer une personne ---
export async function PUT(req: NextRequest) {
  const { supabase, error } = await requireSectionEdit("comptes");
  if (error) return error;

  const { id, nom, description, user_id, membre } = (await req.json()) as Body;
  if (!id) return NextResponse.json({ error: "Groupe manquant." }, { status: 400 });

  // Appartenance d'une personne
  if (user_id !== undefined) {
    if (membre) {
      const { error: dbErr } = await supabase
        .from("groupe_membres")
        .upsert({ groupe_id: id, user_id }, { onConflict: "groupe_id,user_id" });
      if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 400 });
    } else {
      const { error: dbErr } = await supabase
        .from("groupe_membres")
        .delete()
        .eq("groupe_id", id)
        .eq("user_id", user_id);
      if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  }

  // Renommage / description
  const update: Record<string, unknown> = {};
  if (nom !== undefined) {
    if (!nom.trim()) return NextResponse.json({ error: "Le nom du groupe est requis." }, { status: 400 });
    update.nom = nom.trim();
  }
  if (description !== undefined) update.description = description?.trim() || null;
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Rien à modifier." }, { status: 400 });

  const { error: dbError } = await supabase.from("groupes").update(update).eq("id", id);
  if (dbError) {
    const msg = dbError.code === "23505" ? "Un groupe porte déjà ce nom." : dbError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

// --- Supprimer un groupe ---
// Refusé s'il sert encore à cibler un contenu : sinon le ciblage deviendrait un
// identifiant orphelin, silencieusement ignoré — donc un contenu qui s'ouvre sans
// que personne ne s'en aperçoive.
export async function DELETE(req: NextRequest) {
  const { supabase, error } = await requireSectionEdit("comptes");
  if (error) return error;

  const { id } = (await req.json()) as Body;
  if (!id) return NextResponse.json({ error: "Groupe manquant." }, { status: 400 });

  // Containment jsonb : { "groupes": ["<id>"] } est contenu dans la visibilité qui cible ce groupe.
  const cible = { groupes: [id] };
  const [evts, opts, sections] = await Promise.all([
    supabase.from("evenements").select("titre").contains("visibilite", cible).limit(1),
    supabase.from("meal_options").select("label").contains("visibilite", cible).limit(1),
    supabase.from("admin_sections").select("title").contains("visibilite", cible).limit(1),
  ]);

  const usages: string[] = [];
  if (evts.data?.length) usages.push(`l'événement « ${evts.data[0].titre} »`);
  if (opts.data?.length) usages.push(`l'option de repas « ${opts.data[0].label} »`);
  if (sections.data?.length) usages.push(`la rubrique « ${sections.data[0].title} »`);
  if (usages.length > 0) {
    return NextResponse.json(
      { error: `Ce groupe sert encore à cibler ${usages.join(", ")}. Retire-le de ces contenus avant de le supprimer.` },
      { status: 400 }
    );
  }

  const { error: dbError } = await supabase.from("groupes").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
