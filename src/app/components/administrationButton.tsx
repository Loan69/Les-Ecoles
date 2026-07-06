'use client'

import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSupabase } from '@/app/providers'

// Accès au panneau d'administration (réservé aux admins), en haut à droite.
export default function AdministrationButton() {
  const router = useRouter()
  const { supabase } = useSupabase()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('residentes')
        .select('is_admin')
        .eq('user_id', user.id)
        .maybeSingle()
      setIsAdmin(profile?.is_admin ?? false)
    })()
  }, [supabase])

  if (!isAdmin) return null

  return (
    <button
      onClick={() => router.push('/admin/utilisatrices')}
      title="Administration"
      className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200 cursor-pointer"
    >
      <Settings className="w-5 h-5" />
    </button>
  )
}
