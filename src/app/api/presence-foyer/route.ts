import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

type AbsenceInsertBody = {
  isAbsent: boolean
  date?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })

    // Récupère la session côté serveur
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body: AbsenceInsertBody = await req.json()
    const userId = session.user.id
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
