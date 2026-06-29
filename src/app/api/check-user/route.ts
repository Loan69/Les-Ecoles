import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ exists: false });
    }

    const supabase = createSupabaseAdmin();

    // Vérification dans les tables applicatives (pending_users inclus pour les inscriptions non confirmées)
    const [{ data: residente }, { data: invitee }, { data: pending }] = await Promise.all([
      supabase.from("residentes").select("email").eq("email", email).maybeSingle(),
      supabase.from("invitees").select("email").eq("email", email).maybeSingle(),
      supabase.from("pending_users").select("email").eq("email", email).maybeSingle(),
    ]);

    const exists = !!(residente || invitee || pending);
    return NextResponse.json({ exists });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ exists: false, error: "Erreur serveur" });
  }
}
