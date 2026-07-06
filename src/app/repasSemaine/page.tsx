"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Lock, Moon, ChevronDown, UserPlus, ClipboardList, Settings } from "lucide-react";
import { useSupabase } from "../providers";
import { User } from "@supabase/supabase-js";
import { ServiceOption, MealOptionCatalog, PresenceV2, Service } from "@/types/MealOption";
import { Absence } from "@/types/Absence";
import { CalendarEvent } from "@/types/CalendarEvent";
import { computeLockState } from "@/lib/lockUtils";
import { isAwayForMeal } from "@/lib/mealCompta";
import { eventVisibleFor } from "@/lib/eventVisibility";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import LoadingSpinner from "../components/LoadingSpinner";
import LogoutButton from "../components/logoutButton";
import ProfileButton from "../components/profileButton";
import AdministrationButton from "../components/administrationButton";
import InviteModal from "../components/inviteModal";

const SERVICES: { value: Service; label: string }[] = [
  { value: "dejeuner", label: "Déjeuner" },
  { value: "diner", label: "Dîner" },
];

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay()));
  d.setHours(0, 0, 0, 0);
  return d;
}
// 8 jours : lundi -> lundi suivant inclus
function weekDates(monday: Date): string[] {
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatDateKeyLocal(d);
  });
}
function dayLabel(key: string): string {
  return parseDateKeyLocal(key).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase());
}
function weekLabel(monday: Date): string {
  const last = new Date(monday);
  last.setDate(monday.getDate() + 7);
  const from = monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const to = last.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  return `${from} – ${to}`;
}

type Profil = { is_admin?: boolean; residence?: string; etage?: string; chambre?: string };

export default function SemaineRepas() {
  const router = useRouter();
  const { supabase } = useSupabase();

  const [user, setUser] = useState<User | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [presences, setPresences] = useState<PresenceV2[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [weekEvents, setWeekEvents] = useState<CalendarEvent[]>([]);
  const [ready, setReady] = useState(false);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const [currentMonday, setCurrentMonday] = useState<Date>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dateSelectionnee");
      if (stored) return getMonday(parseDateKeyLocal(stored));
    }
    return getMonday(new Date());
  });

  const days = useMemo(() => weekDates(currentMonday), [currentMonday]);
  const isAdmin = profil?.is_admin ?? false;

  // Semaine de référence (date sélectionnée dans l'appli)
  const storedDate = typeof window !== "undefined" ? localStorage.getItem("dateSelectionnee") : null;
  const refMonday = getMonday(storedDate ? parseDateKeyLocal(storedDate) : new Date());
  const isRefWeek = formatDateKeyLocal(currentMonday) === formatDateKeyLocal(refMonday);

  // Auth + profil + settings (une fois)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/signin");
        return;
      }
      setUser(data.user);
      const { data: p } = await supabase.from("residentes").select("is_admin, residence, etage, chambre").eq("user_id", data.user.id).maybeSingle();
      setProfil(p ? { is_admin: p.is_admin, residence: p.residence, etage: p.etage, chambre: p.chambre } : {});
      const { data: settingsData } = await supabase.from("app_settings").select("key, value");
      const map: Record<string, string> = {};
      (settingsData ?? []).forEach((s) => (map[s.key] = s.value));
      setSettings(map);
    })();
  }, [supabase, router]);

  // Options ouvertes + inscriptions + absences + événements de la semaine
  const loadWeek = useCallback(async () => {
    if (!user) return;
    setReady(false);
    const start = days[0];
    const end = days[days.length - 1];
    const [{ data: soData }, { data: presData }, { data: absData }, { data: evData }] = await Promise.all([
      supabase.from("meal_service_options").select("*, option:meal_options(*)").gte("date", start).lte("date", end).order("position"),
      supabase.from("presences_v2").select("*").eq("user_id", user.id).gte("date", start).lte("date", end),
      supabase.from("absences_sejour").select("*").eq("user_id", user.id).lte("date_debut", end).gte("date_fin", start),
      supabase.from("evenements").select("*").overlaps("dates_event", days),
    ]);
    setServiceOptions((soData as ServiceOption[]) ?? []);
    setPresences((presData as PresenceV2[]) ?? []);
    setAbsences((absData as Absence[]) ?? []);
    setWeekEvents((evData as CalendarEvent[]) ?? []);
    setReady(true);
  }, [user, days, supabase]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  useEffect(() => {
    localStorage.setItem("dateSelectionnee", formatDateKeyLocal(currentMonday));
  }, [currentMonday]);

  // --- Helpers ---
  const dayLocked = (dateKey: string) => computeLockState(parseDateKeyLocal(dateKey), settings).locked;
  const orderable = (dateKey: string, opt: MealOptionCatalog) => {
    const cutoff = parseDateKeyLocal(dateKey);
    cutoff.setDate(cutoff.getDate() - (opt.delai_commande || 0));
    return !computeLockState(cutoff, settings).locked;
  };
  const selectionFor = (dateKey: string, service: Service) => presences.find((p) => p.date === dateKey && p.service === service)?.option_id ?? "";
  const openOptions = (dateKey: string, service: Service): MealOptionCatalog[] =>
    serviceOptions
      .filter((so) => so.date === dateKey && so.service === service && so.option)
      .map((so) => so.option as MealOptionCatalog)
      .filter((o) => o.is_active && (isAdmin || !o.admin_only));

  const eventViewer = { residence: profil?.residence, etage: profil?.etage, chambre: profil?.chambre, user_id: user?.id, is_admin: profil?.is_admin };
  const eventsForDay = (dateKey: string) => weekEvents.filter((e) => e.dates_event?.includes(dateKey) && eventVisibleFor(e, eventViewer));

  const setChoice = async (dateKey: string, service: Service, optionId: string) => {
    const res = await fetch("/api/presences-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateKey, service, option_id: optionId || null }),
    });
    const j = await res.json();
    if (!res.ok) { toast.error(j.error || "Erreur."); return; }
    setPresences((prev) => {
      const others = prev.filter((p) => !(p.date === dateKey && p.service === service));
      if (!optionId) return others;
      return [...others, { id: `local-${dateKey}-${service}`, user_id: user?.id ?? "", date: dateKey, service, option_id: optionId, commentaire: null }];
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-end items-center gap-2 mb-2">
          <AdministrationButton />
          <ProfileButton />
          <LogoutButton />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-blue-900 tracking-tight">Repas de la semaine</h1>
          <p className="text-blue-500 text-sm mt-1">Choisissez votre repas parmi les options proposées</p>
        </div>

        {/* Espace intendance (admin) — tout en haut pour éviter le scroll */}
        {isAdmin && (
          <div className="mb-6">
            <button onClick={() => setAdminPanelOpen((o) => !o)} className="w-full flex items-center justify-between bg-white rounded-2xl shadow-sm px-5 py-3 text-sm font-bold text-blue-900 hover:bg-blue-50 transition cursor-pointer">
              <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Espace intendance</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${adminPanelOpen ? "rotate-180" : ""}`} />
            </button>
            {adminPanelOpen && (
              <div className="mt-3 grid gap-2">
                <button onClick={() => router.push("/admin/repas-v2")} className="flex items-center gap-2 bg-white border border-blue-100 rounded-xl px-5 py-3 text-sm font-medium text-blue-800 hover:bg-blue-50 transition cursor-pointer">
                  <ClipboardList className="w-4 h-4" /> Voir les inscriptions & la compta
                </button>
                <button onClick={() => router.push("/admin/repas-options")} className="flex items-center gap-2 bg-white border border-blue-100 rounded-xl px-5 py-3 text-sm font-medium text-blue-800 hover:bg-blue-50 transition cursor-pointer">
                  <Settings className="w-4 h-4" /> Paramétrer les repas
                </button>
                <button onClick={() => router.push("/admin/repas")} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 px-5 py-1 transition cursor-pointer">
                  <ClipboardList className="w-3.5 h-3.5" /> Compta (historique — avant bascule)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation semaine */}
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3 mb-4">
          <button onClick={() => setCurrentMonday((m) => { const d = new Date(m); d.setDate(d.getDate() - 7); return d; })} className="p-2 rounded-xl hover:bg-blue-50 text-blue-700 cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-blue-900">{weekLabel(currentMonday)}</p>
            {!isRefWeek && (
              <button onClick={() => setCurrentMonday(refMonday)} className="text-xs text-blue-400 hover:text-blue-600 underline mt-0.5 cursor-pointer">
                Revenir à la semaine sélectionnée
              </button>
            )}
          </div>
          <button onClick={() => setCurrentMonday((m) => { const d = new Date(m); d.setDate(d.getDate() + 7); return d; })} className="p-2 rounded-xl hover:bg-blue-50 text-blue-700 cursor-pointer">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {!ready ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : (
          <div className="space-y-3">
            {days.map((dateKey) => {
              const locked = dayLocked(dateKey);
              const isToday = dateKey === formatDateKeyLocal(new Date());
              const dayEvents = eventsForDay(dateKey);
              return (
                <div key={dateKey} className={`bg-white rounded-2xl shadow-sm border-2 ${isToday ? "border-blue-400" : "border-transparent"} overflow-hidden`}>
                  <div className={`px-4 py-2 flex items-center justify-between ${isToday ? "bg-blue-600" : locked ? "bg-gray-100" : "bg-blue-50"}`}>
                    <span className={`text-sm font-bold ${isToday ? "text-white" : "text-blue-900"}`}>
                      {dayLabel(dateKey)}
                      {isToday && <span className="ml-2 text-xs font-normal opacity-80">Aujourd&apos;hui</span>}
                    </span>
                    {locked && <span className="text-xs text-gray-500 font-medium flex items-center gap-1"><Lock className="w-3 h-3" /> Verrouillé</span>}
                  </div>

                  {dayEvents.length > 0 && (
                    <div className="px-4 pt-2 space-y-1">
                      {dayEvents.map((e) => (
                        <div key={e.id} className={`text-xs rounded-md px-2 py-1 border ${e.couleur || "border-gray-200 bg-gray-50"}`}>
                          <span className="font-medium text-gray-800">📌 {e.titre}</span>
                          {e.heures && <span className="text-gray-500"> · {e.heures}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="px-4 py-3 grid grid-cols-2 gap-3">
                    {SERVICES.map((s) => {
                      const opts = openOptions(dateKey, s.value);
                      const current = selectionFor(dateKey, s.value);
                      const selectable = opts.filter((o) => orderable(dateKey, o) || o.id === current);
                      const away = isAwayForMeal(absences, user?.id ?? "", dateKey, s.value);
                      return (
                        <div key={s.value}>
                          <p className={`text-[10px] font-bold uppercase mb-1 tracking-wide ${s.value === "dejeuner" ? "text-orange-500" : "text-blue-500"}`}>{s.label}</p>
                          {away ? (
                            <p className="text-xs text-red-500 italic py-2 flex items-center gap-1"><Moon className="w-3 h-3" /> Absente — Non</p>
                          ) : opts.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-2">Service fermé</p>
                          ) : (
                            <select
                              value={current}
                              disabled={locked}
                              onChange={(e) => setChoice(dateKey, s.value, e.target.value)}
                              className={`w-full rounded-xl border-2 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 ${locked ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed" : "bg-white border-blue-200 text-blue-900 cursor-pointer"}`}
                            >
                              <option value="">Non</option>
                              {selectable.map((o) => (<option key={o.id} value={o.id}>{o.label}</option>))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inviter quelqu'un */}
        <div className="mt-8 flex justify-center">
          <button onClick={() => setIsInviteOpen(true)} className="flex items-center gap-2 bg-white border-2 border-blue-200 text-blue-700 rounded-2xl px-6 py-3 text-sm font-semibold shadow-sm hover:bg-blue-50 transition cursor-pointer">
            <UserPlus className="w-4 h-4" /> Inviter quelqu&apos;un
          </button>
        </div>

        <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
      </div>
    </main>
  );
}
