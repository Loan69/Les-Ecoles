import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/apiAuth";
import { SECTIONS, asNiveauSection, type Section } from "@/lib/roles";

// Règle les droits d'une résidente : niveau par section (1..3) + super-admin global.
// Réservé au super-admin (ou compte technique).
export async function POST(req: Request) {
  try {
    const { supabase, userId, error } = await requireSuperAdmin();
    if (error) return error;

    const body = await req.json();
    const pk: string | undefined = body.pk;
    const rights = (body.rights ?? {}) as Record<string, unknown>;

    if (!pk) return NextResponse.json({ error: "Utilisatrice manquante." }, { status: 400 });

    // Anti-lockout : on ne modifie pas ses propres droits.
    if (pk === userId) {
      return NextResponse.json({ error: "Vous ne pouvez pas modifier vos propres droits." }, { status: 400 });
    }

    // Le compte technique caché reste hors hiérarchie.
    const { data: tgt } = await supabase.from("residentes").select("is_technique").eq("user_id", pk).maybeSingle();
    if (!tgt) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    if (tgt.is_technique) return NextResponse.json({ error: "Ce compte ne peut pas être modifié." }, { status: 403 });

    // Construit la mise à jour à partir des champs fournis.
    const update: Record<string, number | boolean> = {};
    for (const s of SECTIONS as Section[]) {
      if (rights[s] !== undefined) update[`niveau_${s}`] = asNiveauSection(Number(rights[s]));
    }
    if (rights.is_super_admin !== undefined) update.is_super_admin = !!rights.is_super_admin;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Aucun droit à mettre à jour." }, { status: 400 });
    }

    // is_admin est resynchronisé automatiquement par trigger.
    const { error: updateError } = await supabase.from("residentes").update(update).eq("user_id", pk);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur inattendue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
