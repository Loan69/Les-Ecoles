'use client'

import React, { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

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
  const [success, setSuccess] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

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
    if (u.id === currentUserId && !setTo) return

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
    } finally {
      setSuccess("Rôle de l'utilisateur modifié avec succès")
    }
  }

  async function deleteUser(u: UserRow) {
    if (u.id === currentUserId) {
      setError("Vous ne pouvez pas supprimer votre propre compte")
      return
    }

    const confirmMsg = `Êtes-vous sûr(e) de vouloir supprimer ${u.name || u.email} ?\n\nCette action est irréversible et supprimera :\n- Le compte utilisateur\n- Toutes les données associées`
    
    if (!confirm(confirmMsg)) return

    setDeletingUserId(u.id)
    setError(null)

    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id }),
      })

      const json = await res.json()
      
      if (!res.ok) {
        throw new Error(json.error || 'Suppression échouée')
      }

      // Retirer l'utilisateur de la liste
      setUsers(users.filter(x => x.id !== u.id))
      
    } catch (e) {
      if (e instanceof Error) setError(e.message)
      else setError(String(e))
    } finally {
      setSuccess("Utilisateur supprimé avec succès")
      setDeletingUserId(null)
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
      {/* Affichage des résultats des actions */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-600 text-sm">{success}</p>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

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
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                const isDeleting = deletingUserId === u.id
                
                return (
                  <tr key={u.id} className={isDeleting ? 'opacity-50' : ''}>
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
                      <div className="flex items-center justify-end gap-2">
                        {u.role === 'résidente' && !isSelf && (
                          u.is_admin ? (
                            <button
                              onClick={() => toggleAdmin(u, false)}
                              disabled={isDeleting}
                              className="inline-flex items-center px-3 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer disabled:opacity-50"
                            >
                              Révoquer
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleAdmin(u, true)}
                              disabled={isDeleting}
                              className="inline-flex items-center px-3 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer disabled:opacity-50"
                            >
                              Promouvoir
                            </button>
                          )
                        )}
                        
                        {u.role === 'résidente' && !isSelf && (
                          <button
                            onClick={() => deleteUser(u)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer disabled:opacity-50"
                            title="Supprimer cette utilisatrice"
                          >
                            <Trash2 size={14} />
                            {isDeleting ? 'Suppression...' : 'Supprimer'}
                          </button>
                        )}
                      </div>
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