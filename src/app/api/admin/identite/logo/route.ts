import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/apiAuth";

const BUCKET = "branding";
const TAILLE_MAX = 2 * 1024 * 1024; // 2 Mo — le bucket applique la même limite
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

// Deux images distinctes, deux réglages :
//   logo  — en-tête des écrans. Souvent transparent et large : c'est très bien là.
//   icone — écran d'accueil du téléphone. Doit être carrée et OPAQUE : iOS et
//           Android composent la transparence sur du noir, et un logo large
//           devient illisible une fois comprimé dans un carré.
const CIBLES = {
  logo: { cle: "foyer_logo_url", prefixe: "logo" },
  icone: { cle: "foyer_icone_url", prefixe: "icone" },
} as const;
type Cible = keyof typeof CIBLES;

const cibleValide = (v: unknown): v is Cible => typeof v === "string" && v in CIBLES;

// Téléversement, via le service role plutôt qu'une policy de storage : le bucket est
// public en lecture (l'image s'affiche avant toute connexion), et l'écriture est
// contrôlée ici, en un seul endroit.
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const form = await req.formData();
  const cibleBrute = form.get("cible") ?? "logo";
  if (!cibleValide(cibleBrute)) return NextResponse.json({ error: "Cible inconnue." }, { status: 400 });
  const { cle, prefixe } = CIBLES[cibleBrute];

  const fichier = form.get("fichier") ?? form.get("logo");
  if (!(fichier instanceof File)) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  if (fichier.size > TAILLE_MAX) return NextResponse.json({ error: "Fichier trop lourd (2 Mo maximum)." }, { status: 400 });
  if (!TYPES.includes(fichier.type)) return NextResponse.json({ error: "Format accepté : PNG, JPEG, WebP ou SVG." }, { status: 400 });

  const extension = fichier.type === "image/svg+xml" ? "svg" : fichier.type.split("/")[1];
  // Nom horodaté : une adresse neuve à chaque téléversement, sinon le navigateur
  // continuerait d'afficher l'ancienne image depuis son cache.
  const chemin = `${prefixe}-${Date.now()}.${extension}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(chemin, fichier, { contentType: fichier.type, upsert: true });
  if (upErr) return NextResponse.json({ error: `Téléversement refusé : ${upErr.message}` }, { status: 500 });

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(chemin);

  const { error: dbErr } = await supabase
    .from("app_settings")
    .update({ value: pub.publicUrl, updated_at: new Date().toISOString() })
    .eq("key", cle);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ success: true, url: pub.publicUrl });
}

// Retirer une image. Le fichier reste dans le dépôt — il ne coûte rien et permet
// de revenir en arrière.
export async function DELETE(req: NextRequest) {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const { cible } = (await req.json().catch(() => ({}))) as { cible?: string };
  const choisie: Cible = cibleValide(cible) ? cible : "logo";

  const { error: dbErr } = await supabase
    .from("app_settings")
    .update({ value: "", updated_at: new Date().toISOString() })
    .eq("key", CIBLES[choisie].cle);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
