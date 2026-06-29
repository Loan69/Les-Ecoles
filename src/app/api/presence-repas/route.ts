import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

type RepasType = "dejeuner" | "diner";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
    }

    const {
      repas,
      date,
      choix,
      option_id,
    }: {
      repas: RepasType;
      date?: string;
      choix: string;
      option_id?: number | null;
    } = await req.json();

    const userId = user.id;
    const dateToday = date || new Date().toISOString().split("T")[0];

    const { data: existing, error: selectError } = await supabase
      .from("presences")
      .select("id_repas, choix_repas, option_id")
      .eq("user_id", userId)
      .eq("date_repas", dateToday)
      .eq("type_repas", repas)
      .maybeSingle();

    if (selectError) {
      return NextResponse.json({ success: false, message: "Erreur lors de la vérification du repas." });
    }

    // Suppression si choix "non"
    if (choix === "non") {
      if (existing) {
        const { error: deleteError } = await supabase
          .from("presences")
          .delete()
          .eq("id_repas", existing.id_repas);

        if (deleteError) {
          return NextResponse.json({ success: false, message: "Erreur lors de la suppression du repas." });
        }

        return NextResponse.json({
          success: true,
          action: "deleted",
          repas,
          choix,
          id_repas: null,
          message: `Vous êtes désinscrite pour le ${repas}.`,
        });
      }

      return NextResponse.json({
        success: true,
        action: "noop",
        repas,
        choix,
        id_repas: null,
        message: `Aucun repas à supprimer pour le ${repas}.`,
      });
    }

    // Mise à jour si déjà existant
    if (existing) {
      const { error: updateError } = await supabase
        .from("presences")
        .update({ choix_repas: choix, option_id: option_id || null })
        .eq("id_repas", existing.id_repas);

      if (updateError) {
        return NextResponse.json({ success: false, message: "Erreur lors de la mise à jour du repas." });
      }

      return NextResponse.json({
        success: true,
        action: "updated",
        repas,
        choix,
        id_repas: existing.id_repas,
        message: `Votre choix du ${repas} a été mis à jour.`,
      });
    }

    // Insertion
    const { data: insertedData, error: insertError } = await supabase
      .from("presences")
      .insert({
        user_id: userId,
        type_repas: repas,
        date_repas: dateToday,
        choix_repas: choix,
        option_id: option_id || null,
      })
      .select("id_repas")
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, message: "Erreur lors de l'ajout du repas." });
    }

    return NextResponse.json({
      success: true,
      action: "inserted",
      repas,
      choix,
      id_repas: insertedData?.id_repas || null,
      message: `Vous êtes inscrite pour le ${repas}.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, message });
  }
}
