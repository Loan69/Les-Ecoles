"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/app/providers"
import { User } from "@supabase/supabase-js"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarEvent } from "@/types/CalendarEvent"

interface ConfirmationToggleProps {
  eventId: number | undefined;
}

export default function ResidentParticipationButton({ eventId }: ConfirmationToggleProps) {
  const { supabase } = useSupabase()
  const [user, setUser] = useState<User | null>(null)
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isIntendance, setIsIntendance] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) return
      setUser(data.user)
    }
    fetchUser()
  }, [supabase])

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

      const confirmations = (data?.confirmations as CalendarEvent["confirmations"]) || []
      setChecked(confirmations.includes(user.id))
      setIsIntendance(data?.category === "intendance")
    }

    fetchEventData()
  }, [user, eventId, supabase])

  

  const handleToggle = async () => {
    if (!user) return;
    setLoading(true);

    try {

        // Récupérer les confirmations actuelles
        const { data, error } = await supabase
        .from("evenements")
        .select("confirmations")
        .eq("id", eventId)
        .single();

        if (error) {
        console.error("❌ Erreur fetch confirmations :", error);
        setLoading(false);
        return;
        }

        // Toujours récupérer un tableau
        const confirmations: string[] = data?.confirmations || [];
        const userId = user.id;

        // Ajouter ou retirer l'utilisateur
        const updatedConfirmations = checked
        ? confirmations.filter(id => id !== userId)
        : [...confirmations, userId];

        // Update dans Supabase
        const { data: updateData, error: updateError } = await supabase
        .from("evenements")
        .update({ confirmations: updatedConfirmations })
        .eq("id", eventId)
        .select(); // 🔹 select() permet de récupérer le résultat après update

        if (updateError) {
        console.error("❌ Erreur update confirmations :", updateError);
        } else {
        setChecked(!checked); // Mise à jour visuelle
        }
    } catch (err) {
        console.error("❌ Exception handleToggle :", err);
    } finally {
        setLoading(false);
    }
    };

  const activeLabel = isIntendance ? "Fait" : "Je participe"
  const inactiveLabel = isIntendance ? "Non réalisé" : "Je ne participe pas"

  return (
    <Button
      variant="outline"
      disabled={loading}
      onClick={handleToggle}
      title={checked ? activeLabel : inactiveLabel} // infobulle
      className={cn(
        "cursor-pointer p-2 rounded-lg transition-all flex items-center justify-center",
        "border hover:bg-gray-200",
        checked
          ? "border-green-500 bg-green-500 text-white hover:bg-green-600"
          : "border-gray-400 bg-white text-gray-700"
      )}
    >
      {checked ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
    </Button>
  )
}
