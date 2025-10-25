import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST() {
  console.log("🔹 sync-user: début de la requête");

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

  try {
    console.log("🧭 Récupération de l'utilisateur connecté...");
    const { data, error: userError } = await supabase.auth.getUser();

    if (userError) throw userError;
    const user = data?.user;

    if (!user) {
      console.warn("🚫 Aucun utilisateur connecté !");
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    console.log("✅ Utilisateur connecté :", user.email);

    console.log("🔍 Recherche du pending_user pour", user.email);
    const { data: pending, error: pendingError } = await supabase
      .from("pending_users")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (pendingError) throw pendingError;
    if (!pending) {
      console.log("ℹ️ Aucun pending_user trouvé.");
      return NextResponse.json({ message: "Aucune donnée en attente." });
    }

    console.log("✅ Pending user trouvé :", pending);

    if (pending.role === "residente") {
      console.log("🏡 Insertion dans la table residentes...");
      const { error: insertError } = await supabase.from("residentes").insert([
        {
          user_id: user.id,
          email: user.email,
          is_admin: false,
          nom: pending.nom,
          prenom: pending.prenom,
          date_naissance: pending.datenaissance,
          residence: pending.residence,
          etage: pending.etage,
          chambre: pending.chambre,
          created_at: new Date().toISOString(),
        },
      ]);
      if (insertError) throw insertError;
      console.log("✅ Résidente insérée avec succès !");
    } else if (pending.role === "invitee") {
      console.log("👤 Insertion dans la table invitees...");
      const { error: insertError } = await supabase.from("invitees").insert([
        {
          user_id: user.id,
          email: user.email,
          nom: pending.nom,
          prenom: pending.prenom,
          created_at: new Date().toISOString(),
        },
      ]);
      if (insertError) throw insertError;
      console.log("✅ Invitée insérée avec succès !");
    } else {
      console.warn("⚠️ Rôle inconnu :", pending.role);
      return NextResponse.json({ error: "Rôle inconnu." }, { status: 400 });
    }

    console.log("🧹 Suppression du pending_user...");
    const { error: deleteError } = await supabase
      .from("pending_users")
      .delete()
      .eq("email", user.email);
    if (deleteError) throw deleteError;
    console.log("✅ pending_user supprimé :", user.email);

    console.log("🎉 Synchronisation terminée avec succès !");
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    let message = "Erreur lors de la synchronisation utilisateur.";
    if (error instanceof Error) message = error.message;

    console.error("❌ Erreur sync-user:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
