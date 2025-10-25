import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    // ⚡ Création du client serveur Supabase
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

    const { date } = await req.json();

    // 🔹 Récupération de l'utilisateur connecté
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
    return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
    }

    // 🔹 Vérification de l'absence
    const { data, error } = await supabase
        .from("absences")
        .select("id")
        .eq("user_id", user.id)
        .eq("date_absence", date)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ isAbsent: !!data });
}
