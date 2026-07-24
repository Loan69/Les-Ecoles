'use client'

import React, { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { NIVEAU_LABEL, NIVEAUX, asNiveau, type Niveau } from '@/lib/roles'

type UserRow = {
  id: string
  name: string | null
  email: string | null
  role: 'résidente' | 'invitée'
  niveau: Niveau
  source_pk: string | number
  last_sign_in_at?: string | null
}

export default function UsersTable({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [canManageRoles, setCanManageRoles] = useState(false)
  const [isTechnique, setIsTechnique] = useState(false)

  const showLastLogin = isTechnique

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setUsers(json.users)
      setCanManageRoles(json.canManageRoles ?? false)
      setIsTechnique(json.isTechnique ?? false)
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

  async function changeNiveau(u: UserRow, niveau: Niveau) {
    if (u.role !== 'résidente') return
    if (u.id === currentUserId) return // anti-lockout côté client aussi

    const prev = users
    setUsers(users.map(x => x.id === u.id ? { ...x, niveau } : x))

    try {
      const res = await fetch('/api/admin/users/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pk: u.source_pk, niveau }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      setSuccess("Niveau de l'utilisatrice mis à jour")
    } catch (e) {
      if (e instanceof Error) setError(e.message)
      else setError(String(e))
      setUsers(prev)
    }
  }

  async function performDeleteUser(u: UserRow) {
    setDeletingUserId(u.id)
    setError(null)
    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Suppression échouée')
      setUsers(users.filter(x => x.id !== u.id))
    } catch (e) {
      if (e instanceof Error) setError(e.message)
      else setError(String(e))
    } finally {
      setSuccess("Utilisateur supprimé avec succès")
      setDeletingUserId(null)
    }
  }

  function deleteUser(u: UserRow) {
    if (u.id === currentUserId) {
      setError("Vous ne pouvez pas supprimer votre propre compte")
      return
    }

    toast("Supprimer cette utilisatrice ?", {
      description: `${u.name || u.email} — Cette action est irréversible.`,
      action: {
        label: "Supprimer",
        onClick: () => performDeleteUser(u)
      },
      cancel: {
        label: "Annuler",
        onClick: () => {}
      }
    })
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

  const colCount = 4 + (showLastLogin ? 1 : 0) + (canManageRoles ? 1 : 0)

  return (
    <div className="bg-white shadow-sm rounded-lg p-4">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niveau</th>
              {showLastLogin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dernière connexion
                </th>
              )}
              {canManageRoles && <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={colCount} className="px-6 py-4">Chargement...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={colCount} className="px-6 py-4">Aucune utilisatrice trouvée.</td></tr>
            ) : (
              users.map(u => {
                const isSelf = u.id === currentUserId
                const isDeleting = deletingUserId === u.id
                const isResidente = u.role === 'résidente'
                // Le super-admin peut régler le niveau d'une résidente (sauf la sienne).
                const canSetNiveau = canManageRoles && isResidente && !isSelf

                return (
                  <tr key={u.id} className={isDeleting ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {u.name} {isSelf && <span className="text-xs text-gray-400">(vous)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{u.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {!isResidente ? (
                        <span className="text-gray-400">—</span>
                      ) : canSetNiveau ? (
                        <select
                          value={u.niveau}
                          onChange={(e) => changeNiveau(u, asNiveau(Number(e.target.value)))}
                          disabled={isDeleting}
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer disabled:opacity-50"
                        >
                          {NIVEAUX.map((n) => (
                            <option key={n} value={n}>{NIVEAU_LABEL[n]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {NIVEAU_LABEL[u.niveau]}
                        </span>
                      )}
                    </td>
                    {showLastLogin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatLastLogin(u.last_sign_in_at)}
                      </td>
                    )}
                    {canManageRoles && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {isResidente && !isSelf && (
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
                    )}
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
