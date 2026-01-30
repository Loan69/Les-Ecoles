"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LogoutButton from "../components/logoutButton";
import PresenceButton from "../components/presenceButton";
import Image from "next/image";
import { Bell, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import InviteModal from "../components/inviteModal";
import { useRouter } from "next/navigation";
import { CalendarEvent } from "@/types/CalendarEvent";
import { Residente } from "@/types/Residente";
import LoadingSpinner from "../components/LoadingSpinner";
import CommentModal from "../components/commentModal";
import { Residence } from "@/types/Residence";
import { useSupabase } from "../providers";
import { User } from "@supabase/supabase-js";
import { Option } from "@/types/Option";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import VisionConfirmation from "../components/VisionConfirmation";
import ConfirmationToggle from "../components/ConfirmationToggle";
import { Rule } from "@/types/Rule";
import { getLatestRulesByService } from "@/lib/rulesUtils";
import SelectField2 from "../components/SelectField2";

// ============================================================
// TYPES POUR UNE GESTION UNIFORME DES REPAS
// ============================================================

interface MealOption {
  id: number; // Identifiant unique
  value: string; // Valeur pour le comptage (ex: "oui", "non", "12", "36", "pn_chaud", etc.)
  label: string; // Label d'affichage
  isSpecial: boolean; // true si c'est un repas spécial, false si c'est un repas par défaut
  isLocked?: boolean; // Pour les pique-niques verrouillés
  adminOnly?: boolean; // Réservé aux admins
}

interface MealSelection {
  selectedId: number; // ID de l'option sélectionnée
  selectedValue: string; // Valeur pour le comptage
  dbRecordId: number | null; // ID de l'enregistrement en base
  comment: string; // Commentaire associé
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { supabase } = useSupabase();

  // --- États principaux ---
  const [profil, setProfil] = useState<Residente | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);
  const [locked, setLocked] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isAbsent, setIsAbsent] = useState(false);
  const [isAbsentReady, setIsAbsentReady] = useState(false);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [selectedResidenceValue, setSelectedResidenceValue] = useState<string | null>("12");
  const [selectedResidenceLabel, setSelectedResidenceLabel] = useState<string | null>("Résidence 12");
  const [settings, setSettings] = useState<{ verrouillage_repas?: string; verrouillage_foyer?: string }>({});
  const [reminders, setReminders] = useState<CalendarEvent[]>([]);
  const [lockedValues, setLockedValues] = useState<string[]>([]);

  // --- NOUVELLE STRUCTURE POUR LES REPAS ---
  const [dejeunerOptions, setDejeunerOptions] = useState<MealOption[]>([]);
  const [dinerOptions, setDinerOptions] = useState<MealOption[]>([]);
  const [dejeunerSelection, setDejeunerSelection] = useState<MealSelection>({
    selectedId: 0,
    selectedValue: "non",
    dbRecordId: null,
    comment: "",
  });
  const [dinerSelection, setDinerSelection] = useState<MealSelection>({
    selectedId: 0,
    selectedValue: "non",
    dbRecordId: null,
    comment: "",
  });

  // États pour le swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Variables pour le commentaire
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<"dejeuner" | "diner" | null>(null);

  // ============================================================
  // UTILITAIRES
  // ============================================================

  const formatDate = (date: Date) => {
    const formatted = date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // ============================================================
  // FONCTION : CONSTRUIRE LES OPTIONS DE REPAS
  // ============================================================

  const buildMealOptions = (
    baseOptions: Option[], // Options par défaut depuis DynamicSelectGroup
    specialRules: Rule | null, // Règles spéciales depuis special_meal_options
    lockedValues: string[],
    isAdmin: boolean
  ): MealOption[] => {
    const options: MealOption[] = [];

    // ✅ S'il y a une règle spéciale, on utilise UNIQUEMENT ses options
    if (specialRules && specialRules.options) {
      specialRules.options.forEach((specialOpt) => {
        // Filtrer les options inactives ou réservées aux admins
        if (!(specialOpt.is_active ?? true)) return; // ✅ Filtrer les options inactives
        if (specialOpt.admin_only && !isAdmin) return;

        // Ajouter l'option de la règle spéciale
        options.push({
          id: specialOpt.id, // ID unique pour les spéciaux
          value: specialOpt.value,
          label: specialOpt.label || specialOpt.value,
          isSpecial: true,
          isLocked: lockedValues.includes(specialOpt.value),
          adminOnly: specialOpt.admin_only || false,
        });
      });
    } else {
      // ✅ Pas de règle spéciale : on utilise les options par défaut
      baseOptions.forEach((opt) => {
        options.push({
          id: opt.id,
          value: opt.value,
          label: opt.label || opt.value,
          isSpecial: false,
          isLocked: lockedValues.includes(opt.value),
          adminOnly: false,
        });
      });
    }
    return options.filter((opt) => !opt.isLocked || !opt.isLocked && isAdmin);
  };

  // ============================================================
  // FONCTION : CHARGER LES OPTIONS PAR DÉFAUT DEPUIS LA BDD
  // ============================================================

  const getDefaultMealOptions = async (mealType: "dejeuner" | "diner"): Promise<Option[]> => {
    const { data, error } = await supabase
      .from("select_options_repas")
      .select("*")
      .eq("category", mealType)
      .eq("is_active", true)
      .is("parent_value", null)
      .order("label");

    if (error) {
      console.error(`Erreur chargement options ${mealType}:`, error);
      return [];
    }

    if (!data) return [];

    // Filtrer selon les permissions admin
    const filtered = profil?.is_admin ? data : data.filter((o) => !o.admin_only);

    return filtered.map((item) => ({
      id: item.id,
      value: item.value,
      label: item.label,
      category: item.category,
      created_at: item.created_at || "",
      created_by: item.created_by || "",
      admin_only: item.admin_only || false,
    }));
  };

  // ============================================================
  // EFFET : CHARGER LES OPTIONS DE REPAS
  // ============================================================

  useEffect(() => {
    const loadMealOptions = async () => {
      if (!user || !profil) return;

      const dateIso = formatDateKeyLocal(currentDate);

      // 1. Récupérer les règles spéciales
      const { data: specialRulesData, error } = await supabase
        .from("special_meal_options")
        .select("*")
        .or(`start_date.lte.${dateIso},indefinite.eq.true`)
        .filter("end_date", "gte", dateIso);

      if (error) {
        console.error("Erreur récupération repas spéciaux :", error);
        return;
      }

      const rules = (specialRulesData as Rule[]) || [];
      const latestDejeuner = getLatestRulesByService(rules, "dejeuner") as Rule | null;
      const latestDiner = getLatestRulesByService(rules, "diner") as Rule | null;

      // 2. Charger les options par défaut
      const defaultDejeuner = await getDefaultMealOptions("dejeuner");
      const defaultDiner = await getDefaultMealOptions("diner");

      // 3. Construire les options complètes
      const dejOptions = buildMealOptions(
        defaultDejeuner,
        latestDejeuner,
        lockedValues,
        profil.is_admin || false
      );
      const dinOptions = buildMealOptions(
        defaultDiner,
        latestDiner,
        lockedValues,
        profil.is_admin || false
      );

      setDejeunerOptions(dejOptions);
      setDinerOptions(dinOptions);
    };

    loadMealOptions();
  }, [currentDate, user, supabase, profil, lockedValues]);

  // ============================================================
  // EFFET : CHARGER LES SÉLECTIONS EXISTANTES
  // ============================================================

  useEffect(() => {
    const loadMealSelections = async () => {
      if (!user) return;

      const dateIso = formatDateKeyLocal(currentDate);

      const { data: presences, error } = await supabase
        .from("presences")
        .select("id_repas, user_id, type_repas, date_repas, choix_repas, commentaire, option_id")
        .eq("date_repas", dateIso)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erreur chargement présences :", error);
        return;
      }

      const dejeunerData = presences?.find((p) => p.type_repas === "dejeuner");
      const dinerData = presences?.find((p) => p.type_repas === "diner");

      // Déjeuner
      if (dejeunerData) {
        let matchingOption: MealOption | undefined;
        
        // Si on a un option_id, on cherche l'option spéciale par son ID
        if (dejeunerData.option_id) {
          matchingOption = dejeunerOptions.find(
            (opt) => opt.isSpecial && opt.id === dejeunerData.option_id
          );
        }
        
        // Sinon, on cherche l'option par défaut par sa value
        if (!matchingOption) {
          matchingOption = dejeunerOptions.find(
            (opt) => !opt.isSpecial && opt.value === dejeunerData.choix_repas
          );
        }
        
        setDejeunerSelection({
          selectedId: matchingOption ? matchingOption.id : dejeunerData.choix_repas,
          selectedValue: dejeunerData.choix_repas,
          dbRecordId: dejeunerData.id_repas,
          comment: dejeunerData.commentaire || "",
        });
      } else {
        // Pas de données = "non" par défaut
        const nonOption = dejeunerOptions.find((opt) => opt.value === "non" && !opt.isSpecial);
        setDejeunerSelection({
          selectedId: nonOption ? nonOption.id : 0,
          selectedValue: "non",
          dbRecordId: null,
          comment: "",
        });
      }

      // Dîner
      if (dinerData) {
        let matchingOption: MealOption | undefined;
        
        // Si on a un option_id, on cherche l'option spéciale par son ID
        if (dinerData.option_id) {
          matchingOption = dinerOptions.find(
            (opt) => opt.isSpecial && opt.id === dinerData.option_id
          );
        }
        
        // Sinon, on cherche l'option par défaut par sa value
        if (!matchingOption) {
          matchingOption = dinerOptions.find(
            (opt) => !opt.isSpecial && opt.value === dinerData.choix_repas
          );
        }
        
        setDinerSelection({
          selectedId: matchingOption ? matchingOption.id : dinerData.choix_repas,
          selectedValue: dinerData.choix_repas,
          dbRecordId: dinerData.id_repas,
          comment: dinerData.commentaire || "",
        });
      } else {
        const nonOption = dinerOptions.find((opt) => opt.value === "non" && !opt.isSpecial);
        setDinerSelection({
          selectedId: nonOption ? nonOption.id : 0,
          selectedValue: "non",
          dbRecordId: null,
          comment: "",
        });
      }
    };

    // Ne charger que si les options sont disponibles
    if (dejeunerOptions.length > 0 && dinerOptions.length > 0) {
      loadMealSelections();
    }
  }, [currentDate, user, supabase, dejeunerOptions, dinerOptions]); 

  // ============================================================
  // FONCTION : GÉRER LA SÉLECTION D'UN REPAS
  // ============================================================

  const handleMealSelection = async (
    mealType: "dejeuner" | "diner",
    selectedOption: MealOption
  ) => {
    const response = await fetch("/api/presence-repas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repas: mealType,
        choix: selectedOption.value,
        date: formatDateKeyLocal(currentDate),
        // NOUVEAU : On envoie l'ID de l'option si c'est un repas spécial
        option_id: selectedOption.isSpecial ? selectedOption.id : null,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error(result.error || result.message);
      setConfirmationMsg(result.message || "Erreur lors de la modification.");
      return;
    }

    // Mettre à jour l'état local
    const newSelection: MealSelection = {
      selectedId: selectedOption.id,
      selectedValue: selectedOption.value,
      dbRecordId: result.id_repas || null,
      comment: mealType === "dejeuner" ? dejeunerSelection.comment : dinerSelection.comment,
    };

    if (mealType === "dejeuner") {
      setDejeunerSelection(newSelection);
    } else {
      setDinerSelection(newSelection);
    }

    setConfirmationMsg(result.message);
  };

  // ============================================================
  // FONCTION : GÉRER LES COMMENTAIRES
  // ============================================================

  const handleSaveComment = async (newComment: string) => {
    if (!selectedMealType) return;

    const selection = selectedMealType === "dejeuner" ? dejeunerSelection : dinerSelection;
    if (!selection.dbRecordId) return;

    const { error } = await supabase
      .from("presences")
      .update({ commentaire: newComment })
      .eq("id_repas", selection.dbRecordId);

    if (error) {
      console.error("Erreur mise à jour commentaire :", error);
      return;
    }

    // Mettre à jour l'état local
    if (selectedMealType === "dejeuner") {
      setDejeunerSelection((prev) => ({ ...prev, comment: newComment }));
    } else {
      setDinerSelection((prev) => ({ ...prev, comment: newComment }));
    }

    setShowCommentModal(false);
    setSelectedMealType(null);
  };

  // ============================================================
  // AUTRES EFFETS
  // ============================================================

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          router.replace("/signin");
          return;
        }
        setUser(data.user);
      } catch (err) {
        console.error("Erreur récupération user :", err);
        router.replace("/signin");
      }
    };
    fetchUser();
  }, [router, supabase]);

  useEffect(() => {
    const fetchResidences = async () => {
      const { data, error } = await supabase.from("residences").select("value, label");
      if (!error && data) {
        const formatted = data.map((item) => ({
          value: item.value,
          label: item.label,
        }));
        setResidences(formatted);
      }
    };
    fetchResidences();
  }, [supabase]);

  useEffect(() => {
    console.log(localStorage.getItem("dateSelectionnee"))
    const storedDate = localStorage.getItem("dateSelectionnee");
    if (storedDate) {
      setCurrentDate(parseDateKeyLocal(storedDate));
    } else {
      setCurrentDate(new Date());
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("dateSelectionnee", formatDateKeyLocal(currentDate));
    localStorage.setItem("startDate", formatDateKeyLocal(currentDate));
    localStorage.setItem("endDate", formatDateKeyLocal(currentDate));
  }, [currentDate, isInitialized]);

  

  const goToPreviousDay = () => {
    setDirection(-1);
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 1);
      return newDate;
    });
  };

  const goToNextDay = () => {
    setDirection(1);
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 1);
      return newDate;
    });
  };

  useEffect(() => {
    const fetchStatus = async () => {
      if (!user) return;
      const res = await fetch("/api/get-is-absent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: formatDateKeyLocal(currentDate) }),
      });
      const result = await res.json();
      setIsAbsent(result.isAbsent);
      setIsAbsentReady(true);
    };
    fetchStatus();
  }, [currentDate, user]);

  const togglePresence = async () => {
    const res = await fetch("/api/presence-foyer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAbsent, date: formatDateKeyLocal(currentDate) }),
    });
    const result = await res.json();
    if (res.ok) {
      setIsAbsent(!isAbsent);
    } else {
      console.error(result.error);
    }
  };

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
  }, [supabase]);

  useEffect(() => {
    if (!settings.verrouillage_repas) return;

    const now = new Date();
    const parisNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const [lockHour, lockMinute] = settings.verrouillage_repas.split(":").map(Number);

    const selectedDay = formatDateKeyLocal(currentDate);
    const parisToday = formatDateKeyLocal(parisNow);

    const parisTomorrowDate = new Date(parisNow);
    parisTomorrowDate.setDate(parisNow.getDate() + 1);
    const parisTomorrow = formatDateKeyLocal(parisTomorrowDate);

    const afterLock =
      parisNow.getHours() > lockHour ||
      (parisNow.getHours() === lockHour && parisNow.getMinutes() >= lockMinute);

    const isPastDay = selectedDay < parisToday;
    const isToday = selectedDay === parisToday;

    if (isPastDay || (isToday && afterLock)) {
      setLocked(true);
      setConfirmationMsg(`Les présences aux repas ne sont plus modifiables après ${settings.verrouillage_repas}.`);
    } else {
      setLocked(false);
      setConfirmationMsg("");
    }

    // VERROUILLAGE DES PIQUE-NIQUES pour le lendemain après l'heure de lock
    if (selectedDay === parisTomorrow && afterLock) {
      setLockedValues(["pn_chaud", "pn_froid"]);
    } else if (selectedDay === parisToday && !afterLock) {
      // Aujourd'hui avant l'heure de lock : pique-niques verrouillés aussi
      setLockedValues(["pn_chaud", "pn_froid"]);
    } else {
      setLockedValues([]);
    }
  }, [currentDate, settings, profil]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;
      setIsReady(false);

      const dateIso = formatDateKeyLocal(currentDate);

      const { data: profilData, error: profilError } = await supabase
        .from("residentes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profilError) console.error("Erreur profil :", profilError);
      if (profilData) setProfil(profilData);

      const { data: eventsData, error: eventsError } = await supabase
        .from("evenements")
        .select("*")
        .contains("dates_event", [dateIso]);
      if (eventsError) console.error("Erreur événements :", eventsError);
      if (eventsData) setEvents(eventsData);

      setIsReady(true);
    };
    fetchAllData();
  }, [user, currentDate, supabase]);

  useEffect(() => {
    if (!isInitialized) return;

    const fetchReminders = async () => {
      const today = new Date(currentDate);
      today.setHours(0, 0, 0, 0);

      const { data: allEvents, error } = await supabase
        .from("evenements")
        .select("*")
        .not("rappel_event", "is", null)
        .gt("rappel_event", 0);

      if (error) {
        console.error("Erreur récupération rappels :", error);
        return;
      }

      if (!allEvents) {
        setReminders([]);
        return;
      }

      const activeReminders = allEvents
        .map((evt) => {
          if (!evt.dates_event || evt.dates_event.length === 0) return null;

          const rappelJours = evt.rappel_event || 0;
          const eventDates: Date[] = (evt.dates_event as string[])
            .map((dateStr) => {
              const [year, month, day] = dateStr.split("-").map(Number);
              const d = new Date(year, month - 1, day);
              d.setHours(0, 0, 0, 0);
              return d;
            })
            .filter((d) => !isNaN(d.getTime()));

          if (eventDates.length === 0) return null;

          const datesToRemind = eventDates.filter((eventDate) => {
            const diffTime = eventDate.getTime() - today.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 && diffDays <= rappelJours;
          });

          if (datesToRemind.length === 0) return null;

          const nextReminderDate = datesToRemind.reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
          const diffTime = nextReminderDate.getTime() - today.getTime();
          const joursRestants = Math.round(diffTime / (1000 * 60 * 60 * 24));

          return { ...evt, nextReminderDate, joursRestants };
        })
        .filter(Boolean) as (typeof allEvents[0] & { nextReminderDate: Date; joursRestants: number })[];

      activeReminders.sort((a, b) => a.nextReminderDate.getTime() - b.nextReminderDate.getTime());
      setReminders(activeReminders);
    };

    fetchReminders();
  }, [supabase, currentDate, isInitialized]);

  // Swipe
  const minSwipeDistance = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    setDragOffset(currentX - touchStartX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragOffset > minSwipeDistance) {
      setDragOffset(300);
      setTimeout(() => {
        goToPreviousDay();
        setDragOffset(0);
      }, 150);
    } else if (dragOffset < -minSwipeDistance) {
      setDragOffset(-300);
      setTimeout(() => {
        goToNextDay();
        setDragOffset(0);
      }, 150);
    } else {
      setDragOffset(0);
    }
    setTouchStartX(null);
  };

  if (!isReady || !isAbsentReady) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );
  }

  
  const filteredEvents = selectedResidenceValue
    ? events.filter((event) => {
        // lieu est maintenant un tableau
        const lieux = event.lieu || [];
        if (!lieux.includes(selectedResidenceValue)) return false;

        // Gestion visibilité admin
        if (event.reserve_admin) {
          // Si pas admin, ne pas afficher
          if (!profil?.is_admin) return false;
          
          // Si admin, vérifier la résidence
          if (event.reserve_admin === "all") {
            // Visible par tout le staff
            return true;
          } else if (event.reserve_admin === "12" || event.reserve_admin === "36") {
            // Visible uniquement si on est sur la bonne résidence
            return selectedResidenceValue === event.reserve_admin;
          }
        }

        // Logique existante pour les non-admin
        if (!profil?.residence) return event.visible_invites === true;
        
        const residences: string[] = event.visibilite?.residence ?? [];
        const etages: string[] = event.visibilite?.etage ?? [];
        const chambres: string[] = event.visibilite?.chambre ?? [];
        const isVisible =
          residences.includes(profil.residence) ||
          etages.includes(profil.etage) ||
          chambres.includes(profil.chambre);
        return isVisible;
      })
    : [];

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

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <main className="min-h-screen flex flex-col items-center bg-white px-4 pt-6">
      <button
        onClick={goToPreviousDay}
        className="hidden sm:flex items-center justify-center absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-[calc(50%+210px)] bg-white shadow-md hover:shadow-lg rounded-full w-12 h-12 z-20 text-blue-700 transition-transform duration-200 hover:scale-110 cursor-pointer"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={goToNextDay}
        className="hidden sm:flex items-center justify-center absolute top-1/2 left-1/2 -translate-y-1/2 translate-x-[calc(50%+165px)] bg-white shadow-md hover:shadow-lg rounded-full w-12 h-12 z-20 text-blue-700 transition-transform duration-200 hover:scale-110 cursor-pointer"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="w-full max-w-md flex justify-end mb-4">
        <LogoutButton />
      </div>

      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          className="w-full flex flex-col items-center"
          style={{
            x: dragOffset,
            transition: isDragging ? "none" : "x 0.25s ease-out",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Image src="/logo.png" alt="Logo" width={350} height={350} className="mb-3" />

          <div className="flex justify-center items-center mb-5 space-x-4">
            <h2 className="text-2xl font-semibold text-center text-blue-800">
              {formatDate(currentDate)}
            </h2>
          </div>

          <div className="flex flex-col items-center mt-4 space-y-2 mb-5">
            <PresenceButton
              date={formatDateKeyLocal(currentDate)}
              isAbsent={isAbsent}
              togglePresence={togglePresence}
              isAdmin={profil?.is_admin}
            />
          </div>

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
                onClick={() => {
                  setSelectedResidenceValue(res.value);
                  setSelectedResidenceLabel(res.label);
                }}
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

          <section className="w-full max-w-md bg-white rounded-xl shadow-lg p-5 overflow-hidden relative">
            {/* Rappels */}
            {reminders.length > 0 && (
              <div className="w-full mb-5 bg-yellow-50 border border-yellow-300 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Rappels du jour
                  <span className="text-xs font-normal text-yellow-600">
                    ({reminders.length} événement{reminders.length > 1 ? "s" : ""} à venir)
                  </span>
                </h3>
                <ul className="space-y-2">
                  {reminders.map((evt) => {
                    if (!evt.nextReminderDate || typeof evt.joursRestants !== "number") {
                      return null;
                    }

                    const eventDateFormatted = evt.nextReminderDate.toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });

                    return (
                      <li
                        key={`${evt.id}-${evt.nextReminderDate.getTime()}`}
                        className="bg-white p-3 rounded-lg shadow-sm border border-yellow-200 hover:border-yellow-400 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <strong className="text-yellow-800 text-base">{evt.titre}</strong>
                            <p className="text-sm text-yellow-700 mt-1 font-medium">
                              📅 Dans {evt.joursRestants} jour{evt.joursRestants > 1 ? "s" : ""}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              Évènement prévu le {eventDateFormatted}
                              {evt.heures && ` à ${evt.heures}`}
                              {evt.lieu && ` • Résidence ${evt.lieu}`}
                            </p>
                            {evt.description && (
                              <p className="text-gray-700 text-sm mt-2 line-clamp-2">
                                {evt.description}
                              </p>
                            )}
                            {evt.dates_event && evt.dates_event.length > 1 && (
                              <p className="text-xs text-gray-500 mt-2 italic">
                                Événement sur {evt.dates_event.length} dates
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 bg-yellow-100 text-yellow-800 rounded-full px-3 py-1 text-xs font-semibold">
                            J-{evt.joursRestants}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Événements */}
            <div className="mb-10">
              {filteredEvents.length === 0 ? (
                <p className="text-gray-500 italic text-sm mb-4">
                  Aucun évènement prévu pour la {selectedResidenceLabel}.
                </p>
              ) : (
                filteredEvents.map((e) => (
                  <div key={e.id} className={`border rounded-lg px-4 py-3 mb-3 ${e.couleur}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">{e.titre}</span>
                      <div className="flex items-center space-x-2">
                        {e.demander_confirmation && profil?.is_admin && (
                          <VisionConfirmation eventId={e.id} />
                        )}
                        {e.demander_confirmation && <ConfirmationToggle eventId={e.id} />}
                      </div>
                    </div>
                    {e.heures && (
                      <p className="text-xs text-gray-600 mt-1 italic">{e.heures}</p>
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
              <p className="font-semibold text-blue-900">Déjeuner</p>

              <div className="flex items-center gap-2">
                <SelectField2
                  name="repasDejeuner"
                  value={String(dejeunerSelection.selectedId)}
                  options={dejeunerOptions.map((opt) => ({
                    id: opt.id,
                    value: String(opt.id),
                    label: opt.label,
                    category: "dejeuner",
                    created_at: "",
                    created_by: "",
                  }))}
                  onChange={(option) => {
                    if (!option) return;
                    const selectedMealOption = dejeunerOptions.find(
                      (opt) => opt.id === option.id
                    );
                    if (selectedMealOption) {
                      handleMealSelection("dejeuner", selectedMealOption);
                    }
                  }}
                  placeholder="Choisissez votre déjeuner"
                  disabled={locked}
                  selectClassName="w-full max-w-[180px] md:max-w-[220px] h-10"
                />

                <button
                  onClick={() => {
                    if (dejeunerSelection.selectedValue !== "non") {
                      setShowCommentModal(true);
                      setSelectedMealType("dejeuner");
                    }
                  }}
                  disabled={dejeunerSelection.selectedValue === "non" || locked}
                  className={`p-2 rounded-full transition ${
                    dejeunerSelection.selectedValue === "non" || locked
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-900 cursor-pointer"
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
                <SelectField2
                  name="repasDiner"
                  value={String(dinerSelection.selectedId)}
                  options={dinerOptions.map((opt) => ({
                    id: opt.id,
                    value: String(opt.id),
                    label: opt.label,
                    category: "diner",
                    created_at: "",
                    created_by: "",
                  }))}
                  onChange={(option) => {
                    if (!option) return;
                    const selectedMealOption = dinerOptions.find((opt) => opt.id === option.id);
                    if (selectedMealOption) {
                      handleMealSelection("diner", selectedMealOption);
                    }
                  }}
                  placeholder="Choisissez votre dîner"
                  disabled={locked}
                  selectClassName="w-full max-w-[180px] md:max-w-[220px] h-10"
                />

                <button
                  onClick={() => {
                    if (dinerSelection.selectedValue !== "non") {
                      setShowCommentModal(true);
                      setSelectedMealType("diner");
                    }
                  }}
                  disabled={dinerSelection.selectedValue === "non" || locked}
                  className={`p-2 rounded-full transition ${
                    dinerSelection.selectedValue === "non" || locked
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-900 cursor-pointer"
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>

            {confirmationMsg && (
              <p className="mt-3 text-green-600 font-semibold text-sm">{confirmationMsg}</p>
            )}

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
                Inviter quelqu&apos;un
              </button>
            </div>

            {/* Modals */}
            <InviteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            <CommentModal
              isOpen={showCommentModal}
              onClose={() => {
                setShowCommentModal(false);
                setSelectedMealType(null);
              }}
              onSave={handleSaveComment}
              initialComment={
                selectedMealType === "dejeuner"
                  ? dejeunerSelection.comment
                  : dinerSelection.comment
              }
            />
          </section>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}