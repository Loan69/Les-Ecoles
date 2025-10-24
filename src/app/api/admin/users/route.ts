import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
    const supabase = createServerComponentClient({ cookies: () => cookies() })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Vérification que la personne est admin
    const { data: currentRes } = await supabase
    .from('residentes')
    .select('is_admin')
    .eq('user_id', session.user.id)
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
