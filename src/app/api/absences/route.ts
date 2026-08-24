import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { identiteFoyer } from "@/lib/foyerServeur";
import { requireSectionAccess } from "@/lib/apiAuth";
import {
  HEURE_VERROU_FOYER_DEFAUT,
  joursVerrouillesImpactes,
  messageVerrouFoyer,
  type Sejour,
} from "@/lib/foyerLock";
import type { SupabaseClient } from "@supabase/supabase-js";

// Format attendu pour les dates : "YYYY-MM-DD"
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type AbsenceBody = {
  id?: string;
  date_debut?: string;
  date_fin?: string;
  repas_non?: boolean;
};

// Heure limite de modification de la présence (R-LOCK-09), réglée par l'intendance.
async function heureVerrouFoyer(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "verrouillage_foyer")
    .maybeSingle();
  return data?.value || HEURE_VERROU_FOYER_DEFAUT;
}

// Refuse un changement qui toucherait un jour déjà verrouillé (R-LOCK-09/10).
// Le contrôle est ici, et pas seulement à l'écran : sans cela le verrou ne tiendrait
// pas devant un appel direct à l'API.
async function refusSiVerrouille(
  supabase: SupabaseClient,
  avant: Sejour | null,
  apres: Sejour | null
): Promise<NextResponse | null> {
  const heure = await heureVerrouFoyer(supabase);
  const foyer = await identiteFoyer();
  const jours = joursVerrouillesImpactes(avant, apres, heure, new Date(), foyer.fuseau);
  if (jours.length === 0) return null;
  return NextResponse.json({ error: messageVerrouFoyer(jours, heure, foyer.locale) }, { status: 409 });
}

// Le séjour tel qu'il est en base, pour savoir ce que la modification change réellement.
async function sejourExistant(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<Sejour | null> {
  const { data } = await supabase
    .from("absences_sejour")
    .select("date_debut, date_fin, repas_non")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Sejour | null) ?? null;
}

function validateDates(date_debut?: string, date_fin?: string): string | null {
  if (!date_debut || !date_fin) return "Dates de début et de fin requises.";
  if (!DATE_RE.test(date_debut) || !DATE_RE.test(date_fin)) return "Format de date invalide.";
  if (date_fin < date_debut) return "La date de fin doit être après la date de début.";
  return null;
}

// --- Liste des absences de l'utilisateur connecté ---
export async function GET() {
  const supabase = await createSupabaseServer();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("absences_sejour")
    .select("*")
    .eq("user_id", user.id)
    .order("date_debut", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ absences: data ?? [] });
}

// --- Création d'une absence ---
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
  }

  // Absences = Aucun : la section n'existe pas pour cette personne (page masquée) → on refuse.
  const { error: accessError } = await requireSectionAccess("absences");
  if (accessError) return accessError;

  const body: AbsenceBody = await req.json();
  const dateError = validateDates(body.date_debut, body.date_fin);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const refus = await refusSiVerrouille(supabase, null, {
    date_debut: body.date_debut!,
    date_fin: body.date_fin!,
    repas_non: body.repas_non ?? true,
  });
  if (refus) return refus;

  const { data, error } = await supabase
    .from("absences_sejour")
    .insert({
      user_id: user.id,
      date_debut: body.date_debut,
      date_fin: body.date_fin,
      repas_non: body.repas_non ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, absence: data });
}

// --- Modification d'une absence (id dans le corps) ---
export async function PUT(req: NextRequest) {
  const supabase = await createSupabaseServer();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
  }

  // Absences = Aucun : la section n'existe pas pour cette personne (page masquée) → on refuse.
  const { error: accessError } = await requireSectionAccess("absences");
  if (accessError) return accessError;

  const body: AbsenceBody = await req.json();
  if (!body.id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const dateError = validateDates(body.date_debut, body.date_fin);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const avant = await sejourExistant(supabase, body.id, user.id);
  if (!avant) return NextResponse.json({ error: "Absence introuvable." }, { status: 404 });

  const refus = await refusSiVerrouille(supabase, avant, {
    date_debut: body.date_debut!,
    date_fin: body.date_fin!,
    repas_non: body.repas_non ?? true,
  });
  if (refus) return refus;

  const { data, error } = await supabase
    .from("absences_sejour")
    .update({
      date_debut: body.date_debut,
      date_fin: body.date_fin,
      repas_non: body.repas_non ?? true,
    })
    .eq("id", body.id)
    .eq("user_id", user.id) // garantit qu'on ne modifie que ses propres absences
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Absence introuvable." }, { status: 404 });
  return NextResponse.json({ success: true, absence: data });
}

// --- Suppression d'une absence (id dans le corps) ---
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
  }

  // Absences = Aucun : la section n'existe pas pour cette personne (page masquée) → on refuse.
  const { error: accessError } = await requireSectionAccess("absences");
  if (accessError) return accessError;

  const body: AbsenceBody = await req.json();
  if (!body.id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const avant = await sejourExistant(supabase, body.id, user.id);
  if (!avant) return NextResponse.json({ error: "Absence introuvable." }, { status: 404 });

  const refus = await refusSiVerrouille(supabase, avant, null);
  if (refus) return refus;

  const { error } = await supabase
    .from("absences_sejour")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
