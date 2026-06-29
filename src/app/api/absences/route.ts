import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

// Format attendu pour les dates : "YYYY-MM-DD"
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type AbsenceBody = {
  id?: string;
  date_debut?: string;
  date_fin?: string;
  contact?: string | null;
};

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

  const body: AbsenceBody = await req.json();
  const dateError = validateDates(body.date_debut, body.date_fin);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const { data, error } = await supabase
    .from("absences_sejour")
    .insert({
      user_id: user.id,
      date_debut: body.date_debut,
      date_fin: body.date_fin,
      contact: body.contact?.trim() ? body.contact.trim() : null,
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

  const body: AbsenceBody = await req.json();
  if (!body.id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const dateError = validateDates(body.date_debut, body.date_fin);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const { data, error } = await supabase
    .from("absences_sejour")
    .update({
      date_debut: body.date_debut,
      date_fin: body.date_fin,
      contact: body.contact?.trim() ? body.contact.trim() : null,
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

  const body: AbsenceBody = await req.json();
  if (!body.id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const { error } = await supabase
    .from("absences_sejour")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
