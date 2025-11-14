'use client'

import React, { useEffect, useState } from 'react'

type UserRow = {
  id: string
  name: string | null
  email: string | null
  role: 'résidente' | 'invitée'
  is_admin: boolean
  source_pk: string | number
  last_sign_in_at?: string | null
}

export default function UsersTable({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ton UID pour afficher la colonne dernière connexion
  const SUPER_ADMIN_UID = '17e3e1c7-3219-46e4-8aad-324f93b7b5de'
  const showLastLogin = currentUserId === SUPER_ADMIN_UID

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setUsers(json.users)
    } catch (e) {
      if (e instanceof Error) setError(e.message)
      else setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  async function toggleAdmin(u: UserRow, setTo: boolean) {
    if (u.role !== 'résidente') return
    if (u.id === currentUserId && !setTo) return // protection client

    const prev = users
    setUsers(users.map(x => x.id === u.id ? { ...x, is_admin: setTo } : x))

    try {
      const body = { role: u.role, pk: u.source_pk, setTo }
      const res = await fetch('/api/admin/users/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
    } catch (e) {
      if (e instanceof Error) setError(e.message)
      else setError(String(e))
      setUsers(prev)
    }
  }

  function formatLastLogin(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60))
        return diffMins <= 1 ? "À l'instant" : `Il y a ${diffMins}min`
      }
      return diffHours === 1 ? "Il y a 1h" : `Il y a ${diffHours}h`
    }
    
    if (diffDays === 1) return "Hier"
    if (diffDays < 7) return `Il y a ${diffDays}j`
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`
    if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-4">
      {error && <div className="text-red-600 mb-4">{error}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
              {showLastLogin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dernière connexion
                </th>
              )}
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={showLastLogin ? 6 : 5} className="px-6 py-4">Chargement...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={showLastLogin ? 6 : 5} className="px-6 py-4">Aucune utilisatrice trouvée.</td></tr>
            ) : (
              users.map(u => {
                const isSelf = u.id === currentUserId
                return (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {u.name} {isSelf && <span className="text-xs text-gray-400">(vous)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{u.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.is_admin ? 'Oui' : 'Non'}</td>
                    {showLastLogin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatLastLogin(u.last_sign_in_at)}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {u.role === 'résidente' && !isSelf && (
                        u.is_admin ? (
                          <button
                            onClick={() => toggleAdmin(u, false)}
                            className="inline-flex items-center px-3 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                          >
                            Révoquer
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleAdmin(u, true)}
                            className="inline-flex items-center px-3 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer"
                          >
                            Promouvoir
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}