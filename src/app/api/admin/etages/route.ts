import { NextRequest, NextResponse } from "next/server";
import { requireSectionView, requireSuperAdmin } from "@/lib/apiAuth";
import { toResidence } from "@/lib/residences";
import { libererPlaces, listeNoms, occupantesActives } from "@/lib/structureBloc";
import type { Etage } from "@/types/Etage";

// --- Les étages d'un bloc « résidence » (table `etages`) ---------------------
// Déclarer un étage vide, PUIS y ranger des chambres : c'est ce qui permet
// d'initialiser un foyer dont on n'a encore saisi aucune chambre.
//
// Écriture réservée au super-admin, comme les blocs et les places : la structure
// du foyer conditionne les occupations, la comptabilité et le ciblage.

type Body = {
  id?: string;
  residence?: string;
  label?: string;
  ordre?: number;
};

// Clé technique dérivée du nom, préfixée par le bloc pour rester unique entre blocs.
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function migrationManquante(message: string): boolean {
  return /relation .*etages.* does not exist/i.test(message) || /schema cache/i.test(message);
}

const erreurTable = (message: string) =>
  migrationManquante(message) ? "Étages non initialisés en base : exécutez supabase/etages-dynamiques.sql." : message;

// --- Liste des étages + nombre de chambres de chacun ------------------------
export async function GET() {
  const { supabase, error } = await requireSectionView("comptes");
  if (error) return error;

  const [{ data, error: e1 }, { data: places }] = await Promise.all([
    supabase.from("etages").select("*").order("ordre").order("label"),
    supabase.from("places").select("residence, etage"),
  ]);
  // Tolérant : tant que le SQL n'est pas passé, l'écran fonctionne sans étages déclarés.
  if (e1) return NextResponse.json({ etages: [], erreur: erreurTable(e1.message) });

  const counts: Record<string, number> = {};
  (places ?? []).forEach((p) => {
    if (!p.etage) return;
    const k = `${p.residence}::${p.etage}`;
    counts[k] = (counts[k] ?? 0) + 1;
  });

  const etages = ((data ?? []) as Etage[]).map((e) => ({ ...e, nb_places: counts[`${e.residence}::${e.value}`] ?? 0 }));
  return NextResponse.json({ etages });
}

// --- Créer un étage (même sans chambre) -------------------------------------
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const body: Body = await req.json();
  const label = (body.label ?? "").trim();
  if (!label) return NextResponse.json({ error: "Le nom de l'étage est requis." }, { status: 400 });
  if (!body.residence) return NextResponse.json({ error: "Bloc requis." }, { status: 400 });

  // Un étage n'a de sens que dans un bloc de chambres.
  const { data: blocRow } = await supabase.from("residences").select("*").eq("value", body.residence).maybeSingle();
  if (!blocRow) return NextResponse.json({ error: "Bloc inconnu." }, { status: 400 });
  const bloc = toResidence(blocRow as Record<string, unknown>);
  if (bloc.kind !== "chambre") return NextResponse.json({ error: `Le bloc « ${bloc.label} » ne comporte pas d'étages.` }, { status: 400 });

  const value = `${slugify(body.residence)}_${slugify(label)}`;
  if (!value) return NextResponse.json({ error: "Nom d'étage invalide." }, { status: 400 });

  const { data: all, error: eList } = await supabase.from("etages").select("ordre, value").eq("residence", body.residence);
  if (eList) return NextResponse.json({ error: erreurTable(eList.message) }, { status: 400 });
  if ((all ?? []).some((e) => e.value === value)) return NextResponse.json({ error: "Un étage portant ce nom existe déjà dans ce bloc." }, { status: 409 });
  const ordre = Math.max(0, ...((all ?? []).map((e) => Number(e.ordre) || 0))) + 1;

  const { data, error: dbError } = await supabase
    .from("etages")
    .insert({ residence: body.residence, value, label, ordre })
    .select()
    .single();
  if (dbError) return NextResponse.json({ error: erreurTable(dbError.message) }, { status: 400 });
  return NextResponse.json({ success: true, etage: data });
}

// --- Renommer / réordonner un étage -----------------------------------------
// `value` ne change jamais : les chambres et les ciblages déjà enregistrés s'y réfèrent.
export async function PUT(req: NextRequest) {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const body: Body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (body.label !== undefined) {
    if (!body.label.trim()) return NextResponse.json({ error: "Le nom de l'étage est requis." }, { status: 400 });
    update.label = body.label.trim();
  }
  if (body.ordre !== undefined) update.ordre = body.ordre;
  if (Object.keys(update).length === 0) return NextResponse.json({ success: true });

  const { error: dbError } = await supabase.from("etages").update(update).eq("id", body.id);
  if (dbError) return NextResponse.json({ error: erreurTable(dbError.message) }, { status: 400 });
  return NextResponse.json({ success: true });
}

// --- Supprimer un étage (seulement s'il est vide) ---------------------------
export async function DELETE(req: NextRequest) {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const { data: etage } = await supabase.from("etages").select("residence, value, label").eq("id", id).maybeSingle();
  if (!etage) return NextResponse.json({ error: "Étage introuvable." }, { status: 404 });

  // Un étage se supprime AVEC ses chambres, du moment que personne n'y loge.
  // Exiger qu'il soit vide obligeait à supprimer les chambres une par une avant lui —
  // long, et sans rien protéger de plus : ce qu'on protège, c'est une occupante, pas
  // une chambre vide.
  const { data: places } = await supabase
    .from("places")
    .select("id")
    .eq("residence", etage.residence)
    .eq("etage", etage.value);
  const placeIds = (places ?? []).map((p) => p.id as string);

  const occupees = await occupantesActives(supabase, placeIds);
  if (occupees.length > 0)
    return NextResponse.json(
      { error: `« ${etage.label} » est encore habité par ${listeNoms(occupees)}. Déplacez-la ou archivez-la d'abord.` },
      { status: 409 }
    );

  if (placeIds.length > 0) {
    await libererPlaces(supabase, placeIds);
    const { error: ePlaces } = await supabase.from("places").delete().in("id", placeIds);
    if (ePlaces) return NextResponse.json({ error: ePlaces.message }, { status: 500 });
  }

  const { error: dbError } = await supabase.from("etages").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: erreurTable(dbError.message) }, { status: 500 });
  return NextResponse.json({ success: true });
}
