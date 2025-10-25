import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type AbsenceInsertBody = {
  isAbsent: boolean
  date?: string
}

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

    const body: AbsenceInsertBody = await req.json()
    const userId = user.id
    const today = body.date || new Date().toISOString().split('T')[0]

    if (body.isAbsent) {
      // DELETE
      const { data, error } = await supabase
        .from('absences')
        .delete()
        .eq('user_id', userId)
        .eq('date_absence', today)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, })
    } else {
      // INSERT
      const { data, error } = await supabase
        .from('absences')
        .insert({ user_id: userId, date_absence: today })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, })
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
