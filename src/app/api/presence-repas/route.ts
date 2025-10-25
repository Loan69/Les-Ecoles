import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type RepasType = "dejeuner" | "diner";

export async function POST(req: NextRequest) {
  try {
    // 🧩 Correction ici : cookies() est une Promise en Next 15+
    const cookieStore = await cookies();


    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ service role key côté serveur uniquement
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // 🔹 Récupération de l'utilisateur connecté
     const { data: { user }, error: userError } = await supabase.auth.getUser();

     if (userError || !user) {
     return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
     }

    const { repas, date, choix }: { repas: RepasType; date?: string; choix: string } = await req.json();

    const userId = user.id;
    const dateToday = date || new Date().toISOString().split("T")[0];

    // --- Obtenir "maintenant" en heure de Paris ---
    const nowParis = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })
    );

    // --- Construire targetDate à minuit Paris ---
    const [year, month, day] = dateToday.split("-").map(Number);
    const targetDateParis = new Date(
      nowParis.getFullYear(),  // Remplace si tu veux utiliser l'année de dateToday
      month - 1,
      day,
      0,
      0,
      0
    );

    // --- Comparer les jours ---
    const isPast = targetDateParis < new Date(
      nowParis.getFullYear(),
      nowParis.getMonth(),
      nowParis.getDate(),
      0, 0, 0
    );

    if (isPast) {
      return NextResponse.json({
        success: false,
        message: "Vous ne pouvez plus modifier les repas d'une date passée.",
      });
    }

    // --- 🔍 Vérifie si un repas existe déjà ---
    const { data: existing, error: selectError } = await supabase
      .from("presences")
      .select("id_repas")
      .eq("user_id", userId)
      .eq("date_repas", dateToday)
      .eq("type_repas", repas)
      .maybeSingle();

    if (selectError) {
      console.error("Erreur select repas:", selectError.message);
      return NextResponse.json({
        success: false,
        message: "Erreur lors de la vérification du repas.",
      });
    }

    // --- ❌ Suppression si "non" ---
    if (choix === "non") {
      if (existing) {
        const { error: deleteError } = await supabase
          .from("presences")
          .delete()
          .eq("id_repas", existing.id_repas);

        if (deleteError) {
          console.error("Erreur delete repas:", deleteError.message);
          return NextResponse.json({
            success: false,
            message: "Erreur lors de la suppression du repas.",
          });
        }

        return NextResponse.json({
          success: true,
          action: "deleted",
          repas,
          choix,
          message: `Vous êtes désinscrite pour le ${repas}.`,
        });
      }

      return NextResponse.json({
        success: true,
        action: "noop",
        repas,
        choix,
        message: `Aucun repas à supprimer pour le ${repas}.`,
      });
    }

    // --- 🔄 Mise à jour si déjà existant ---
    if (existing) {
      const { error: updateError } = await supabase
        .from("presences")
        .update({ choix_repas: choix })
        .eq("id_repas", existing.id_repas);

      if (updateError) {
        console.error("Erreur update repas:", updateError.message);
        return NextResponse.json({
          success: false,
          message: "Erreur lors de la mise à jour du repas.",
        });
      }

      return NextResponse.json({
        success: true,
        action: "updated",
        repas,
        choix,
        message: `Votre choix du ${repas} a été mis à jour.`,
      });
    }

    // --- ➕ Insertion sinon ---
    const { error: insertError } = await supabase.from("presences").insert({
      user_id: userId,
      type_repas: repas,
      date_repas: dateToday,
      choix_repas: choix,
    });

    if (insertError) {
      console.error("Erreur insert repas:", insertError.message);
      return NextResponse.json({
        success: false,
        message: "Erreur lors de l’ajout du repas.",
      });
    }

    return NextResponse.json({
      success: true,
      action: "inserted",
      repas,
      choix,
      message: `Vous êtes inscrite pour le ${repas} (${choix}).`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Erreur serveur:", message);
    return NextResponse.json({ success: false, message });
  }
}
