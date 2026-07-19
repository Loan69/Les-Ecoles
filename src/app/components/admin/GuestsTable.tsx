'use client'

import React, { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useSupabase } from '@/app/providers'
import { toast } from 'sonner'

type GuestRow = {
  id: number;
  nom: string;
  prenom: string;
}

export default function GuestsTable() {
  const { supabase } = useSupabase()
  const [invites, setInvites] = useState<GuestRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deletingGuestId, setDeletingGuestId] = useState<number | null>(null)

  async function fetchGuests() {
    setLoading(true)
    const { data: guests, error } = await supabase
      .from("invites")
      .select("id, nom, prenom")
      .eq("is_active", true)
    if (error) {
      console.error("Erreur lors du chargement des invités", error)
    } else {
      setInvites(guests)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGuests()
  }, [])

  async function performDeleteGuest(u: GuestRow) {
    setDeletingGuestId(u.id)
    setError(null)
    setSuccess(null)
    try {
      // Archivage doux : on conserve l'historique de repas (compta intacte).
      const res = await fetch("/api/invites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id }),
      })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error || "Erreur lors du retrait de l'invité")
        return
      }
      setInvites(invites.filter(x => x.id !== u.id))
      setSuccess("Invité retiré du carnet")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeletingGuestId(null)
    }
  }

  function deleteGuest(u: GuestRow) {
    toast("Retirer cet invité du carnet ?", {
      description: `${u.prenom} ${u.nom} — ses invitations passées sont conservées (compta intacte).`,
      action: {
        label: "Retirer",
        onClick: () => performDeleteGuest(u)
      },
      cancel: {
        label: "Annuler",
        onClick: () => {}
      }
    })
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-4">

      {success && !error && (
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prénom</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-4">Chargement...</td></tr>
            ) : invites.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-4">Aucun invité trouvé.</td></tr>
            ) : (
              invites.sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom))
                .map(u => {
                  const isDeleting = deletingGuestId === u.id
                  return (
                    <tr key={u.id} className={isDeleting ? 'opacity-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {u.nom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.prenom || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                          onClick={() => deleteGuest(u)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer disabled:opacity-50"
                          title="Supprimer cet invité"
                        >
                          <Trash2 size={14} />
                          {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </button>
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
