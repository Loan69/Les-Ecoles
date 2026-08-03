"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Lock, Moon, UserPlus, Trash2, Pencil } from "lucide-react";
import { useSupabase } from "../providers";
import { User } from "@supabase/supabase-js";
import { ServiceOption, MealOptionCatalog, PresenceV2, Service } from "@/types/MealOption";
import { Absence } from "@/types/Absence";
import { CalendarEvent } from "@/types/CalendarEvent";
import { computeLockState } from "@/lib/lockUtils";
import { isAwayForMeal } from "@/lib/mealCompta";
import { CHOIX_NON } from "@/lib/presenceStatut";
import { eventVisibleFor } from "@/lib/eventVisibility";
import { optionVisibleFor } from "@/lib/optionVisibility";
import { formatLieu } from "@/lib/eventLieu";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import LoadingSpinner from "../components/LoadingSpinner";
import LogoutButton from "../components/logoutButton";
import ProfileButton from "../components/profileButton";
import AdministrationButton from "../components/administrationButton";
import InviteModal, { EditingInvite } from "../components/inviteModal";
import RepasNav from "../components/admin/RepasNav";
import { useMyRights } from "@/lib/useMyRights";
import { useSectionGuard } from "@/lib/useSectionGuard";

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
type InviteRow = { id: number; id_invite: number | null; nom: string; prenom: string; date_repas: string; type_repas: "dejeuner" | "diner"; option_id: string | null };

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
  const [myInvites, setMyInvites] = useState<InviteRow[]>([]);
  const [ready, setReady] = useState(false);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingInvite, setEditingInvite] = useState<EditingInvite | null>(null);

  const [currentMonday, setCurrentMonday] = useState<Date>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dateSelectionnee");
      if (stored) return getMonday(parseDateKeyLocal(stored));
    }
    return getMonday(new Date());
  });

  const days = useMemo(() => weekDates(currentMonday), [currentMonday]);
  const accesSection = useSectionGuard("repas"); // niveau Aucun → redirigé vers l'accueil
  const myRights = useMyRights();
  const canRepas = myRights.canView("repas"); // accès à l'Espace intendance repas
  const canViewEvents = myRights.canView("evenements"); // événements réservés au staff

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
    const [{ data: soData }, { data: presData }, { data: absData }, { data: evData }, { data: invData }] = await Promise.all([
      supabase.from("meal_service_options").select("*, option:meal_options(*)").gte("date", start).lte("date", end).order("position"),
      supabase.from("presences_v2").select("*").eq("user_id", user.id).gte("date", start).lte("date", end),
      supabase.from("absences_sejour").select("*").eq("user_id", user.id).lte("date_debut", end).gte("date_fin", start),
      supabase.from("evenements").select("*").overlaps("dates_event", days),
      supabase.from("invites_repas").select("id, id_invite, nom, prenom, date_repas, type_repas, option_id").eq("invite_par", user.id).gte("date_repas", start).lte("date_repas", end),
    ]);
    setServiceOptions((soData as ServiceOption[]) ?? []);
    setPresences((presData as PresenceV2[]) ?? []);
    setAbsences((absData as Absence[]) ?? []);
    setWeekEvents((evData as CalendarEvent[]) ?? []);
    setMyInvites((invData as InviteRow[]) ?? []);
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
  // Valeur du sélecteur : "" = à renseigner · "non" = Non explicite · sinon l'id de l'option.
  const selectionFor = (dateKey: string, service: Service) => {
    const pres = presences.find((p) => p.date === dateKey && p.service === service);
    if (!pres) return "";
    return pres.option_id ?? CHOIX_NON;
  };
  const openOptions = (dateKey: string, service: Service): MealOptionCatalog[] =>
    serviceOptions
      .filter((so) => so.date === dateKey && so.service === service && so.option)
      .map((so) => so.option as MealOptionCatalog)
      .filter((o) => o.is_active && optionVisibleFor(o, { residence: profil?.residence, etage: profil?.etage, user_id: user?.id, is_admin: profil?.is_admin }));

  const eventViewer = { residence: profil?.residence, etage: profil?.etage, chambre: profil?.chambre, user_id: user?.id, canViewEvents };
  const eventsForDay = (dateKey: string) => weekEvents.filter((e) => e.dates_event?.includes(dateKey) && eventVisibleFor(e, eventViewer));

  const invitesForDay = (dateKey: string) => myInvites.filter((i) => i.date_repas === dateKey);
  const optionLabelById = (id: string | null): string | null => {
    if (!id) return null;
    const so = serviceOptions.find((s) => (s.option as MealOptionCatalog | null)?.id === id);
    return (so?.option as MealOptionCatalog | null)?.label ?? null;
  };
  const deleteInvite = async (id: number) => {
    const res = await fetch("/api/invite-repas", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = await res.json();
    if (!res.ok) { toast.error(j.error || "Erreur."); return; }
    setMyInvites((prev) => prev.filter((x) => x.id !== id));
    toast.success("Invitation supprimée.");
  };

  // choix : "" = à renseigner (aucune ligne) · "non" = Non explicite · sinon l'id de l'option.
  const setChoice = async (dateKey: string, service: Service, choix: string) => {
    const res = await fetch("/api/presences-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateKey, service, choix }),
    });
    const j = await res.json();
    if (!res.ok) { toast.error(j.error || "Erreur."); return; }
    setPresences((prev) => {
      const others = prev.filter((p) => !(p.date === dateKey && p.service === service));
      if (!choix) return others;
      const option_id = choix === CHOIX_NON ? null : choix;
      return [...others, { id: `local-${dateKey}-${service}`, user_id: user?.id ?? "", date: dateKey, service, option_id, commentaire: null }];
    });
  };

  if (!accesSection) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );
  }

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

        {/* Navigation repas (admin) — même barre de pastilles que les écrans d'intendance */}
        {canRepas && <RepasNav />}

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
              const away = isAwayForMeal(absences, user?.id ?? "", dateKey);
              // Services encore ouverts et sans réponse : on le signale tant que le jour n'est pas verrouillé.
              const nbARenseigner = away || locked
                ? 0
                : SERVICES.filter((s) => openOptions(dateKey, s.value).length > 0 && selectionFor(dateKey, s.value) === "").length;
              return (
                <div key={dateKey} className={`bg-white rounded-2xl shadow-sm border-2 ${isToday ? "border-blue-400" : "border-transparent"} overflow-hidden`}>
                  <div className={`px-4 py-2 flex items-center justify-between ${isToday ? "bg-blue-600" : locked ? "bg-gray-100" : "bg-blue-50"}`}>
                    <span className={`text-sm font-bold ${isToday ? "text-white" : "text-blue-900"}`}>
                      {dayLabel(dateKey)}
                      {isToday && <span className="ml-2 text-xs font-normal opacity-80">Aujourd&apos;hui</span>}
                    </span>
                    {locked ? (
                      <span className="text-xs text-gray-500 font-medium flex items-center gap-1"><Lock className="w-3 h-3" /> Verrouillé</span>
                    ) : nbARenseigner > 0 ? (
                      <span className="text-[11px] font-semibold rounded-full bg-orange-100 text-orange-700 px-2 py-0.5">
                        {nbARenseigner === 2 ? "À renseigner" : "1 repas à renseigner"}
                      </span>
                    ) : null}
                  </div>

                  {dayEvents.length > 0 && (
                    <div className="px-4 pt-2 space-y-1">
                      {dayEvents.map((e) => (
                        <div key={e.id} className={`text-xs rounded-md px-2 py-1 border ${e.couleur || "border-gray-200 bg-gray-50"}`}>
                          <span className="font-medium text-gray-800">📌 {e.titre}</span>
                          {e.heures && <span className="text-gray-500"> · {e.heures}</span>}
                          {formatLieu(e.lieu) && <span className="text-gray-500"> · 📍 {formatLieu(e.lieu)}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="px-4 py-3 grid grid-cols-2 gap-3">
                    {SERVICES.map((s) => {
                      const opts = openOptions(dateKey, s.value);
                      const current = selectionFor(dateKey, s.value);
                      const selectable = opts.filter((o) => orderable(dateKey, o) || o.id === current);
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
                              <option value="">— À renseigner —</option>
                              <option value={CHOIX_NON}>Non</option>
                              {selectable.map((o) => (<option key={o.id} value={o.id}>{o.label}</option>))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {invitesForDay(dateKey).length > 0 && (
                    <div className="px-4 pb-3 -mt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-purple-500 mb-1">Mes invités</p>
                      <div className="space-y-1">
                        {invitesForDay(dateKey).map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between gap-2 text-xs bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5">
                            <span className="text-purple-800 truncate">👤 {inv.prenom} {inv.nom} · {inv.type_repas === "dejeuner" ? "Midi" : "Soir"}{optionLabelById(inv.option_id) ? ` · ${optionLabelById(inv.option_id)}` : ""}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => { setEditingInvite(inv); setIsInviteOpen(true); }} title="Modifier l'invitation" className="p-1 rounded text-blue-500 hover:bg-blue-50 cursor-pointer">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteInvite(inv.id)} title="Supprimer l'invitation" className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Inviter quelqu'un */}
        <div className="mt-8 flex justify-center">
          <button onClick={() => { setEditingInvite(null); setIsInviteOpen(true); }} className="flex items-center gap-2 bg-white border-2 border-blue-200 text-blue-700 rounded-2xl px-6 py-3 text-sm font-semibold shadow-sm hover:bg-blue-50 transition cursor-pointer">
            <UserPlus className="w-4 h-4" /> Inviter quelqu&apos;un
          </button>
        </div>

        <InviteModal isOpen={isInviteOpen} onClose={() => { setIsInviteOpen(false); setEditingInvite(null); }} onInvited={loadWeek} editing={editingInvite} />
      </div>
    </main>
  );
}
