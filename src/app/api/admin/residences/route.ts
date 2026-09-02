import { NextRequest, NextResponse } from "next/server";
import { requireSectionView, requireSuperAdmin } from "@/lib/apiAuth";
import { COULEURS_RESIDENCE, toResidences } from "@/lib/residences";
import { ECRANS_BLOC, ECRAN_BLOC_COLONNE, type EcranBloc, type ResidenceKind } from "@/types/Residence";

// --- Les blocs du foyer (table `residences`) --------------------------------
// Un bloc = Résidence 12, Résidence 36, Corail (intendance), une future résidence…
// Créer un bloc ici suffit à lui donner son propre encadré partout : compta,
// présences, organisation des repas, ciblage des événements, accueil.
//
// Écriture réservée au super-admin, comme les chambres et les postes : la structure
// du foyer conditionne tout le reste (places, rattachement des comptes, ciblage).

type Body = {
  value?: string;
  label?: string;
  kind?: ResidenceKind;
  couleur?: string;
  ordre?: number;
  is_active?: boolean;
  // Où le bloc apparaît, écran par écran. Partiel : seules les clés présentes sont écrites.
  ecrans?: Partial<Record<EcranBloc, boolean>>;
};

/**
 * Traduit `ecrans` en colonnes `ecran_*`, en n'acceptant que des booléens sur des écrans
 * connus. Un client qui inventerait une clé, ou passerait autre chose qu'un booléen, ne
 * doit pas pouvoir écrire dans une colonne arbitraire.
 */
function colonnesEcrans(ecrans: Body["ecrans"]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!ecrans) return out;
  for (const e of ECRANS_BLOC) {
    const v = ecrans[e];
    if (typeof v === "boolean") out[ECRAN_BLOC_COLONNE[e]] = v;
  }
  return out;
}

// Identifiant technique dérivé du nom (jamais saisi). « Basse-Frette » → « basse_frette ».
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function validate(body: Body): string | null {
  if (!(body.label ?? "").trim()) return "Le nom du bloc est requis.";
  if (body.kind !== "chambre" && body.kind !== "poste") return "Type invalide (chambres ou postes).";
  if (body.couleur && !(COULEURS_RESIDENCE as string[]).includes(body.couleur)) return "Couleur invalide.";
  return null;
}

// Message clair quand supabase/blocs-dynamiques.sql n'a pas encore été exécuté.
function migrationManquante(message: string): boolean {
  return /column .*(kind|ordre|couleur|is_active)/i.test(message);
}

// Message clair quand supabase/blocs-par-ecran.sql n'a pas encore été exécuté.
function migrationEcransManquante(message: string): boolean {
  return /column .*ecran_/i.test(message);
}

function messageErreur(message: string): string {
  if (migrationEcransManquante(message)) return "Cases par écran non initialisées en base : exécutez supabase/blocs-par-ecran.sql.";
  if (migrationManquante(message)) return "Blocs non initialisés en base : exécutez supabase/blocs-dynamiques.sql.";
  return message;
}

// --- Liste des blocs (actifs et inactifs) + nombre de places rattachées ------
export async function GET() {
  const { supabase, error } = await requireSectionView("comptes");
  if (error) return error;

  const [{ data, error: e1 }, { data: places }] = await Promise.all([
    supabase.from("residences").select("*"),
    supabase.from("places").select("residence"),
  ]);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const counts: Record<string, number> = {};
  (places ?? []).forEach((p) => { counts[p.residence] = (counts[p.residence] ?? 0) + 1; });

  const residences = toResidences(data as Record<string, unknown>[] | null).map((r) => ({ ...r, nb_places: counts[r.value] ?? 0 }));
  return NextResponse.json({ residences });
}

// --- Créer un bloc ----------------------------------------------------------
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const body: Body = await req.json();
  const v = validate(body);
  if (v) return NextResponse.json({ error: v }, { status: 400 });

  const label = body.label!.trim();
  const value = slugify(body.value?.trim() || label);
  if (!value) return NextResponse.json({ error: "Nom de bloc invalide." }, { status: 400 });

  const { data: existing } = await supabase.from("residences").select("value").eq("value", value).maybeSingle();
  if (existing) return NextResponse.json({ error: "Un bloc portant ce nom existe déjà." }, { status: 409 });

  // Nouveau bloc en fin de liste.
  const { data: all } = await supabase.from("residences").select("ordre");
  const ordre = Math.max(0, ...((all ?? []).map((r) => Number(r.ordre) || 0))) + 1;

  const { data, error: dbError } = await supabase
    .from("residences")
    .insert({
      value, label, kind: body.kind, couleur: body.couleur ?? "blue", ordre, is_active: true,
      // Absentes du corps : on retombe sur le préréglage porté par `kind`, pour qu'un bloc
      // créé par un client qui ignore ces cases se comporte comme avant.
      ...(body.ecrans
        ? colonnesEcrans(body.ecrans)
        : colonnesEcrans(Object.fromEntries(ECRANS_BLOC.map((e) => [e, body.kind === "chambre"])))),
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: messageErreur(dbError.message) }, { status: 400 });
  }
  return NextResponse.json({ success: true, residence: data });
}

// --- Modifier un bloc (nom, couleur, ordre, activation) ---------------------
// `value` (l'identifiant technique) et `kind` d'un bloc qui contient déjà des places
// ne bougent pas : les places, les comptes et l'historique y font référence.
export async function PUT(req: NextRequest) {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const body: Body = await req.json();
  if (!body.value) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (body.label !== undefined) {
    if (!body.label.trim()) return NextResponse.json({ error: "Le nom du bloc est requis." }, { status: 400 });
    update.label = body.label.trim();
  }
  if (body.couleur !== undefined) {
    if (!(COULEURS_RESIDENCE as string[]).includes(body.couleur)) return NextResponse.json({ error: "Couleur invalide." }, { status: 400 });
    update.couleur = body.couleur;
  }
  if (body.ordre !== undefined) update.ordre = body.ordre;
  if (body.is_active !== undefined) update.is_active = body.is_active;
  Object.assign(update, colonnesEcrans(body.ecrans));

  if (body.kind !== undefined) {
    if (body.kind !== "chambre" && body.kind !== "poste") return NextResponse.json({ error: "Type invalide." }, { status: 400 });
    const { count } = await supabase.from("places").select("id", { count: "exact", head: true }).eq("residence", body.value);
    if (count && count > 0)
      return NextResponse.json({ error: "Ce bloc contient déjà des places : son type ne peut plus changer." }, { status: 409 });
    update.kind = body.kind;
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ success: true });

  const { error: dbError } = await supabase.from("residences").update(update).eq("value", body.value);
  if (dbError) {
    return NextResponse.json({ error: messageErreur(dbError.message) }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

// --- Supprimer un bloc (uniquement s'il n'a jamais servi) -------------------
export async function DELETE(req: NextRequest) {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const { value } = (await req.json()) as { value?: string };
  if (!value) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const { count: placeCount } = await supabase.from("places").select("id", { count: "exact", head: true }).eq("residence", value);
  if (placeCount && placeCount > 0)
    return NextResponse.json({ error: "Ce bloc contient des chambres ou des postes. Désactivez-le plutôt que de le supprimer." }, { status: 409 });

  const { count: resCount } = await supabase.from("residentes").select("id", { count: "exact", head: true }).eq("residence", value);
  if (resCount && resCount > 0)
    return NextResponse.json({ error: "Des comptes sont rattachés à ce bloc (occupant ou historique). Désactivez-le plutôt." }, { status: 409 });

  const { error: dbError } = await supabase.from("residences").delete().eq("value", value);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
