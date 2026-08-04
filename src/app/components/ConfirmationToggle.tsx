"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useSupabase } from "@/app/providers"
import { User } from "@supabase/supabase-js"
import { Check } from "lucide-react"
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
      const { data, error } = await supabase.auth.getSession()
      if (error || !data?.session?.user) return
      setUser(data.session.user)
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
    if (!user || loading) return;

    // Mise à jour optimiste : le bouton bascule immédiatement, l'enregistrement suit.
    // Il demande deux allers-retours (lire les confirmations puis les réécrire, pour ne
    // pas écraser celles des autres) : attendre les deux figeait le bouton une bonne seconde.
    const previous = checked;
    setChecked(!checked);
    setLoading(true);

    const revert = (message: string, err?: unknown) => {
      if (err) console.error(message, err);
      setChecked(previous);
      toast.error("Impossible d'enregistrer votre réponse. Réessayez.");
    };

    try {
        // Récupérer les confirmations actuelles
        const { data, error } = await supabase
        .from("evenements")
        .select("confirmations")
        .eq("id", eventId)
        .single();

        if (error) {
        revert("❌ Erreur fetch confirmations :", error);
        return;
        }

        // Toujours récupérer un tableau
        const confirmations: string[] = data?.confirmations || [];
        const userId = user.id;

        // Ajouter ou retirer l'utilisateur
        const updatedConfirmations = previous
        ? confirmations.filter(id => id !== userId)
        : [...confirmations, userId];

        const { error: updateError } = await supabase
        .from("evenements")
        .update({ confirmations: updatedConfirmations })
        .eq("id", eventId);

        if (updateError) revert("❌ Erreur update confirmations :", updateError);
    } catch (err) {
        revert("❌ Exception handleToggle :", err);
    } finally {
        setLoading(false);
    }
    };

  const activeLabel = isIntendance ? "Fait" : "Je participe"

  return (
    <button
      onClick={handleToggle}
      title={checked ? "Cliquer pour retirer" : "Cliquer pour confirmer"}
      className={cn(
        "cursor-pointer inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 whitespace-nowrap",
        checked
          ? "bg-green-600 text-white hover:bg-green-700"
          : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
      )}
    >
      {checked && <Check className="h-3.5 w-3.5" />}
      {checked ? activeLabel : `${activeLabel} ?`}
    </button>
  )
}
