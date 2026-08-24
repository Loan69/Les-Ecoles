import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/apiAuth";

const BUCKET = "branding";
const TAILLE_MAX = 2 * 1024 * 1024; // 2 Mo — le bucket applique la même limite
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

// Téléversement du logo du foyer.
//
// Passe par le service role plutôt que par une policy de storage : le bucket est
// public en lecture (le logo s'affiche avant toute connexion), et l'écriture est
// contrôlée ici, en un seul endroit.
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const form = await req.formData();
  const fichier = form.get("logo");
  if (!(fichier instanceof File)) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  if (fichier.size > TAILLE_MAX) return NextResponse.json({ error: "Fichier trop lourd (2 Mo maximum)." }, { status: 400 });
  if (!TYPES.includes(fichier.type)) return NextResponse.json({ error: "Format accepté : PNG, JPEG, WebP ou SVG." }, { status: 400 });

  const extension = fichier.type === "image/svg+xml" ? "svg" : fichier.type.split("/")[1];
  // Nom horodaté : une adresse neuve à chaque téléversement, sinon le navigateur
  // continuerait d'afficher l'ancien logo depuis son cache.
  const chemin = `logo-${Date.now()}.${extension}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(chemin, fichier, { contentType: fichier.type, upsert: true });
  if (upErr) return NextResponse.json({ error: `Téléversement refusé : ${upErr.message}` }, { status: 500 });

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(chemin);

  const { error: dbErr } = await supabase
    .from("app_settings")
    .update({ value: pub.publicUrl, updated_at: new Date().toISOString() })
    .eq("key", "foyer_logo_url");
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ success: true, url: pub.publicUrl });
}

// Retirer le logo : l'écran de connexion réaffiche le nom du foyer en toutes lettres.
// Le fichier reste dans le bucket — il ne coûte rien et permet de revenir en arrière.
export async function DELETE() {
  const { supabase, error } = await requireSuperAdmin();
  if (error) return error;

  const { error: dbErr } = await supabase
    .from("app_settings")
    .update({ value: "", updated_at: new Date().toISOString() })
    .eq("key", "foyer_logo_url");
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
