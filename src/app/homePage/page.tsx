"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LogoutButton from "../components/logoutButton";
import PresenceButton from "../components/presenceButton";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import InviteModal from "../components/inviteModal";
import { useRouter } from "next/navigation";
import { CalendarEvent } from "@/types/CalendarEvent";
import { useUser } from "@supabase/auth-helpers-react";
import { Residente } from "@/types/Residente";
import LoadingSpinner from "../components/LoadingSpinner";

export default function HomePage() {
  const user = useUser();
  const router = useRouter();

  // --- États principaux ---
  const [profil, setProfil] = useState<Residente | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState<-1 | 0 | 1>(0); // pour l’animation
  const [repasDejeuner, setRepasDejeuner] = useState<boolean | null>(null);
  const [repasDiner, setRepasDiner] = useState<boolean | null>(null);
  const [nbDejeuner, setNbDejeuner] = useState<number>(0);
  const [nbDiner, setNbDiner] = useState<number>(0);
  const [locked, setLocked] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [selectedResidence, setSelectedResidence] = useState<string>("12");
  const [isAbsent, setIsAbsent] = useState(false);
  const [isAbsentReady, setIsAbsentReady] = useState(false);
  // États pour le swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  useEffect(() => {
    // côté client seulement
    localStorage.setItem("dateSelectionnee", currentDate.toISOString().slice(0, 10));
  }, [currentDate]);

  // --- Format date FR ---
  const formatDate = (date: Date) => {
    const formatted = date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // --- Navigation entre jours ---
  const goToPreviousDay = () => {
    setDirection(-1);
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 1);
      localStorage.setItem("dateSelectionnee", newDate.toISOString().slice(0, 10));
      return newDate;
    });
  };

  const goToNextDay = () => {
    setDirection(1);
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 1);
      localStorage.setItem("dateSelectionnee", newDate.toISOString().slice(0, 10));
      return newDate;
    });
  };

  // --- Gestion de la présence de l'utilisatrice au foyer ---
  // --- Récupération de la présence pour la date sélectionnée ---
  useEffect(() => {
    const fetchStatus = async () => {
      if (!user) return;

      const res = await fetch("/api/get-is-absent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: currentDate }),
      });

      const result = await res.json();
      setIsAbsent(result.isAbsent);
      setIsAbsentReady(true);
    };

    fetchStatus();
  }, [currentDate, user]);

  // --- Toggle présence ---
  const togglePresence = async () => {
    if (locked) return;

    const res = await fetch("/api/presence-foyer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAbsent, date: currentDate }),
    });

    const result = await res.json();
    if (res.ok) {
      setIsAbsent(!isAbsent);
    } else {
      console.error(result.error);
    }
  };

  // --- Verrouillage après 8h30 pour le jour actuel uniquement ---
  useEffect(() => {
    const now = new Date();
    const parisTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Paris" })
    );

    const isToday =
      currentDate.toDateString() === parisTime.toDateString();

    if (
      isToday &&
      (parisTime.getHours() > 8 ||
        (parisTime.getHours() === 8 && parisTime.getMinutes() >= 30))
    ) {
      setLocked(true);
      setConfirmationMsg("Les présences ne sont plus modifiables après 8h30.");
    } else {
      setLocked(false);
      setConfirmationMsg("");
    }
  }, [currentDate]);

  // --- Chargement : profil + présences repas + événements ---
  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;
      setIsReady(false);

      const dateIso = currentDate.toISOString().split("T")[0];

      // 1️⃣ Profil
      const { data: profilData, error: profilError } = await supabase
        .from("residentes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profilError) console.error("Erreur profil :", profilError);
      if (profilData) setProfil(profilData);

      // 2️⃣ Présences repas
      const { data: presences, error: presencesError } = await supabase
        .from("presences")
        .select("user_id, type_repas, date_repas")
        .eq("date_repas", dateIso);

      if (presencesError) console.error("Erreur présences :", presencesError);

      const dejeunerCount =
        presences?.filter((p) => p.type_repas === "dejeuner").length || 0;
      const dinerCount =
        presences?.filter((p) => p.type_repas === "diner").length || 0;
      setNbDejeuner(dejeunerCount);
      setNbDiner(dinerCount);

      if (user && presences) {
        const userPresences = presences.filter((p) => p.user_id === user.id);
        setRepasDejeuner(
          userPresences.some((p) => p.type_repas === "dejeuner")
        );
        setRepasDiner(userPresences.some((p) => p.type_repas === "diner"));
      }

      // 3️⃣ Événements du jour
      const { data: eventsData, error: eventsError } = await supabase
        .from("evenements")
        .select("*")
        .eq("date_event", dateIso);

      if (eventsError) console.error("Erreur événements :", eventsError);
      if (eventsData) setEvents(eventsData);

      setIsReady(true);
    };

    fetchAllData();
  }, [user, currentDate]);

  // --- Toggle repas ---
  const handleToggleRepas = async (repas: "dejeuner" | "diner") => {
    if (locked) {
      setConfirmationMsg(
        "Les présences ne sont plus modifiables après 8h30."
      );
      return;
    }

    const response = await fetch("/api/presence-repas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repas, date: currentDate.toISOString().split("T")[0] }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error(result.error || result.message);
      setConfirmationMsg(
        result.message || "Erreur lors de la modification du repas."
      );
      return;
    }

    if (result.action === "inserted") {
      repas === "dejeuner"
        ? setRepasDejeuner(true)
        : setRepasDiner(true);
    } else {
      repas === "dejeuner"
        ? setRepasDejeuner(false)
        : setRepasDiner(false);
    }

    setConfirmationMsg(result.message);
  };

  // --- Loader global --- 
  if (!isReady || !isAbsentReady || repasDejeuner === null || repasDiner === null) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );
  }

  // --- Filtrage des événements par résidence ---
  const filteredEvents = events.filter((event) =>
    event.lieu?.split(",").map((r) => r.trim()).includes(selectedResidence)
  );

  // --- Animation (slide + fade) ---
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction > 0 ? -100 : 100,
      opacity: 0,
    }),
  };

  // --- Gestion du swipe sur mobile ---

  // Seuil minimum pour déclencher un swipe
  const minSwipeDistance = 50;

  // Détecter le début du touch
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.changedTouches[0].clientX);
  };

  // Détecter la fin du touch et calculer la distance
  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEndX(e.changedTouches[0].clientX);

    if (touchStartX === null) return;

    const distance = e.changedTouches[0].clientX - touchStartX;

    if (distance > minSwipeDistance) {
      // Swipe vers la droite → jour précédent
      goToPreviousDay();
    } else if (distance < -minSwipeDistance) {
      // Swipe vers la gauche → jour suivant
      goToNextDay();
    }

    // Reset
    setTouchStartX(null);
    setTouchEndX(null);
  };


  // --- Rendu principal ---
  return (
    <main 
      className="min-h-screen flex flex-col items-center bg-white px-4 pt-6"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}  
    >
      {/* Flèche gauche */}
      <button
        onClick={goToPreviousDay}
        className="
          hidden md:flex items-center justify-center 
          absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-[calc(50%+210px)]
          bg-white shadow-md hover:shadow-lg rounded-full w-12 h-12 z-20 text-blue-700
          transition-transform duration-200 hover:scale-110 cursor-pointer
          flex md:hidden
          top-1/2 left-4 -translate-y-1/2
        "
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Flèche droite */}
      <button
        onClick={goToNextDay}
        className="
          hidden md:flex items-center justify-center 
          absolute top-1/2 left-1/2 -translate-y-1/2 translate-x-[calc(50%+165px)]
          bg-white shadow-md hover:shadow-lg rounded-full w-12 h-12 z-20 text-blue-700
          transition-transform duration-200 hover:scale-110 cursor-pointer
          flex md:hidden
          top-1/2 right-4 -translate-y-1/2
        "
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Bouton de déconnexion */}
      <div className="w-full max-w-md flex justify-end mb-4">
        <LogoutButton />
      </div>

      {/* Logo */}
      <Image
        src="/logo.png"
        alt="Logo"
        width={350}
        height={350}
        className="mb-3"
      />

      {/* Présence au foyer */}
      <div className="flex flex-col items-center mt-4 space-y-2 mb-5">
        <PresenceButton 
          date={currentDate.toISOString().slice(0, 10)}
          isAbsent={isAbsent}
          togglePresence={togglePresence}
          isAdmin={profil?.is_admin}
        />
      </div>

      {/* Onglets Résidences */}
      <div className="relative flex justify-center mb-4 z-10">
        <div
          className="absolute top-0 h-12 w-20 bg-yellow-400 rounded-t-xl transition-all duration-300"
          style={{
            left: selectedResidence === "12" ? "0px" : "81px",
          }}
        />

        {["12", "36"].map((num) => (
          <button
            key={num}
            onClick={() => setSelectedResidence(num)}
            className={`cursor-pointer relative flex items-center justify-center w-20 h-12 text-lg font-bold border rounded-t-xl transition-colors z-10
              ${
                selectedResidence === num
                  ? "text-white border-yellow-400"
                  : "bg-white text-blue-800 border-gray-300 hover:bg-gray-100"
              }`}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Bloc principal animé */}
      <section className="w-full max-w-md bg-white rounded-xl shadow-lg p-5 overflow-hidden relative">
        <div className="flex justify-center items-center mb-5 space-x-4">
          <h2 className="text-xl font-semibold text-center text-blue-800">
            {formatDate(currentDate)}
          </h2>
        </div>

        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentDate.toDateString()}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            {/* Événements */}
            <div className="mb-10">
              {filteredEvents.length === 0 ? (
                <p className="text-gray-500 italic text-sm mb-4">
                  Aucun évènement prévu pour la résidence {selectedResidence}.
                </p>
              ) : (
                filteredEvents.map((event) => (
                  <div key={event.id} className="flex items-center mb-2">
                    <p
                      className={`text-gray-700 text-sm text-center flex-1 ${event.couleur} rounded px-1 py-2`}
                    >
                      {event.titre} (à partir de {event.heures}, lieu : {event.lieu})
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Présence repas */}
            <h2 className="text-xl font-semibold text-center text-blue-800 mb-4">
              Présence aux repas
            </h2>

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
                className={`relative w-16 h-8 rounded-full transition-all duration-300 cursor-pointer ${
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
              <p className="mt-3 text-green-600 font-semibold text-sm">
                {confirmationMsg}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Boutons bas */}
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
        <InviteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </section>
    </main>
  );
}
