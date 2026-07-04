'use client'

import { useRouter } from 'next/navigation'
import { UserRound } from 'lucide-react'

export default function ProfileButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/profil')}
      title="Mon profil"
      className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200 cursor-pointer"
    >
      <UserRound className="w-5 h-5" />
    </button>
  )
}
