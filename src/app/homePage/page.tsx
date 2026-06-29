"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LogoutButton from "../components/logoutButton";
import Image from "next/image";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { CalendarEvent } from "@/types/CalendarEvent";
import { Residente } from "@/types/Residente";
import LoadingSpinner from "../components/LoadingSpinner";
import { Residence } from "@/types/Residence";
import { useSupabase } from "../providers";
import { User } from "@supabase/supabase-js";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import VisionConfirmation from "../components/VisionConfirmation";
import ConfirmationToggle from "../components/ConfirmationToggle";

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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [selectedResidenceValue, setSelectedResidenceValue] = useState<string | null>("12");
  const [selectedResidenceLabel, setSelectedResidenceLabel] = useState<string | null>("Résidence 12");
  const [reminders, setReminders] = useState<CalendarEvent[]>([]);

  // États pour le swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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
  // EFFETS
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
      const { data, error } = await supabase.from("residences").select("value, label").neq("value", "corail");
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
      if (profilData) {
        setProfil(profilData);
        setSelectedResidenceValue(profilData.residence)
        if (profilData.residence === "12") {
          setSelectedResidenceLabel("Résidence 12");
        } else {
          setSelectedResidenceLabel("Résidence 36");
        }
      }

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

  if (!isReady) {
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

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <main className="min-h-screen flex flex-col items-center bg-white px-4 pt-6">

      {/* Chevrons pour version DESKTOP */}
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

      {/* Animation du swipe sur MOBILE */}
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
          {/* LOGO Les Ecoles */}
          <Image src="/logo.png" alt="Logo" width={350} height={350} className="mb-3" />

          {/* Date du jour */}
          <div className="flex justify-center items-center mb-5 space-x-4">
            <h2 className="text-2xl font-semibold text-center text-blue-800">
              {formatDate(currentDate)}
            </h2>
          </div>

          {/* Intercalaire */}
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

          {/* Section Rappel et évènements */}
          <section className="w-full max-w-md bg-white rounded-xl shadow-lg p-5 overflow-hidden relative mb-10">
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
                              {evt.heures && ` ${evt.heures}`}
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
          </section>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
