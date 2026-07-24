'use client'

import React, { useEffect, useState } from 'react'
import { Trash2, ShieldCheck, SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'sonner'
import { SECTIONS, SECTION_LABEL, NIVEAU_LABEL, NIVEAUX_SECTION, asNiveauSection, type Rights, type Section } from '@/lib/roles'

type UserRow = {
  id: string
  name: string | null
  email: string | null
  role: 'résidente' | 'invitée'
  rights: Rights | null
  source_pk: string | number
  last_sign_in_at?: string | null
}

// Résumé compact des droits d'une résidente.
function RightsSummary({ r }: { r: Rights }) {
  if (r.is_super_admin) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800"><ShieldCheck className="w-3.5 h-3.5" /> Super-admin</span>
  }
  const actives = SECTIONS.filter((s) => r[s] >= 2)
  if (actives.length === 0) return <span className="text-xs text-gray-400">Résidente</span>
  return (
    <span className="flex flex-col items-start gap-1">
      {actives.map((s) => (
        <span key={s} className={`text-[11px] rounded px-1.5 py-0.5 whitespace-nowrap ${r[s] >= 3 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
          {SECTION_LABEL[s]} : {NIVEAU_LABEL[asNiveauSection(r[s])]}
        </span>
      ))}
    </span>
  )
}

export default function UsersTable({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [canManageRoles, setCanManageRoles] = useState(false)
  const [isTechnique, setIsTechnique] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null) // panneau « Droits »

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
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  async function saveRights(u: UserRow, rights: Rights) {
    const prev = users
    setUsers(users.map((x) => (x.id === u.id ? { ...x, rights } : x)))
    setEditing(null)
    try {
      const res = await fetch('/api/admin/users/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pk: u.source_pk, rights }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      setSuccess('Droits mis à jour')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
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
      setUsers(users.filter((x) => x.id !== u.id))
      setSuccess('Utilisateur supprimé avec succès')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeletingUserId(null)
    }
  }

  function deleteUser(u: UserRow) {
    if (u.id === currentUserId) { setError('Vous ne pouvez pas supprimer votre propre compte'); return }
    toast('Supprimer cette utilisatrice ?', {
      description: `${u.name || u.email} — Cette action est irréversible.`,
      action: { label: 'Supprimer', onClick: () => performDeleteUser(u) },
      cancel: { label: 'Annuler', onClick: () => {} },
    })
  }

  function formatLastLogin(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    const diffMs = Date.now() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / 3600000)
      if (diffHours === 0) { const m = Math.floor(diffMs / 60000); return m <= 1 ? "À l'instant" : `Il y a ${m}min` }
      return diffHours === 1 ? 'Il y a 1h' : `Il y a ${diffHours}h`
    }
    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return `Il y a ${diffDays}j`
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`
    if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const colCount = 3 + (showLastLogin ? 1 : 0) + (canManageRoles ? 1 : 0)

  return (
    <div className="bg-white shadow-sm rounded-lg p-4">
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-green-600 text-sm">{success}</p></div>}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-600 text-sm">{error}</p></div>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-72">Droits</th>
              {showLastLogin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernière connexion</th>}
              {canManageRoles && <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={colCount} className="px-6 py-4">Chargement...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={colCount} className="px-6 py-4">Aucune utilisatrice trouvée.</td></tr>
            ) : (
              users.map((u) => {
                const isSelf = u.id === currentUserId
                const isDeleting = deletingUserId === u.id
                const isResidente = u.role === 'résidente'
                return (
                  <tr key={u.id} className={isDeleting ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {u.name} {isSelf && <span className="text-xs text-gray-400">(vous)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 w-72">
                      {isResidente && u.rights ? <RightsSummary r={u.rights} /> : <span className="text-xs text-gray-400">Invitée</span>}
                    </td>
                    {showLastLogin && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatLastLogin(u.last_sign_in_at)}</td>}
                    {canManageRoles && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {isResidente && !isSelf && u.rights && (
                            <button onClick={() => setEditing(u)} className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer" title="Régler les droits">
                              <SlidersHorizontal size={14} /> Droits
                            </button>
                          )}
                          {isResidente && !isSelf && (
                            <button onClick={() => deleteUser(u)} disabled={isDeleting} className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer disabled:opacity-50" title="Supprimer cette utilisatrice">
                              <Trash2 size={14} /> {isDeleting ? 'Suppression...' : 'Supprimer'}
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

      {editing && editing.rights && (
        <RightsPanel user={editing} onClose={() => setEditing(null)} onSave={saveRights} />
      )}
    </div>
  )
}

// --- Panneau de réglage des droits (super-admin) ---
function RightsPanel({ user, onClose, onSave }: { user: UserRow; onClose: () => void; onSave: (u: UserRow, r: Rights) => void }) {
  const [draft, setDraft] = useState<Rights>({ ...(user.rights as Rights) })
  const setSection = (s: Section, v: number) => setDraft((d) => ({ ...d, [s]: asNiveauSection(v) }))

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-blue-800">Droits — {user.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Un niveau par section. Le super-admin a tous les droits et gère les rôles.</p>

        <label className="flex items-center gap-2 mb-4 p-3 rounded-lg border border-purple-100 bg-purple-50 cursor-pointer">
          <input type="checkbox" checked={draft.is_super_admin} onChange={(e) => setDraft((d) => ({ ...d, is_super_admin: e.target.checked }))} className="w-4 h-4 accent-purple-600" />
          <span className="text-sm font-medium text-purple-800 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Super-admin (tous droits + gestion)</span>
        </label>

        <div className={`space-y-2 ${draft.is_super_admin ? 'opacity-40 pointer-events-none' : ''}`}>
          {SECTIONS.map((s) => (
            <div key={s} className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700">{SECTION_LABEL[s]}</span>
              <select
                value={draft.is_super_admin ? 3 : draft[s]}
                onChange={(e) => setSection(s, Number(e.target.value))}
                disabled={draft.is_super_admin}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                {NIVEAUX_SECTION.map((n) => (
                  <option key={n} value={n}>{NIVEAU_LABEL[n]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer">Annuler</button>
          <button onClick={() => onSave(user, draft)} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 cursor-pointer">Enregistrer</button>
        </div>
      </div>
    </div>
  )
}
