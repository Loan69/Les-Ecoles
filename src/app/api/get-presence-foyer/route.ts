import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
    const supabase = createServerComponentClient({ cookies })
  const { date } = await req.json();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("absences")
    .select("user_id")
    .eq("date_absence", date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const absenteIds = data?.map(a => a.user_id) || [];
  return NextResponse.json({ absenteIds });
}
