"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/app/providers"
import { User } from "@supabase/supabase-js"
import { EventFormData } from "@/types/EventFormData"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ConfirmationToggleProps {
  eventId: number
}

export default function ResidentParticipationButton({ eventId }: ConfirmationToggleProps) {
  const { supabase } = useSupabase()
  const [user, setUser] = useState<User | null>(null)
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isIntendance, setIsIntendance] = useState(false)

  // 🔹 Récupération de l'utilisateur courant
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) {
        console.warn("Aucun utilisateur valide")
        return
      }
      setUser(data.user)
    }
    fetchUser()
  }, [supabase])

  // 🔹 Récupération des infos de l'évènement (category + confirmations)
  useEffect(() => {
    const fetchEventData = async () => {
      if (!user) return

      const { data, error } = await supabase
        .from("evenements")
        .select("confirmations, category")
        .eq("id", eventId)
        .single()

      if (error) {
        console.error("Erreur récupération event :", error)
        return
      }

      const confirmations = (data?.confirmations as EventFormData["confirmations"]) || []
      setChecked(confirmations.includes(user.id))
      setIsIntendance(data?.category === "intendance")
    }

    fetchEventData()
  }, [user, eventId, supabase])

  // 🔹 Gestion du toggle
  const handleToggle = async () => {
    if (!user) return
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
    const userId = user.id

    const updatedConfirmations = checked
      ? confirmations.filter((id) => id !== userId)
      : [...new Set([...confirmations, userId])]

    const { error: updateError } = await supabase
      .from("evenements")
      .update({ confirmations: updatedConfirmations })
      .eq("id", eventId)

    if (updateError) {
      console.error(updateError)
    } else {
      setChecked(!checked) // ✅ mise à jour visuelle immédiate
    }

    setLoading(false)
  }

  // 🔹 Définition des labels selon la catégorie
  const activeLabel = isIntendance ? "Fait" : "Je participe"
  const inactiveLabel = isIntendance ? "Non réalisé" : "Je ne participe pas"

  return (
    <Button
      variant={checked ? "default" : "outline"}
      disabled={loading}
      onClick={handleToggle}
      className={cn(
        "flex items-center gap-2 transition-all cursor-pointer",
        checked
          ? "bg-green-500 hover:bg-green-600 text-white"
          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
      )}
    >
      {checked ? (
        <>
          <Check className="h-4 w-4" />
          <span>{activeLabel}</span>
        </>
      ) : (
        <>
          <X className="h-4 w-4" />
          <span>{inactiveLabel}</span>
        </>
      )}
    </Button>
  )
}
