'use client'

import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'
import { useMyRights } from '@/lib/useMyRights'

// Accès au panneau d'administration (section « Comptes »), en haut à droite.
// Visible pour qui a au moins la lecture sur la section Comptes (ou super-admin / technique).
export default function AdministrationButton() {
  const router = useRouter()
  const { canView, loading } = useMyRights()

  if (loading || !canView('comptes')) return null

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
