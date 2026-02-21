'use client'

import React, { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/app/lib/supabaseClient';

type GuestRow = {
  id: number;
  nom: string;
  prenom: string;
}

export default function GuestsTable() {
  const [invites, setInvites] = useState<GuestRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deletingGuestId ,setDeletingGuestId] = useState<number | null>(null)

  // Chargement de la liste des invités
  async function fetchGuests() {
    setLoading(true)
    const {data : guests, error } = await supabase
            .from("invites")
            .select("id, nom, prenom");
        if(error) {
            console.error("Erreur lors du chargement des invitées", error)
        } else {
            setInvites(guests)
            setLoading(false)
        }
  }
  useEffect(() => {
    fetchGuests();
  }, [])

  // Supprimer un invité
  async function deleteGuest(u: GuestRow) {

    const confirmMsg = `Êtes-vous sûr(e) de vouloir supprimer ${u.prenom} ${u.nom} ?\n\nCette action est irréversible et supprimera toutes les données associées`
    
    if (!confirm(confirmMsg)) return
    setError(null)

    try {
        setDeletingGuestId(u.id)
        // Suppression de toutes les lignes de l'invité dans la table invites_repas
        const { data, error: errorDeleteInvite_repas } = await supabase
        .from("invites_repas")
        .delete()
        .eq("id_invite", u.id)
        .select();

        console.log("u.id =", u.id, typeof u.id)
        console.log("Lignes supprimées :", data)

        if(errorDeleteInvite_repas) {
            console.error("Erreur lors de la suppression dans invites_repas : ", errorDeleteInvite_repas);
            setError("Erreur lors la suppression de l'invité")
            return
        }

        // Ensuite suppression dans la table invites
        const { error: errorDeleteInvite } = await supabase
            .from("invites")
            .delete()
            .eq("id", u.id)
        
        if(errorDeleteInvite) {
            console.error("Erreur lors de la suppression dans invites", errorDeleteInvite)
            setError("Erreur lors la suppression de l'invité")
            return
        } else {
            // Retirer l'utilisateur de la liste
            setInvites(invites.filter(x => x.id !== u.id))
        }
      
    } catch (e) {
      if (e instanceof Error) setError(e.message)
      else setError(String(e))
    } finally {
      setDeletingGuestId(null)
      setSuccess("Invité supprimé avec succès")
    }
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-4">
      
      {/* Affichage des résultats des actions */} 
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
              invites.sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom)) // Tri par nom puis par prénom
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
                        title="Supprimer cette utilisatrice"
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