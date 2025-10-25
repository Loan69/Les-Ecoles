'use client'

import { useRouter } from 'next/navigation'
import { useSupabase } from "../providers";
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()
  const { supabase } = useSupabase();

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  return (
    <button
      onClick={handleLogout}
      title="Se déconnecter"
      className="top-4 right-4 p-2 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition-all duration-200 cursor-pointer"
    >
      <LogOut className="w-5 h-5" />
    </button>
  )
}
