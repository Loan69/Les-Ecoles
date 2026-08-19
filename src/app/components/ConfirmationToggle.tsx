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

    // Mise à jour optimiste : le bouton bascule tout de suite, l'enregistrement suit.
    const previous = checked;
    setChecked(!checked);
    setLoading(true);

    const revert = (message: string, err?: unknown) => {
      if (err) console.error(message, err);
      setChecked(previous);
      toast.error("Impossible d'enregistrer votre réponse. Réessayez.");
    };

    try {
      // Une seule écriture, côté base : la ligne est verrouillée le temps de
      // l'opération. Auparavant on lisait la liste puis on la réécrivait entière —
      // deux personnes confirmant dans la même seconde lisaient la même version, et
      // la seconde écriture effaçait la première sans que personne ne le voie.
      const { data, error } = await supabase.rpc("basculer_confirmation_evenement", { p_event_id: eventId });

      if (error) {
        // Tolérant : tant que supabase/confirmations-evenements.sql n'est pas passé,
        // la fonction n'existe pas — on retombe sur l'ancienne écriture.
        const absente = error.code === "PGRST202" || /basculer_confirmation_evenement/i.test(error.message ?? "");
        if (!absente) {
          revert("❌ Erreur confirmation :", error);
          return;
        }
        const { data: evt, error: readErr } = await supabase
          .from("evenements")
          .select("confirmations")
          .eq("id", eventId)
          .single();
        if (readErr) {
          revert("❌ Erreur fetch confirmations :", readErr);
          return;
        }
        const confirmations: string[] = evt?.confirmations || [];
        const updated = previous
          ? confirmations.filter((id) => id !== user.id)
          : [...confirmations, user.id];
        const { error: updateError } = await supabase
          .from("evenements")
          .update({ confirmations: updated })
          .eq("id", eventId);
        if (updateError) revert("❌ Erreur update confirmations :", updateError);
        return;
      }

      // La base renvoie l'état réel après bascule : on s'y aligne.
      if (typeof data === "boolean") setChecked(data);
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
