import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function DELETE(req: NextRequest) {
  try {
    // Vérifier que l'utilisateur connecté est admin
    const cookieStore = await cookies();
    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: adminCheck } = await supabaseUser
      .from("residentes")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Récupérer l'userId à supprimer
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId requis" },
        { status: 400 }
      );
    }

    // Protection : empêcher la suppression de son propre compte
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte" },
        { status: 400 }
      );
    }

    // Client admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Supprimer de la table residentes (par user_id)
    const { error: deleteResidenteError } = await supabaseAdmin
      .from("residentes")
      .delete()
      .eq("user_id", userId);

    if (deleteResidenteError) {
      console.error("Erreur suppression résidente:", deleteResidenteError);
      return NextResponse.json(
        { error: "Erreur lors de la suppression de la résidente" },
        { status: 500 }
      );
    }

    // 2. Supprimer l'utilisateur Auth
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );

    if (deleteAuthError) {
      console.error("Erreur suppression Auth:", deleteAuthError);
      return NextResponse.json(
        { error: "Erreur lors de la suppression du compte utilisateur" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Utilisatrice supprimée avec succès" 
    });

  } catch (error) {
    console.error("Erreur DELETE user:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}