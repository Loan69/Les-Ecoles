"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LogoutButton from "../components/logoutButton";
import PresenceButton from "../components/presenceButton";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import InviteModal from "../components/inviteModal";
import { useRouter } from "next/navigation";
import { CalendarEvent } from "@/types/CalendarEvent";
import { useUser } from "@supabase/auth-helpers-react";
import { Residente } from "@/types/Residente";
import LoadingSpinner from "../components/LoadingSpinner";
import { Repas } from "@/types/repas";
import CommentModal from "../components/commentModal";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Residence } from "@/types/Residence";

export default function HomePage() {
  const user = useUser();
  const router = useRouter();
  const supabase = createClientComponentClient()

  // --- États principaux ---
  const [profil, setProfil] = useState<Residente | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState<-1 | 0 | 1>(0); // pour l’animation
  const [repasDejeuner, setRepasDejeuner] = useState<string | null>(null);
  const [repasDiner, setRepasDiner] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [selectedResidence, setSelectedResidence] = useState<number | null>(null);
  const [isAbsent, setIsAbsent] = useState(false);
  const [isAbsentReady, setIsAbsentReady] = useState(false);
  const [dejeuner, setDejeuner] = useState<Repas | null>(null);
  const [diner, setDiner] = useState<Repas | null>(null);
  const [residenceId, setResidenceId] = useState<number[]>([]);
  const [residences, setResidences] = useState<Residence[]>([]);

  // États pour le swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Variables pour le commentaire
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedRepasId, setSelectedRepasId] = useState<number | null>(null);
  const [commentValue, setCommentValue] = useState('');

  // Résidences pour les onglets
  useEffect(() => {
    const fetchResidences = async () => {
      const { data, error } = await supabase
        .from('select_options')
        .select('id, value')
        .eq("category", "Résidence");
  
        if (!error && data) {
          const formatted = data.map((item) => ({
            id: item.id,
            label: item.value, // ici on renomme value → label
          }));
          setResidences(formatted);
        }
    };
  
    fetchResidences();
  }, []);


  useEffect(() => {
    // Réglage des dates pour synchro
    localStorage.setItem("dateSelectionnee", currentDate.toISOString().slice(0, 10));
    localStorage.setItem("startDate", currentDate.toISOString().slice(0, 10));
    localStorage.setItem("endDate", currentDate.toISOString().slice(0, 10));
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

    if (currentDate < parisTime ||
      isToday &&
      (parisTime.getHours() > 8 ||
        (parisTime.getHours() === 8 && parisTime.getMinutes() >= 30))
    ) {
      setLocked(true);
      setConfirmationMsg("Les présences aux repas ne sont plus modifiables après 8h30.");
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

      // Profil
      const { data: profilData, error: profilError } = await supabase
        .from("residentes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profilError) console.error("Erreur profil :", profilError);
      if (profilData) setProfil(profilData);

      // Présences repas
      const { data: presences, error: presencesError } = await supabase
        .from("presences")
        .select("id_repas, user_id, type_repas, date_repas, choix_repas, commentaire")
        .eq("date_repas", dateIso);

      if (presencesError) console.error("Erreur présences :", presencesError);


      if (user && presences) {
        const userPresences = presences.filter((p) => p.user_id === user.id);
      
        const dejeunerData = userPresences.find((p) => p.type_repas === "dejeuner");
        const dinerData = userPresences.find((p) => p.type_repas === "diner");

        setRepasDejeuner(dejeunerData?.choix_repas || "non");
        setRepasDiner(dinerData?.choix_repas || "non");
        setDejeuner(dejeunerData ?? null);
        setDiner(dinerData  ?? null)
      }

      // Événements du jour
      const { data: eventsData, error: eventsError } = await supabase
        .from("evenements")
        .select("*")
        .eq("date_event", dateIso);

      if (eventsError) console.error("Erreur événements :", eventsError);
      if (eventsData) setEvents(eventsData);

      // On récupère tous les IDs des résidences
      const { data } = await supabase
        .from("select_options")
        .select("id")
        .eq("category", "Résidence")
      
      if (data) {
        setResidenceId(data.map(item => item.id));
      }

      setIsReady(true);
    };

    fetchAllData();
  }, [user, currentDate]);

  // Sélection des présences et du types de repas
  const repasOptions = {
    dejeuner: [
      { value: "non", label: "Non" },
      { value: "12", label: "Oui au 12" },
      { value: "36", label: "Oui au 36" },
      { value: "Pique-nique chaud", label: "Pique-nique chaud" },
      { value: "Pique-nique froid", label: "Pique-nique froid" },
    ],
    diner: [
      { value: "non", label: "Non" },
      { value: "12", label: "Oui au 12" },
      { value: "36", label: "Oui au 36" },
      { value: "Pique-nique chaud", label: "Pique-nique chaud" },
      { value: "Pique-nique froid", label: "Pique-nique froid" },
      { value: "plateau-repas", label: "Plateau repas" },
    ],
  };

  const handleSelectRepas = async (
    repas: "dejeuner" | "diner",
    choix: string
  ) => {
    if (locked) {
      setConfirmationMsg("Les présences ne sont plus modifiables après 8h30.");
      return;
    }
    
    
    const response = await fetch("/api/presence-repas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repas,
        choix,
        date: currentDate.toISOString().split("T")[0],
      }),
    });
  
    const result = await response.json();
  
    if (!response.ok || !result.success) {
      console.error(result.error || result.message);
      setConfirmationMsg(result.message || "Erreur lors de la modification.");
      return;
    }
  
    repas === "dejeuner"
      ? setRepasDejeuner(choix)
      : setRepasDiner(choix);
  
    setConfirmationMsg(result.message);
  };

  // Ajout d'un commentaire à un repas
  const handleSaveComment = async (newComment: string) => {
    if (!selectedRepasId) return;

    // 1️⃣ Mise à jour en base
    const { error: updateError } = await supabase
      .from("presences")
      .update({ commentaire: newComment })
      .eq("id_repas", selectedRepasId);

    if (updateError) {
      console.error("Erreur lors de la mise à jour du commentaire :", updateError);
      return;
    }

    // 2️⃣ Recharge la ligne mise à jour
    const { data: updatedRow, error: fetchError } = await supabase
      .from("presences")
      .select("id_repas, type_repas, commentaire")
      .eq("id_repas", selectedRepasId)
      .maybeSingle();

    if (fetchError) {
      console.error("Erreur lors du rechargement du commentaire :", fetchError);
      return;
    }

    // 3️⃣ Mets à jour les states locaux selon le type de repas
    if (updatedRow?.type_repas === "dejeuner") {
      setDejeuner((prev) => (prev ? { ...prev, commentaire: updatedRow.commentaire } : prev));
    } else if (updatedRow?.type_repas === "diner") {
      setDiner((prev) => (prev ? { ...prev, commentaire: updatedRow.commentaire } : prev));
    }

    // 4️⃣ Mets à jour la valeur du commentaire utilisée par la modale
    setCommentValue(updatedRow?.commentaire || "");
  };
  

  // --- Loader global --- 
  if (!isReady || !isAbsentReady) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );
  }

  // --- Filtrage des événements par résidence ---
  const filteredEvents = selectedResidence
    ? events.filter((event) =>
        event.lieu
          ?.split(",")
          .map((r) => Number(r.trim()))
          .includes(selectedResidence)
      )
    : [];


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
      {/* Flèche gauche (desktop uniquement) */}
      <button
        onClick={goToPreviousDay}
        className="
          hidden md:flex items-center justify-center
          absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-[calc(50%+210px)]
          bg-white shadow-md hover:shadow-lg rounded-full w-12 h-12 z-20 text-blue-700
          transition-transform duration-200 hover:scale-110 cursor-pointer
        "
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Flèche droite (desktop uniquement) */}
      <button
        onClick={goToNextDay}
        className="
          hidden md:flex items-center justify-center
          absolute top-1/2 left-1/2 -translate-y-1/2 translate-x-[calc(50%+165px)]
          bg-white shadow-md hover:shadow-lg rounded-full w-12 h-12 z-20 text-blue-700
          transition-transform duration-200 hover:scale-110 cursor-pointer
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
            left: selectedResidence === 1 ? "0px" : "81px",
          }}
        />

        {residences.map((res) => (
          <button
            key={res.id}
            onClick={() => setSelectedResidence(res.id)}
            className={`cursor-pointer relative flex items-center justify-center w-20 h-12 text-lg font-bold border rounded-t-xl transition-colors z-10
              ${
                selectedResidence === res.id
                  ? "text-white border-yellow-400 bg-yellow-400"
                  : "bg-white text-blue-800 border-gray-300 hover:bg-gray-100"
              }`}
          >
            {res.label}
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
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <div className="relative">
                    <select
                      value={repasDejeuner || ""}
                      onChange={(e) => handleSelectRepas("dejeuner", e.target.value)}
                      disabled={locked}
                      className={`appearance-none border text-blue-800 px-4 py-2 pr-10 rounded-md focus:outline-none focus:ring-2 
                        ${locked 
                          ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed" 
                          : "bg-white border-blue-500 focus:ring-blue-300 focus:border-blue-500 cursor-pointer"
                        }`}
                    >
                      {repasOptions.dejeuner.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {/* Flèche bleue custom */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (repasDejeuner !== 'non') {
                      setShowCommentModal(true)
                      setSelectedRepasId(dejeuner?.id_repas ?? -1)
                      setCommentValue(dejeuner?.commentaire ?? '')
                    }
                  }}
                  disabled={repasDejeuner === 'non'}
                  className={`p-2 rounded-full transition ${
                    repasDejeuner === 'non' || locked
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-900 cursor-pointer'
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>


            {/* Dîner */}
            <div className="flex items-center justify-between bg-blue-100 rounded-lg px-4 py-3 mb-3">
              <div className="flex items-center space-x-2">
                <p className="font-semibold text-blue-900">Diner</p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={repasDiner || ""}
                    onChange={(e) => handleSelectRepas("diner", e.target.value)}
                    disabled={locked} // ✅ désactive si locked
                    className={`appearance-none border text-blue-800 px-4 py-2 pr-10 rounded-md focus:outline-none focus:ring-2 
                      ${locked 
                        ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed" 
                        : "bg-white border-blue-500 focus:ring-blue-300 focus:border-blue-500 cursor-pointer"
                      }`}
                  >
                    {repasOptions.diner.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>


                  {/* Flèche bleue custom */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <button
                  onClick={() => {
                    if (repasDiner !== 'non') {
                      setShowCommentModal(true)
                      setSelectedRepasId(diner?.id_repas ?? -1)
                      setCommentValue(diner?.commentaire ?? '')
                    }
                  }}
                  disabled={repasDiner === 'non'}
                  className={`p-2 rounded-full transition ${
                    repasDiner === 'non' || locked
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-900 cursor-pointer'
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
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
          {profil?.is_admin && (
            <button
              className="border border-blue-700 text-blue-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-50 cursor-pointer"
              onClick={() => router.push("/admin/repas")}
            >
              Voir les inscriptions
            </button>
          )}
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-900 cursor-pointer"
          >
            Inviter quelqu’un
          </button>
        </div>

        {/* Modals */}
        {/* Modal d'ajout d'un invité au repas */}
        <InviteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
        
        {/* Modal d'ajout d'un commentaire au repas */}
        <CommentModal
          isOpen={showCommentModal}
          onClose={() => {setShowCommentModal(false);
                          setSelectedRepasId(null)
                          setCommentValue("")
                    }}
          onSave={handleSaveComment}
          initialComment={commentValue}
        />
      </section>
    </main>
  );
}
