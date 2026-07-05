'use client'

import { useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'

export default function AdministratifButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/administratif')}
      title="Administratif"
      className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200 cursor-pointer"
    >
      <BookOpen className="w-5 h-5" />
    </button>
  )
}
