import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

type RepasType = 'dejeuner' | 'diner'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ 
        success: false,
        message: "Vous devez être connectée pour modifier vos repas." 
      }, { status: 401 })
    }

    const { repas, date }: { repas: RepasType; date?: string } = await req.json()
    const userId = session.user.id
    const dateToday = date || new Date().toISOString().split('T')[0]

    // Vérifie si un repas existe déjà
    const { data: existing, error: selectError } = await supabase
      .from('presences')
      .select('id_repas')
      .eq('user_id', userId)
      .eq('date_repas', dateToday)
      .eq('type_repas', repas)
      .maybeSingle()

    if (selectError) {
      return NextResponse.json({ 
        success: false,
        message: "Erreur lors de la vérification du repas.",
        error: selectError.message 
      }, { status: 500 })
    }

    if (existing) {
      // 🔹 Suppression
      const { error: deleteError } = await supabase
        .from('presences')
        .delete()
        .eq('id_repas', existing.id_repas)

      if (deleteError) {
        return NextResponse.json({ 
          success: false,
          message: "Erreur lors de la suppression du repas.",
          error: deleteError.message 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'deleted',
        repas,
        message: repas === 'dejeuner'
          ? 'Vous êtes désinscrite pour le déjeuner.'
          : 'Vous êtes désinscrite pour le dîner.'
      })
    }

    // 🔹 Insertion
    const { error: insertError } = await supabase.from('presences').insert({
      user_id: userId,
      type_repas: repas,
      date_repas: dateToday,
    })

    if (insertError) {
      return NextResponse.json({ 
        success: false,
        message: "Erreur lors de l’ajout du repas.",
        error: insertError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      action: 'inserted',
      repas,
      message: repas === 'dejeuner'
        ? 'Vous êtes inscrite pour le déjeuner.'
        : 'Vous êtes inscrite pour le dîner.'
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
