"use client";

import { useState, useEffect } from "react";
import LogoutButton from "../components/logoutButton";
import ProfileButton from "../components/profileButton";
import AdministrationButton from "../components/administrationButton";
import Image from "next/image";
import { Bell, ChevronLeft, ChevronRight, Home, Moon, Calendar } from "lucide-react";
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
// COMPOSANT PRINCIPAL — Accueil (page de consultation, lecture seule)
// ============================================================

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { supabase } = useSupabase();

  // --- États principaux ---
  const [profil, setProfil] = useState<Residente | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [selectedResidenceValue, setSelectedResidenceValue] = useState<string | null>("12");
  const [selectedResidenceLabel, setSelectedResidenceLabel] = useState<string | null>("Résidence 12");
  const [reminders, setReminders] = useState<CalendarEvent[]>([]);

  // --- Résumé « ma journée » (lecture seule) ---
  const [isAbsent, setIsAbsent] = useState(false);
  const [dejeunerLabel, setDejeunerLabel] = useState<string | null>(null);
  const [dinerLabel, setDinerLabel] = useState<string | null>(null);

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
        setResidences(data.map((item) => ({ value: item.value, label: item.label })));
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
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 1);
      return newDate;
    });
  };

  const goToNextDay = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 1);
      return newDate;
    });
  };

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;

      const dateIso = formatDateKeyLocal(currentDate);

      const { data: profilData, error: profilError } = await supabase
        .from("residentes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profilError) console.error("Erreur profil :", profilError);
      if (profilData) {
        setProfil(profilData);
        setSelectedResidenceValue(profilData.residence);
        setSelectedResidenceLabel(profilData.residence === "12" ? "Résidence 12" : "Résidence 36");
      }

      const { data: eventsData, error: eventsError } = await supabase
        .from("evenements")
        .select("*")
        .contains("dates_event", [dateIso]);
      if (eventsError) console.error("Erreur événements :", eventsError);
      if (eventsData) setEvents(eventsData);

      // --- Résumé « ma journée » : présence foyer + repas du jour (nouveau modèle, lecture seule) ---
      const [{ data: absData }, { data: dayPresences }] = await Promise.all([
        supabase.from("absences_sejour").select("id").eq("user_id", user.id).lte("date_debut", dateIso).gte("date_fin", dateIso).limit(1),
        supabase.from("presences_v2").select("service, option:meal_options(label)").eq("user_id", user.id).eq("date", dateIso),
      ]);

      setIsAbsent((absData?.length ?? 0) > 0);

      const optLabel = (service: "dejeuner" | "diner"): string | null => {
        const p = dayPresences?.find((x) => x.service === service);
        const opt = p?.option as { label?: string } | null | undefined;
        return opt?.label ?? null;
      };
      setDejeunerLabel(optLabel("dejeuner"));
      setDinerLabel(optLabel("diner"));

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

  if (!isReady) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );
  }

  const filteredEvents = selectedResidenceValue
    ? events.filter((event) => {
        const lieux = event.lieu || [];
        if (!lieux.includes(selectedResidenceValue)) return false;

        if (event.reserve_admin) {
          if (!profil?.is_admin) return false;
          if (event.reserve_admin === "all") return true;
          if (event.reserve_admin === "12" || event.reserve_admin === "36") {
            return selectedResidenceValue === event.reserve_admin;
          }
        }

        if (!profil?.residence) return event.visible_invites === true;

        const residences: string[] = event.visibilite?.residence ?? [];
        const etages: string[] = event.visibilite?.etage ?? [];
        const chambres: string[] = event.visibilite?.chambre ?? [];
        const exclusions: string[] = event.visibilite?.exclusions ?? [];
        // Ciblage dynamique : exclue nommément
        if (user?.id && exclusions.includes(user.id)) return false;
        return (
          residences.includes(profil.residence) ||
          etages.includes(profil.etage) ||
          chambres.includes(profil.chambre)
        );
      })
    : [];

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <main className="min-h-screen flex flex-col items-center bg-white px-4 pt-5 pb-8">
      <div className="w-full max-w-md">

        {/* Administratif / profil / déconnexion en haut à droite */}
        <div className="flex justify-end items-center gap-2 mb-3">
          <AdministrationButton />
          <ProfileButton />
          <LogoutButton />
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-3">
          <Image src="/logo.png" alt="Logo" width={180} height={180} />
        </div>

        {/* Date + navigation par chevrons + accès calendrier */}
        <div className="flex items-center justify-center gap-1.5 mb-5 flex-wrap">
          <button
            onClick={goToPreviousDay}
            className="p-2 rounded-full hover:bg-blue-50 text-blue-700 transition cursor-pointer"
            title="Jour précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base sm:text-lg font-semibold text-center text-blue-800">
            {formatDate(currentDate)}
          </h2>
          <button
            onClick={goToNextDay}
            className="p-2 rounded-full hover:bg-blue-50 text-blue-700 transition cursor-pointer"
            title="Jour suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => router.push("/calendrier")}
            className="p-2 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer ml-1"
            title="Choisir une autre date dans le calendrier"
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>

        {/* Rappels du jour (compacts) — directement sous la date */}
        {reminders.length > 0 && (
          <div className="mb-4 space-y-1.5">
            {reminders.map((evt) => {
              if (!evt.nextReminderDate || typeof evt.joursRestants !== "number") return null;
              return (
                <div
                  key={`${evt.id}-${evt.nextReminderDate.getTime()}`}
                  className="flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5"
                >
                  <Bell className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />
                  <span className="font-bold text-yellow-800 bg-yellow-100 rounded px-1.5 py-0.5 flex-shrink-0">
                    J-{evt.joursRestants}
                  </span>
                  <span className="text-yellow-800 font-medium truncate">{evt.titre}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Carte PRÉSENCE au foyer (lecture seule) */}
        <section className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-blue-800 mb-3">Présence au foyer</h3>
          <div className="flex justify-center">
            {isAbsent ? (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 bg-red-50 rounded-full px-4 py-1.5">
                <Moon className="w-4 h-4" /> Sortie ce soir
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 rounded-full px-4 py-1.5">
                <Home className="w-4 h-4" /> Au foyer ce soir
              </span>
            )}
          </div>
        </section>

        {/* Intercalaires résidence — esthétique d'origine, couleur par résidence (12 = bleu clair, 36 = rose) */}
        <div className="flex justify-center mb-4">
          {residences.map((res) => {
            const active = selectedResidenceValue === res.value;
            const activeColor = res.value === "12" ? "bg-blue-400 border-blue-400" : "bg-pink-400 border-pink-400";
            return (
              <button
                key={res.value}
                onClick={() => {
                  setSelectedResidenceValue(res.value);
                  setSelectedResidenceLabel(res.label);
                }}
                className={`cursor-pointer flex items-center justify-center w-20 h-12 text-lg font-bold border rounded-t-xl transition-colors ${
                  active ? `text-white ${activeColor}` : "bg-white text-blue-800 border-gray-300 hover:bg-gray-100"
                }`}
              >
                {res.value}
              </button>
            );
          })}
        </div>

        {/* Carte ÉVÉNEMENTS — bordure et titre à la couleur de la résidence sélectionnée */}
        <section className={`bg-white rounded-xl shadow-md border-2 ${selectedResidenceValue === "12" ? "border-blue-400" : "border-pink-400"} p-4 mb-4`}>
          <h3 className={`text-xs font-bold uppercase tracking-wide mb-3 ${selectedResidenceValue === "12" ? "text-blue-700" : "text-pink-700"}`}>Événements</h3>

          {/* Événements du jour */}
          {filteredEvents.length === 0 ? (
            <p className="text-gray-400 italic text-sm">
              Aucun évènement prévu pour la {selectedResidenceLabel}.
            </p>
          ) : (
            filteredEvents.map((e) => (
              <div key={e.id} className={`border rounded-lg px-4 py-3 mb-2 ${e.couleur}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{e.titre}</span>
                  <div className="flex items-center space-x-2">
                    {e.demander_confirmation && profil?.is_admin && <VisionConfirmation eventId={e.id} />}
                    {e.demander_confirmation && <ConfirmationToggle eventId={e.id} />}
                  </div>
                </div>
                {e.heures && <p className="text-xs text-gray-600 mt-1 italic">{e.heures}</p>}
                {e.description && <p className="text-xs text-gray-500 mt-1">{e.description}</p>}
              </div>
            ))
          )}
        </section>

        {/* Carte REPAS du jour (lecture seule) */}
        <section className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-blue-800 mb-3">Repas du jour</h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-orange-50 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-orange-500 mb-1">Déjeuner</p>
              <p className="text-sm font-semibold text-blue-900 truncate">{dejeunerLabel ?? "Non"}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-blue-500 mb-1">Dîner</p>
              <p className="text-sm font-semibold text-blue-900 truncate">{dinerLabel ?? "Non"}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
