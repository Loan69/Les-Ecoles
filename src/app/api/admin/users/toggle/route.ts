import { NextResponse } from 'next/server'
import { createServerClient } from "@supabase/ssr";
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  console.log('--- [ADMIN TOGGLE] Start ---')

  try {
    const body = await req.json()
    console.log('[1] Body reçu:', body)

    const { role, pk, setTo } = body
    if (role !== 'résidente' || typeof setTo !== 'boolean' || !pk) {
      console.log('[1.1] Payload invalide')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

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
    console.log('[2] Supabase client créé')

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[3] Utilisateur auth:', user?.id, 'Erreur:', authError)

    if (authError || !user) {
      console.log('[3.1] Utilisateur non authentifié')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const currentUserId = user.id

    const { data: currentRes, error: resErr } = await supabase
      .from('residentes')
      .select('is_admin')
      .eq('user_id', currentUserId)
      .single()

    console.log('[4] Résidente courante:', currentRes, 'Erreur:', resErr)

    if (resErr || !currentRes?.is_admin) {
      console.log('[4.1] Utilisateur non admin ou erreur')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!setTo && pk === currentUserId) {
      console.log('[5] Tentative d’auto-révocation bloquée')
      return NextResponse.json({ error: 'Impossible de se révoquer soi-même' }, { status: 400 })
    }

    console.log('[6] Tentative de mise à jour:', { pk, setTo })

    const { error: updateError } = await supabase
      .from('residentes')
      .update({ is_admin: setTo })
      .eq('user_id', pk)

    if (updateError) {
      console.log('[7] Erreur de mise à jour:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log('[8] Mise à jour réussie pour:', pk)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[X] Erreur inattendue:', e)
    const message =
      e instanceof Error ? e.message : 'Unexpected server error'
  
      return NextResponse.json({ error: message }, { status: 500 })
  }
}
