"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function PresenceSwitch() {
  const [isAbsent, setIsAbsent] = useState(false);
  const [locked, setLocked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const now = new Date();
    if (now.getHours() >= 21) setLocked(true);

    const fetchStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("absences")
        .select("id")
        .eq("user_id", user.id)
        .eq("date_absence", today)
        .maybeSingle();

      setIsAbsent(!!data);
    };

    fetchStatus();
  }, [today]);

  const togglePresence = async () => {
    if (!userId || locked) return;

    if (isAbsent) {
      await supabase
        .from("absences")
        .delete()
        .eq("user_id", userId)
        .eq("date_absence", today);
      setIsAbsent(false);
    } else {
      await supabase
        .from("absences")
        .insert({ user_id: userId, date_absence: today });
      setIsAbsent(true);
    }
  };

  return (
    <div className="flex flex-col items-center mt-8">
      <h2 className="text-xl font-semibold mb-4">Présence au foyer</h2>

      <button
        onClick={togglePresence}
        disabled={locked}
        className={`relative w-20 h-10 rounded-full transition-all duration-300 ${
          locked
            ? "bg-gray-300"
            : isAbsent
            ? "bg-red-500"
            : "bg-green-500"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
            isAbsent ? "translate-x-10" : "translate-x-0"
          }`}
        />
      </button>

      <p className="mt-3 text-sm text-gray-600">
        {locked
          ? "Modification impossible après 21h"
          : isAbsent
          ? "Vous avez indiqué ne pas dormir ce soir"
          : "Vous dormez au foyer ce soir"}
      </p>
    </div>
  );
}
