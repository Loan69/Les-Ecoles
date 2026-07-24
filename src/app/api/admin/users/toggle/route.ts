import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/apiAuth";
import { asNiveau } from "@/lib/roles";

// Règle le niveau de droits d'une résidente (1..4).
// Réservé au super-admin (niveau 4) ou au compte technique.
export async function POST(req: Request) {
  try {
    const { supabase, userId, error } = await requireSuperAdmin();
    if (error) return error;

    const body = await req.json();
    const pk: string | undefined = body.pk;
    const niveau = asNiveau(Number(body.niveau));

    if (!pk || ![1, 2, 3, 4].includes(niveau)) {
      return NextResponse.json({ error: "Requête invalide (pk + niveau 1..4)." }, { status: 400 });
    }

    // Anti-lockout : on ne change pas son propre niveau.
    if (pk === userId) {
      return NextResponse.json({ error: "Vous ne pouvez pas modifier votre propre niveau." }, { status: 400 });
    }

    // Le compte technique caché reste hors hiérarchie.
    const { data: tgt } = await supabase.from("residentes").select("is_technique").eq("user_id", pk).maybeSingle();
    if (tgt?.is_technique) {
      return NextResponse.json({ error: "Ce compte ne peut pas être modifié." }, { status: 403 });
    }

    // is_admin est resynchronisé automatiquement par trigger (niveau >= 2).
    const { error: updateError } = await supabase.from("residentes").update({ niveau }).eq("user_id", pk);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur inattendue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
