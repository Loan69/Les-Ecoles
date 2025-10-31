"use client"

import { useEffect, useState, useCallback } from "react"
import { Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useSupabase } from "@/app/providers"
import { EventFormData } from "@/types/EventFormData"
import { Residente } from "@/types/Residente"

interface VisionConfirmationsProps {
  eventId: number
}

export default function VisionConfirmation({ eventId }: VisionConfirmationsProps) {
  const [participants, setParticipants] = useState<Residente[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const { supabase } = useSupabase()

  const fetchParticipants = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("evenements")
      .select("confirmations")
      .eq("id", eventId)
      .single()

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    const confirmations = (data?.confirmations as EventFormData["confirmations"]) || []
    if (confirmations.length === 0) {
      setParticipants([])
      setLoading(false)
      return
    }

    const { data: residents, error: resErr } = await supabase
      .from("residentes")
      .select(
        "id, user_id, nom, prenom, date_naissance, residence, etage, chambre, created_at, email, is_admin"
      )
      .in("user_id", confirmations)

    if (!resErr && residents) {
      setParticipants(residents as Residente[])
    }

    setLoading(false)
  }, [eventId, supabase])

  // 🔹 Recharge la liste à chaque ouverture du Dialog
  useEffect(() => {
    if (open) {
      fetchParticipants()
    }
  }, [open, fetchParticipants])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-2 border border-black rounded-lg cursor-pointer">
          <Eye className="w-5 h-5" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Résidentes ayant confirmé</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-gray-500">Chargement...</p>
        ) : participants.length > 0 ? (
          <ul className="list-disc ml-6 mt-2">
            {participants.map((r) => (
              <li key={r.user_id}>
                {r.prenom} {r.nom}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 mt-2">
            Aucune confirmation pour le moment.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
