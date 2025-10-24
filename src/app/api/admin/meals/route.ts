import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
    const supabase = createServerComponentClient({ cookies: () => cookies() })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
    .from('repas_options')
    .select('*')
    .order('start_date', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
}

export async function POST(req: Request) {
    try {
        const supabase = createServerComponentClient({ cookies: () => cookies() })
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { start_date, end_date, indefinite, service, options, admin_only } = body

        console.log("start_date", start_date)
        console.log("service", service)
        if (!start_date || !service) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

        const { error } = await supabase.from('repas_options').insert({
            start_date,
            end_date: indefinite ? null : end_date,
            indefinite,
            service,
            options,
            admin_only,
        })

        if (error) {
            console.error('Supabase upsert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true })
    } catch (e: any) {
        console.error('Meal rule save error', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}