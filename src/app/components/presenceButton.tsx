"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PresenceSwitch() {
    const [isAbsent, setIsAbsent] = useState(false);
    const [locked, setLocked] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();

    const today = new Date().toISOString().slice(0, 10);

    // --- Définition de l’heure locale française ---
    useEffect(() => {
    const now = new Date();
    const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    if (parisTime.getHours() >= 21) setLocked(true);

    const fetchStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        // Vérifier si l'utilisateur est admin
        const { data: profile } = await supabase
        .from("residentes")
        .select("is_admin")
        .eq("user_id", user.id)
        .maybeSingle();
        
        console.log(profile?.is_admin)
        setIsAdmin(profile?.is_admin || false);

        // Vérifier s'il est absent aujourd'hui
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

    // --- Texte principal ---
    const labelText = isAbsent ? "Je suis sortie" : "Je suis rentrée";

    // --- Texte de l’infobulle ---
    const tooltipText = locked
    ? "Vous ne pouvez plus modifier car il est plus de 21h."
    : "Modification possible jusqu'à 21h.";

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
                        isAbsent ? "translate-x-10" : "translate-x-0"
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
