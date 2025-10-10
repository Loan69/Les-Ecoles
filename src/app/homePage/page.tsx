"use client";

import { useState, useEffect } from "react";
import LogoutButton from "../components/logoutButton";
import PresenceButton from "../components/presenceButton";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import { Eye } from "lucide-react";
import InviteModal from "../components/inviteModal";
import { useRouter } from "next/navigation";
import { CalendarEvent } from "@/types/CalendarEvent";
import { useUser } from "@supabase/auth-helpers-react";
import { Residente } from "@/types/Residente";
import LoadingSpinner from "../components/LoadingSpinner";

export default function HomePage() {
  const user = useUser();
  const router = useRouter();

  // --- States principaux ---
  const [profil, setProfil] = useState<Residente | null>(null);
  const [dateJour, setDateJour] = useState("");
  const [repasDejeuner, setRepasDejeuner] = useState(false);
  const [repasDiner, setRepasDiner] = useState(false);
  const [nbDejeuner, setNbDejeuner] = useState<number>(0);
  const [nbDiner, setNbDiner] = useState<number>(0);
  const [locked, setLocked] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isReady, setIsReady] = useState(false); // ✅ Chargement global

  // --- Format date en français ---
  useEffect(() => {
    const today = new Date();
    const formatted = today.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    setDateJour(formatted.charAt(0).toUpperCase() + formatted.slice(1));
  }, []);

  // --- Verrouillage après 8h30 ---
  useEffect(() => {
    const now = new Date();
    const parisTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Paris" })
    );

    if (
      parisTime.getHours() > 8 ||
      (parisTime.getHours() === 8 && parisTime.getMinutes() >= 30)
    ) {
      setLocked(true);
      setConfirmationMsg("Les présences ne sont plus modifiables après 8h30.");
    } else {
      setLocked(false);
      setConfirmationMsg("");
    }
  }, []);

  // --- Chargement centralisé : profil + présences + événements ---
  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;

      // 1️⃣ Profil
      const { data: profilData, error: profilError } = await supabase
        .from("residentes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profilError) console.error("Erreur profil :", profilError);
      if (profilData) setProfil(profilData);

      // 2️⃣ Présences repas
      const dateToday = new Date().toISOString().split("T")[0];
      const { data: presences, error: presencesError } = await supabase
        .from("presences")
        .select("user_id, type_repas, date_repas")
        .eq("date_repas", dateToday);

      if (presencesError) console.error("Erreur présences :", presencesError);

      const dejeunerCount = presences?.filter(p => p.type_repas === "dejeuner").length || 0;
      const dinerCount = presences?.filter(p => p.type_repas === "diner").length || 0;
      setNbDejeuner(dejeunerCount);
      setNbDiner(dinerCount);

      if (user && presences) {
        const userPresences = presences.filter(p => p.user_id === user.id);
        setRepasDejeuner(userPresences.some(p => p.type_repas === "dejeuner"));
        setRepasDiner(userPresences.some(p => p.type_repas === "diner"));
      }

      // 3️⃣ Événements du jour
      const { data: eventsData, error: eventsError } = await supabase
        .from("evenements")
        .select("*")
        .eq("date_event", dateToday);
      if (eventsError) console.error("Erreur événements :", eventsError);
      if (eventsData) setEvents(eventsData);

      // ✅ Tout est prêt
      setIsReady(true);
    };

    fetchAllData();
  }, [user]);

  // --- Toggle repas ---
  const handleToggleRepas = async (repas: "dejeuner" | "diner") => {
    if (locked) {
      setConfirmationMsg("Les présences ne sont plus modifiables après 8h30.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setConfirmationMsg("Vous devez être connectée pour modifier vos repas.");
      return;
    }

    const dateToday = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("presences")
      .select("id_repas")
      .eq("user_id", user.id)
      .eq("date_repas", dateToday)
      .eq("type_repas", repas)
      .maybeSingle();

    if (existing) {
      await supabase.from("presences").delete().eq("id_repas", existing.id_repas);
      if (repas === "dejeuner") setRepasDejeuner(false);
      else setRepasDiner(false);
    } else {
      await supabase.from("presences").insert({
        user_id: user.id,
        type_repas: repas,
        date_repas: dateToday,
      });
      if (repas === "dejeuner") setRepasDejeuner(true);
      else setRepasDiner(true);
    }

    // Actualisation rapide
    setIsReady(false);
    await new Promise(resolve => setTimeout(resolve, 200)); // léger delay pour éviter flash
    setIsReady(true);
  };

  // --- Loader central si pas prêt ---
  if (!isReady) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );
  }

  // --- Rendu principal ---
  return (
    <main className="min-h-screen flex flex-col items-center bg-white px-4 pt-6">
      {/* Bouton de déconnexion */}
      <div className="w-full max-w-md flex justify-end mb-4">
        <LogoutButton />
      </div>

      {/* Logo */}
      <Image src="/logo.png" alt="Logo" width={350} height={350} className="mb-3" />

      {/* Présence au foyer */}
      <div className="flex flex-col items-center mt-4 space-y-2 mb-5">
        <PresenceButton />
      </div>

      {/* Résidences */}
      {profil?.residence && (
        <div className="relative flex justify-center mb-[-10px] z-10">
          {["12", "36"].map((num, index) => {
            const isUserResidence = String(profil.residence)
              .split(",")
              .map(r => r.trim())
              .includes(num);

            return (
              <div
                key={num}
                className={`flex items-center justify-center w-18 h-12 text-lg font-bold border shadow-sm
                  ${isUserResidence ? "bg-yellow-400 text-white border-yellow-400" : "bg-white text-blue-800 border-gray-300"}
                  rounded-tl-lg rounded-tr-lg
                `}
              >
                {num}
              </div>
            );
          })}
        </div>
      )}

      {/* Bloc combiné Évènements + Repas */}
      <section className="w-full max-w-md bg-white rounded-xl shadow-lg p-5">
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-center text-blue-800 mb-5">{dateJour}</h2>
          {events.length === 0 ? (
            <p className="text-gray-500 italic text-sm mb-4">Aucun évènement prévu aujourd’hui.</p>
          ) : (
            events.map(event => (
              <div key={event.id} className="flex items-center mb-2">
                <p className={`text-gray-700 text-sm text-center flex-1 ${event.couleur} rounded px-1 py-2`}>
                  {event.titre} (à partir de {event.heures}, lieu : {event.lieu})
                </p>
              </div>
            ))
          )}
        </div>

        {/* Présence repas */}
        <h2 className="text-xl font-semibold text-center text-blue-800 mb-4">Présence aux repas</h2>

        {/* Déjeuner */}
        <div className="flex items-center justify-between bg-blue-100 rounded-lg px-4 py-3 mb-3">
          <div className="flex items-center space-x-2">
            <p className="font-semibold text-blue-900">Déjeuner</p>
            <div className="flex items-center text-blue-700">
              <Eye className="w-4 h-4 mr-1" />
              <span className="font-medium">{nbDejeuner}</span>
            </div>
          </div>
          <button
            onClick={() => handleToggleRepas("dejeuner")}
            className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
              repasDejeuner ? "bg-blue-700" : "bg-gray-300"
            } ${locked ? "cursor-not-allowed" : ""}`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transform transition-transform duration-300 ${
                repasDejeuner ? "translate-x-8" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Dîner */}
        <div className="flex items-center justify-between bg-blue-100 rounded-lg px-4 py-3">
          <div className="flex items-center space-x-2">
            <p className="font-semibold text-blue-900">Dîner</p>
            <div className="flex items-center text-blue-700">
              <Eye className="w-4 h-4 mr-1" />
              <span className="font-medium">{nbDiner}</span>
            </div>
          </div>
          <button
            onClick={() => handleToggleRepas("diner")}
            className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
              repasDiner ? "bg-blue-700" : "bg-gray-300"
            } ${locked ? "cursor-not-allowed" : ""}`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transform transition-transform duration-300 ${
                repasDiner ? "translate-x-8" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {confirmationMsg && (
          <p className="mt-3 text-green-600 font-semibold text-sm">{confirmationMsg}</p>
        )}

        {/* Boutons */}
        <div className="flex justify-between mt-6">
          <button
            className="border border-blue-700 text-blue-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-50 cursor-pointer"
            onClick={() => router.push("/admin/repas")}
          >
            Voir les inscriptions
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-900 cursor-pointer"
          >
            Inviter quelqu’un
          </button>
        </div>

        {/* Modal */}
        <InviteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </section>
    </main>
  );
}
