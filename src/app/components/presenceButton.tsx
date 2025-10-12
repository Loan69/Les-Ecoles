"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@supabase/auth-helpers-react";

export default function presenceButton() {
    const [isAbsent, setIsAbsent] = useState(false);
    const [locked, setLocked] = useState(false);
    const user = useUser();
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();

    const today = new Date().toISOString().slice(0, 10);

    // --- Définition de l’heure locale française ---
    useEffect(() => {
        const now = new Date();
        const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
        if (parisTime.getHours() >= 23) setLocked(true);

        const fetchStatus = async () => {
            if (!user) return;
          
            const res = await fetch("/api/get-presence-foyer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ date: today }),
            });
          
            const result = await res.json();
            setIsAbsent(result.isAbsent);
        };

        fetchStatus();
    }, [today, user]);

    const togglePresence = async () => {
        if (locked) return
      
        const res = await fetch('/api/presence-foyer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isAbsent, date: today })
        })
      
        const result = await res.json()
        if (res.ok) {
          setIsAbsent(!isAbsent)
        } else {
          console.error(result.error)
        }
    }
      

    // --- Texte principal ---
    const labelText = isAbsent ? "Je dors à l'extérieur" : "Je dors au foyer";

    // --- Texte de l’infobulle ---
    const tooltipText = locked
    ? "Vous ne pouvez plus modifier car il est plus de 23h."
    : "Modification possible jusqu'à 23h.";

    return (
        <div className="flex flex-col items-center">

            {/* Ligne contenant le bloc rose et le bouton admin */}
            <div className="flex items-center justify-center gap-4">
                {/* Bloc rose */}
                <div
                    className="flex items-center justify-center gap-4 bg-pink-600 rounded-2xl px-6 py-2 shadow-md"
                    title={tooltipText}
                >
                    <span className="text-lg font-medium text-white">{labelText}</span>

                    {/* Switch */}
                    <button
                        onClick={togglePresence}
                        disabled={locked}
                        className={`relative w-20 h-10 rounded-full transition-all duration-300 cursor-pointer ${
                        locked
                            ? "bg-gray-300 cursor-not-allowed"
                            : isAbsent
                            ? "bg-red-500"
                            : "bg-green-500"
                        }`}
                    >
                        <span
                        className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                            isAbsent ? "translate-x-0" : "translate-x-8.5 md:translate-x-10"
                        }`}
                        />
                    </button>
                </div>

                {/* Bouton admin (en dehors du bloc rose) */}
                {isAdmin && (
                <button
                    onClick={() => (router.push("/admin/foyer"))}
                    className="flex items-center justify-center border border-blue-600 text-blue-700 bg-white rounded-2xl h-[55px] px-4 hover:bg-blue-50 transition shadow-sm cursor-pointer"
                    title="Voir la vue d'ensemble"
                >
                    <Eye className="w-8 h-8" />
                </button>
                )}
            </div>
        </div>
    );
}
