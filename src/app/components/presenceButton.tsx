"use client";

import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { useSupabase } from "../providers";
import { useRouter } from "next/navigation";
import { formatDateKeyLocal } from "@/lib/utilDate";

interface PresenceButtonProps {
  date: string;
  isAbsent: boolean;
  togglePresence: () => void;
  isAdmin?: boolean;
}

export default function PresenceButton({
  date,
  isAbsent,
  togglePresence,
  isAdmin = false,
}: PresenceButtonProps) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [verrouillageFoyer, setVerrouillageFoyer] = useState<string>("23:00");

  // --- Récupération du paramètre global ---
  useEffect(() => {
    const fetchSetting = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "verrouillage_foyer")
        .maybeSingle();

      if (!error && data?.value) setVerrouillageFoyer(data.value);
    };

    fetchSetting();
  }, []);

  // --- Définition du verrouillage pour le jour actuel ---
  const now = new Date();
  const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const isToday = formatDateKeyLocal(parisTime) === date;
  const today = formatDateKeyLocal(parisTime);


  const [lockHour, lockMinute] = verrouillageFoyer.split(":").map(Number);

  const locked =
    date < today ||
    (isToday &&
      (parisTime.getHours() > lockHour ||
        (parisTime.getHours() === lockHour && parisTime.getMinutes() >= lockMinute)));

  // --- Libellés dynamiques ---
  const labelText = isAbsent ? "Je dors à l'extérieur" : "Je dors au foyer";
  const tooltipText = locked
    ? `Modification impossible après ${verrouillageFoyer} pour le jour en cours.`
    : `Vous pouvez indiquer votre présence jusqu'à ${verrouillageFoyer}.`;

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center gap-4">
        {/* Bloc principal */}
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
                isAbsent
                  ? "translate-x-0"
                  : "translate-x-9 md:translate-x-10"
              }`}
            />
          </button>
        </div>

        {/* Bouton admin */}
        {isAdmin && (
          <button
            onClick={() => router.push("/admin/foyer")}
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
