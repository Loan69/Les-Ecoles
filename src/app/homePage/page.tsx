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
import { Residente } from "@/types/Residente";
import LoadingSpinner from "../components/LoadingSpinner";
import { Repas } from "@/types/repas";
import CommentModal from "../components/commentModal";
import { Residence } from "@/types/Residence";
import { useSupabase } from "../providers";
import { User } from "@supabase/supabase-js";
import DynamicSelectGroup from "../components/DynamicSelectGroup";
import SelectField from "../components/SelectField";
import { Option } from "@/types/Option";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import VisionConfirmation from "../components/VisionConfirmation";
import ConfirmationToggle from "../components/ConfirmationToggle";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { supabase } = useSupabase();

  // --- États principaux ---
  const [profil, setProfil] = useState<Residente | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isInitialized, setIsInitialized] = useState(false); // pour attente lecture de la bonne date
  const [direction, setDirection] = useState<-1 | 0 | 1>(0); // pour l’animation
  const [repasDejeuner, setRepasDejeuner] = useState<string | null>(null);
  const [repasDiner, setRepasDiner] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isAbsent, setIsAbsent] = useState(false);
  const [isAbsentReady, setIsAbsentReady] = useState(false);
  const [dejeuner, setDejeuner] = useState<Repas | null>(null);
  const [diner, setDiner] = useState<Repas | null>(null);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [selectedResidenceValue, setSelectedResidenceValue] = useState<string | null>("12");
  const [selectedResidenceLabel, setSelectedResidenceLabel] = useState<string | null>("Résidence 12");
  const [settings, setSettings] = useState<{ verrouillage_repas?: string; verrouillage_foyer?: string }>({});

  // --- Rappels d’événements ---
  const [reminders, setReminders] = useState<CalendarEvent[]>([]);

  // Repas spéciaux
  const [specialOptions, setSpecialOptions] = useState<{
    dejeuner: Option[];
    diner: Option[];
  }>({
    dejeuner: [],
    diner: [],
  });

  // --- Etat pour verrouillage des pique niques ---
  const [lockedValues, setLockedValues] = useState<string[]>([]);


  // États pour le swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Variables pour le commentaire
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedRepasId, setSelectedRepasId] = useState<number | null>(null);
  const [commentValue, setCommentValue] = useState('');

  // Récupération de l'utilisateur
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data?.user) {
          console.warn("Aucun utilisateur valide, redirection vers /signin");
          router.replace("/signin");
          return;
        }

        setUser(data.user);
        console.log("Utilisateur connecté :", data.user);
      } catch (err) {
        console.error("Erreur récupération user :", err);
        router.replace("/signin");
      }
    };

    fetchUser();
  }, [router, supabase]);


  // Résidences pour les onglets
  useEffect(() => {
    const fetchResidences = async () => {
      const { data, error } = await supabase
        .from('residences')
        .select('value, label');
  
        if (!error && data) {
          const formatted = data.map((item) => ({
            value: item.value,
            label: item.label,
          }));
          setResidences(formatted);
        }
    };
  
    fetchResidences();
  }, []);

  // Réglage de la date
  useEffect(() => {
    const storedDate = localStorage.getItem("dateSelectionnee");

    if (storedDate) {
      setCurrentDate(parseDateKeyLocal(storedDate)); // date du calendrier
    } else {
      setCurrentDate(new Date());
    }

    setIsInitialized(true); // ✅ on marque qu'on a lu la valeur
  }, []);

  useEffect(() => {
    // ✅ Ne rien faire tant que la première lecture n'est pas terminée
    if (!isInitialized) return;

    // Maintenant on peut écrire sans risque
    localStorage.setItem("dateSelectionnee", formatDateKeyLocal(currentDate));
    localStorage.setItem("startDate", formatDateKeyLocal(currentDate));
    localStorage.setItem("endDate", formatDateKeyLocal(currentDate));
  }, [currentDate, isInitialized]);


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
      localStorage.setItem("dateSelectionnee", formatDateKeyLocal(newDate));
      return newDate;
    });
  };

  const goToNextDay = () => {
    setDirection(1);
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 1);
      localStorage.setItem("dateSelectionnee", formatDateKeyLocal(newDate));
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

  // --- Récupération des paramètres globaux ---
  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase.from("app_settings").select("key, value");
      if (error) {
        console.error("Erreur récupération paramètres :", error);
        return;
      }

      const settingsMap: Record<string, string> = {};
      data.forEach((s) => (settingsMap[s.key] = s.value));
      setSettings(settingsMap);
    };

    fetchSettings();
  }, []);

  // --- Verrouillage après XhY (paramétré dans app_settings)
  useEffect(() => {
    if (!settings.verrouillage_repas) return;

    // Heure actuelle en timezone Paris
    const now = new Date();
    const parisNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const [lockHour, lockMinute] = settings.verrouillage_repas.split(":").map(Number);

    // Date sélectionnée et dates de référence (toutes en format YYYY-MM-DD)
    const selectedDay = formatDateKeyLocal(currentDate);
    const parisToday = formatDateKeyLocal(parisNow);


    // Construire la date "demain" selon l'heure de Paris
    const parisTomorrowDate = new Date(parisNow);
    parisTomorrowDate.setDate(parisNow.getDate() + 1);
    const parisTomorrow = formatDateKeyLocal(parisTomorrowDate);

    // Est-ce que l'heure actuelle a dépassée la limite ?
    const afterLock =
      parisNow.getHours() > lockHour ||
      (parisNow.getHours() === lockHour && parisNow.getMinutes() >= lockMinute);

    // --- 1) Verrouillage global des présences (ta logique existante) ---
    const isPastDay = selectedDay < parisToday; // date sélectionnée est dans le passé
    const isToday = selectedDay === parisToday;

    if (isPastDay || (isToday && afterLock)) {
      setLocked(true);
      setConfirmationMsg(`Les présences aux repas ne sont plus modifiables après ${settings.verrouillage_repas}.`);
    } else {
      setLocked(false);
      setConfirmationMsg("");
    }

    // --- 2) Verrouillage fin (valeurs spécifiques) pour le LENDMAIN si on est après l'heure ---
    if (
        // après l’heure pour le lendemain
        (selectedDay === parisTomorrow && afterLock) ||
        // OU le jour même (les pique-niques restent bloqués)
        selectedDay === parisToday
      ) {
        setLockedValues(["pn_chaud", "pn_froid"]);
      } else {
        setLockedValues([]);
      }

  }, [currentDate, settings, profil]);


  // --- Chargement : profil + présences repas + événements ---
  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;
      setIsReady(false);

      const dateIso = formatDateKeyLocal(currentDate);

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

      setIsReady(true);
    };

    fetchAllData();
  }, [user, currentDate]);

  // Sélection des présences et du types de repas
  const handleSelectRepas = async (repas: "dejeuner" | "diner", choix: string) => {
    const response = await fetch("/api/presence-repas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repas,
        choix,
        date: formatDateKeyLocal(currentDate),
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error(result.error || result.message);
      setConfirmationMsg(result.message || "Erreur lors de la modification.");
      return;
    }

    repas === "dejeuner" ? setRepasDejeuner(choix) : setRepasDiner(choix);
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

  // Chargement des rappels d'évènements
  useEffect(() => {
    const fetchReminders = async () => {
      // on se base sur la date affichée dans le calendrier (currentDate)
      const targetDate = new Date(currentDate);
      targetDate.setHours(0, 0, 0, 0);

      // On ne prend que les événements futurs ou du jour (pour éviter de rater des rappels en avance)
      const { data: allEvents, error } = await supabase
        .from("evenements")
        .select("*")
        .gte("date_event", formatDateKeyLocal(new Date())) // événements à venir
        .not("rappel_event", "is", null); // avec un rappel défini

      if (error) {
        console.error("Erreur récupération rappels :", error);
        return;
      }

      const activeReminders = allEvents.filter((evt) => {
        const dateEvt = new Date(evt.date_event);
        dateEvt.setHours(0, 0, 0, 0);

        const daysBefore = Number(evt.rappel_event || 0);
        if (daysBefore <= 0) return false;

        const reminderStart = new Date(dateEvt.getTime());
        reminderStart.setDate(reminderStart.getDate() - daysBefore);
        reminderStart.setHours(0, 0, 0, 0);

        // le jour affiché doit être dans [reminderStart, dateEvt)
        return targetDate >= reminderStart && targetDate < dateEvt;
      });

      setReminders(activeReminders);
    };

    fetchReminders();
  }, [supabase, currentDate]); // 🔥 on ajoute currentDate ici




  // Chargement des repas spéciaux
  useEffect(() => {
    const fetchSpecialOptions = async () => {
      if (!user) return;

      const dateIso = formatDateKeyLocal(currentDate);

      const { data, error } = await supabase
        .from("special_meal_options")
        .select("*")
        .or(`start_date.lte.${dateIso},indefinite.eq.true`)
        .filter("end_date", "gte", dateIso);

      if (error) {
        console.error("Erreur récupération repas spéciaux :", error);
        return;
      }

      // Initialisation des tableaux Option[]
      const dejeunerOpts: Option[] = [];
      const dinerOpts: Option[] = [];

      // Générateur d'Option conforme au type global
      const makeOption = (
        opt: { label: string; value: string | number; admin_only?: boolean },
        category: string,
        idBase: number
      ): Option => ({
        id: idBase,
        category,
        label: opt.label,
        value: String(opt.value),
        admin_only: opt.admin_only ?? false,
        is_active: true,
        created_at: new Date().toISOString(),
        label_category: category,
        parent_value: null,
        created_by: user?.id ?? "system",
      });

      let idCounter = 1; // compteur local pour des IDs uniques

      data.forEach((row) => {
        const opts = row.options as {
          label: string;
          value: string | number;
          admin_only?: boolean;
        }[];

        // Filtrage selon droits admin
        const filteredOpts = opts.filter(
          (o) => !o.admin_only || profil?.is_admin
        );

        // Ajout des options à la bonne catégorie
        if (row.service === "dejeuner") {
          dejeunerOpts.push(
            ...filteredOpts.map((opt) =>
              makeOption(opt, "dejeuner", idCounter++)
            )
          );
        }
        if (row.service === "diner") {
          dinerOpts.push(
            ...filteredOpts.map((opt) => makeOption(opt, "diner", idCounter++))
          );
        }
      });

      setSpecialOptions({
        dejeuner: dejeunerOpts,
        diner: dinerOpts,
      });
    };

    fetchSpecialOptions();
  }, [currentDate, user, supabase, profil]);

  // --- Loader global --- 
  if (!isReady || !isAbsentReady) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );
  }

  // --- Filtrage des événements par résidence et visibilité ---
  const filteredEvents = selectedResidenceValue
    ? events.filter((event) => {
        // Vérifie que l'évènement appartient bien à la résidence sélectionnée
        const lieux = (event.lieu || "").split(",").map((r) => r.trim());
        if (!lieux.includes(selectedResidenceValue)) return false;

        // Si admin → toujours visible
        if (profil?.is_admin) return true;

        // Si réservé au staff admin → visible uniquement si admin
        if (event.reserve_admin && !profil?.is_admin) return false;

        // Si invitée sans résidence → visible uniquement si visible_invites
        if (!profil?.residence) return event.visible_invites === true;

        // Récupère proprement les tableaux de visibilité (avec fallback [])
        const residences: string[] = event.visibilite?.residences ?? [];
        const etages: string[] = event.visibilite?.etages ?? [];
        const chambres: string[] = event.visibilite?.chambres ?? [];

        // Une résidente voit l'évènement si elle correspond à au moins un niveau
        const isVisible =
          residences.includes(profil.residence) ||
          etages.includes(profil.etage) ||
          chambres.includes(profil.chambre);

        return isVisible;
      }) : [];


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
          hidden sm:flex items-center justify-center
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
          hidden sm:flex items-center justify-center
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
          date={formatDateKeyLocal(currentDate)}
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
            left: selectedResidenceValue === "12" ? "0px" : "80px",
          }}
        />

        {residences.map((res) => (
          <button
            key={res.value}
            onClick={() => {setSelectedResidenceValue(res.value); 
                            setSelectedResidenceLabel(res.label)}}
            className={`cursor-pointer relative flex items-center justify-center w-20 h-12 text-lg font-bold border rounded-t-xl transition-colors z-10
              ${
                selectedResidenceValue === res.value
                  ? "text-white border-yellow-400 bg-yellow-400"
                  : "bg-white text-blue-800 border-gray-300 hover:bg-gray-100"
              }`}
          >
            {res.value}
          </button>
        ))}
      </div>


      {/* Bloc principal animé */}
      <section className="w-full max-w-md bg-white rounded-xl shadow-lg p-5 overflow-hidden relative">
        {/* 🔔 Bloc Rappels du jour */}
        {reminders.length > 0 && (
          <div className="w-full mb-5 bg-yellow-50 border border-yellow-300 rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              🔔 Rappels du jour
            </h3>
            <ul className="space-y-2">
              {reminders.map((evt) => (
                <li 
                  key={evt.id}
                  className={`${evt.couleur} bg-white p-3 rounded-lg shadow-sm border border-yellow-200`}
                >
                  <strong className="text-yellow-800">{evt.titre}</strong>
                  {evt.date_event && (
                    <p className="text-xs text-gray-600 mt-1">
                      Évènement prévu le{" "}
                      {new Date(evt.date_event).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })} au {evt.lieu}
                    </p>
                  )}
                  {evt.description && (
                    <p className="text-gray-700 text-sm mt-1">{evt.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
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
                  Aucun évènement prévu pour la {selectedResidenceLabel}.
                </p>
              ) : (
                filteredEvents.map((e) => (
                  <div
                      key={e.id}
                      className={`border rounded-lg px-4 py-3 mb-3 ${e.couleur}`}
                  >
                      {/* Ligne titre + boutons */}
                      <div className="flex items-center justify-between">
                          {/* --- Titre --- */}
                          <span className="text-sm font-medium text-gray-800">{e.titre}</span>

                          {/* --- Boutons à droite --- */}
                          <div className="flex items-center space-x-2">
                              {/* 👁 Vision (admin seulement) */}
                              {e.demander_confirmation && profil?.is_admin && <VisionConfirmation eventId={e.id} />}

                              {/* ✅ Toggle participation (pour tout le monde si demander_confirmation) */}
                              {e.demander_confirmation && <ConfirmationToggle eventId={e.id} />}
                          </div>
                      </div>

                      {/* Heure et description dessous */}
                      {e.heures && (
                      <p className="text-xs text-gray-600 mt-1 italic">
                          À partir de {e.heures}
                      </p>
                      )}

                      {e.description && (
                      <p className="text-xs text-gray-500 mt-1">{e.description}</p>
                      )}
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
              {/* Label à gauche */}
              <p className="font-semibold text-blue-900">Déjeuner</p>

              {/* Select + pencil à droite */}
              <div className="flex items-center gap-2">
                {specialOptions.dejeuner.length > 0 ? (
                  <SelectField
                    name="repasDejeuner"
                    value={repasDejeuner || ""}
                    options={specialOptions.dejeuner}
                    onChange={(val) => handleSelectRepas("dejeuner", val)}
                    placeholder="Choisissez votre déjeuner"
                    disabled={locked}
                    selectClassName="min-w-[220px] h-10"
                  />
                ) : (
                  <DynamicSelectGroup
                    rootCategory="repas"
                    subRootCategory="dejeuner"
                    onlyParent
                    onChange={(selected) => {
                      const choix = selected["dejeuner"]?.value;
                      if (choix) handleSelectRepas("dejeuner", choix);
                    }}
                    islabel={false}
                    initialValue={repasDejeuner}
                    disabled={locked}
                    lockedValues={lockedValues} // verrouiller les pn du lendemain
                    isAdmin={profil?.is_admin}
                  />
                )}

                <button
                  onClick={() => {
                    if (repasDejeuner !== 'non') {
                      setShowCommentModal(true)
                      setSelectedRepasId(dejeuner?.id_repas ?? -1)
                      setCommentValue(dejeuner?.commentaire ?? '')
                    }
                  }}
                  disabled={repasDejeuner === 'non' || locked}
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
              <p className="font-semibold text-blue-900">Dîner</p>

              <div className="flex items-center gap-2">
                {specialOptions.diner.length > 0 ? (
                  <SelectField
                    name="repasDiner"
                    value={repasDiner || ""}
                    options={specialOptions.diner}
                    onChange={(val) => handleSelectRepas("diner", val)}
                    placeholder="Choisissez votre dîner"
                    disabled={locked}
                    selectClassName="min-w-[220px] h-10"
                  />
                ) : (
                  <DynamicSelectGroup
                    rootCategory="repas"
                    subRootCategory="diner"
                    onlyParent={true}
                    onChange={(selected) => {
                      const choix = selected["diner"]?.value;
                      if (choix) handleSelectRepas("diner", choix);
                    }}
                    islabel={false}
                    initialValue={repasDiner}
                    disabled={locked}
                    lockedValues={lockedValues} // verrouiller les pn du lendemain
                    isAdmin={profil?.is_admin}
                  />
                )}

                <button
                  onClick={() => {
                    if (repasDiner !== 'non') {
                      setShowCommentModal(true)
                      setSelectedRepasId(diner?.id_repas ?? -1)
                      setCommentValue(diner?.commentaire ?? '')
                    }
                  }}
                  disabled={repasDiner === 'non' || locked}
                  className={`p-2 rounded-full transition ${repasDiner === 'non' || locked
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-900 cursor-pointer'}`}
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