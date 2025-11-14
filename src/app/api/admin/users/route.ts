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

  // Ton UID pour récupérer les données de connexion
  const SUPER_ADMIN_UID = '17e3e1c7-3219-46e4-8aad-324f93b7b5de'
  const includeLastLogin = user.id === SUPER_ADMIN_UID

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

  // Si tu es le super admin, récupérer les infos de dernière connexion depuis auth.users
  let authUsers: Record<string, string | null> = {}
  
  if (includeLastLogin) {
    const allUserIds = [
      ...residentes.map(r => r.user_id),
      ...invitees.map(i => i.user_id)
    ]

    // Récupérer les infos d'auth pour chaque utilisateur
    for (const userId of allUserIds) {
      try {
        const { data: authData } = await supabase.auth.admin.getUserById(userId)
        if (authData?.user?.last_sign_in_at) {
          authUsers[userId] = authData.user.last_sign_in_at
        }
      } catch (e) {
        // Ignorer les erreurs pour ne pas bloquer l'affichage
        console.error(`Erreur récupération auth pour ${userId}:`, e)
      }
    }
  }

  let users = [
    ...residentes.map(r => ({
      id: r.user_id,
      name: `${r.prenom} ${r.nom}`,
      email: r.email,
      role: 'résidente',
      is_admin: r.is_admin,
      source_pk: r.user_id,
      ...(includeLastLogin && { last_sign_in_at: authUsers[r.user_id] || null })
    })),
    ...invitees.map(i => ({
      id: `inv_${i.user_id}`,
      name: `${i.prenom} ${i.nom}`,
      email: i.email,
      role: 'invitée',
      is_admin: false,
      source_pk: i.user_id,
      ...(includeLastLogin && { last_sign_in_at: authUsers[i.user_id] || null })
    })),
  ]

  // Si super admin, trier par dernière connexion (plus récent en premier)
  if (includeLastLogin) {
    users.sort((a, b) => {
      const dateA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0
      const dateB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0
      return dateB - dateA // Ordre décroissant (plus récent d'abord)
    })
  }

  return NextResponse.json({ users })
}