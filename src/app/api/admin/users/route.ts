import { NextResponse } from 'next/server'
import { createServerClient } from "@supabase/ssr";
import { cookies } from 'next/headers'

export async function GET(req: Request) {
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Vérification que la personne est admin
    const { data: currentRes } = await supabase
    .from('residentes')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

    if (!currentRes?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Récupérer toutes les résidentes
    const { data: residentes, error: err1 } = await supabase
    .from('residentes')
    .select('user_id, nom, prenom, email, is_admin')
    .order('nom', { ascending: true })

    // Récupérer toutes les invitées
    const { data: invitees, error: err2 } = await supabase
    .from('invitees')
    .select('user_id, nom, prenom, email')
    .order('nom', { ascending: true })

    if (err1 || err2)
    return NextResponse.json({ error: err1?.message || err2?.message }, { status: 500 })

    const users = [
    ...residentes.map(r => ({
        id: r.user_id,
        name: `${r.prenom} ${r.nom}`,
        email: r.email,
        role: 'résidente',
        is_admin: r.is_admin,
        source_pk: r.user_id,
    })),
    ...invitees.map(i => ({
        id: `inv_${i.user_id}`,
        name: `${i.prenom} ${i.nom}`,
        email: i.email,
        role: 'invitée',
        is_admin: false,
        source_pk: i.user_id,
    })),
    ]

    return NextResponse.json({ users })
}
