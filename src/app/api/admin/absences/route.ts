import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAdminView } from "@/lib/apiAuth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Décale une date "YYYY-MM-DD" de n jours (UTC, sans dérive de fuseau).
function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function validateDates(date_debut?: string, date_fin?: string): string | null {
  if (!date_debut || !date_fin) return "Dates de début et de fin requises.";
  if (!DATE_RE.test(date_debut) || !DATE_RE.test(date_fin)) return "Format de date invalide.";
  if (date_fin < date_debut) return "La date de fin doit être après la date de début.";
  return null;
}

// --- Absences chevauchant une période [start, end] ---
export async function GET(req: NextRequest) {
  const { supabase, error } = await requireAdminView();
  if (error) return error;

  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json({ error: "Paramètres start/end invalides." }, { status: 400 });
  }

  // Chevauchement : date_debut <= end ET date_fin >= start
  const { data, error: dbError } = await supabase
    .from("absences_sejour")
    .select("*")
    .lte("date_debut", end)
    .gte("date_fin", start);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ absences: data ?? [] });
}

// --- Marquer absente (création) OU présente (annulation sur la période) ---
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { mode, user_id, date_debut, date_fin, contact } = body as {
    mode?: "absent" | "present";
    user_id?: string;
    date_debut?: string;
    date_fin?: string;
    contact?: string | null;
  };

  if (!user_id) return NextResponse.json({ error: "Personne manquante." }, { status: 400 });
  const dateError = validateDates(date_debut, date_fin);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  // --- Marquer ABSENTE : on crée un séjour ---
  if (mode === "absent") {
    const { error: dbError } = await supabase.from("absences_sejour").insert({
      user_id,
      date_debut,
      date_fin,
      contact: contact?.trim() ? contact.trim() : null,
    });
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // --- Marquer PRÉSENTE : on retire/raccourcit/scinde les séjours sur [date_debut, date_fin] ---
  if (mode === "present") {
    const { data: overlaps, error: fetchError } = await supabase
      .from("absences_sejour")
      .select("*")
      .eq("user_id", user_id)
      .lte("date_debut", date_fin!)
      .gte("date_fin", date_debut!);

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    for (const a of overlaps ?? []) {
      const fullyInside = a.date_debut >= date_debut! && a.date_fin <= date_fin!;
      const spansAcross = a.date_debut < date_debut! && a.date_fin > date_fin!;

      if (fullyInside) {
        const { error: e } = await supabase.from("absences_sejour").delete().eq("id", a.id);
        if (e) return NextResponse.json({ error: e.message }, { status: 500 });
      } else if (spansAcross) {
        // On garde la partie avant et on recrée la partie après.
        const { error: e1 } = await supabase
          .from("absences_sejour")
          .update({ date_fin: addDays(date_debut!, -1) })
          .eq("id", a.id);
        const { error: e2 } = await supabase.from("absences_sejour").insert({
          user_id,
          date_debut: addDays(date_fin!, 1),
          date_fin: a.date_fin,
          contact: a.contact,
        });
        if (e1 || e2) return NextResponse.json({ error: (e1 || e2)!.message }, { status: 500 });
      } else if (a.date_debut < date_debut!) {
        // Déborde à gauche : on coupe la fin.
        const { error: e } = await supabase
          .from("absences_sejour")
          .update({ date_fin: addDays(date_debut!, -1) })
          .eq("id", a.id);
        if (e) return NextResponse.json({ error: e.message }, { status: 500 });
      } else {
        // Déborde à droite : on coupe le début.
        const { error: e } = await supabase
          .from("absences_sejour")
          .update({ date_debut: addDays(date_fin!, 1) })
          .eq("id", a.id);
        if (e) return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Mode invalide (absent|present)." }, { status: 400 });
}

// --- Modifier un séjour ---
export async function PUT(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { id, date_debut, date_fin, contact } = body as {
    id?: string;
    date_debut?: string;
    date_fin?: string;
    contact?: string | null;
  };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  const dateError = validateDates(date_debut, date_fin);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const { error: dbError } = await supabase
    .from("absences_sejour")
    .update({
      date_debut,
      date_fin,
      contact: contact?.trim() ? contact.trim() : null,
    })
    .eq("id", id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// --- Supprimer un séjour ---
export async function DELETE(req: NextRequest) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { id } = body as { id?: string };
  if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });

  const { error: dbError } = await supabase.from("absences_sejour").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
