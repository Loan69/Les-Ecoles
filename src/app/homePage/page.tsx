"use client";

import { useState, useEffect, useCallback } from "react";
import LogoutButton from "../components/logoutButton";
import ProfileButton from "../components/profileButton";
import AdministrationButton from "../components/administrationButton";
import Image from "next/image";
import { Bell, ChevronLeft, ChevronRight, Home, Moon, Calendar, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import InviteModal, { EditingInvite } from "../components/inviteModal";
import { useRouter } from "next/navigation";
import { CalendarEvent } from "@/types/CalendarEvent";
import { Residente } from "@/types/Residente";
import LoadingSpinner from "../components/LoadingSpinner";
import { Residence } from "@/types/Residence";
import { useSupabase } from "../providers";
import { User } from "@supabase/supabase-js";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import { formatLieu } from "@/lib/eventLieu";
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
  const [invitesRepas, setInvitesRepas] = useState<(EditingInvite & { option_label: string | null })[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingInvite, setEditingInvite] = useState<EditingInvite | null>(null);

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
      try {
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

        // --- Résumé « ma journée » : présence foyer + repas du jour (lecture seule) ---
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
      } catch (err) {
        console.error("Erreur chargement accueil :", err);
      } finally {
        setIsReady(true); // la page s'affiche même si une requête échoue
      }
    };
    fetchAllData();
  }, [user, currentDate, supabase]);

  // Invités repas du jour — chargement indépendant : ne bloque jamais l'affichage de la page.
  const loadInvites = useCallback(async () => {
    if (!user) return;
    const dateIso = formatDateKeyLocal(currentDate);
    const { data, error } = await supabase
      .from("invites_repas")
      .select("id, id_invite, nom, prenom, date_repas, type_repas, option_id, option:meal_options(label)")
      .eq("invite_par", user.id)
      .eq("date_repas", dateIso);
    if (error) {
      console.error("Erreur invités repas :", error);
      return;
    }
    setInvitesRepas(
      (data ?? []).map((r) => {
        const opt = r.option as unknown as { label?: string } | null;
        return { id: r.id, id_invite: r.id_invite, nom: r.nom, prenom: r.prenom, date_repas: r.date_repas, type_repas: r.type_repas, option_id: r.option_id, option_label: opt?.label ?? null };
      })
    );
  }, [user, currentDate, supabase]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const deleteInvite = async (id: number) => {
    const res = await fetch("/api/invite-repas", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = await res.json();
    if (!res.ok) { toast.error(j.error || "Erreur."); return; }
    setInvitesRepas((prev) => prev.filter((x) => x.id !== id));
    toast.success("Invitation supprimée.");
  };

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

  // Couleur de la résidence sélectionnée (jaune pour la 12, rose pour la 36).
  const is12 = selectedResidenceValue === "12";

  // Événements du jour SANS lieu résidence (ou lieu hors 12/36) : ils ne rentrent
  // pas dans la carte « Événements » d'une résidence → on les montre comme rappels « Aujourd'hui ».
  const RES_LIEUX = ["12", "36"];
  const todayOffsiteEvents = events.filter((event) => {
    const lieux = event.lieu || [];
    if (lieux.some((l) => RES_LIEUX.includes(l))) return false; // événement rattaché à une résidence → carte normale

    if (event.reserve_admin) {
      if (!profil?.is_admin) return false;
      if (event.reserve_admin !== "all" && event.reserve_admin !== profil?.residence) return false;
    }
    const exclusions: string[] = event.visibilite?.exclusions ?? [];
    if (user?.id && exclusions.includes(user.id)) return false;
    if (!profil?.residence) return event.visible_invites === true;

    const res: string[] = event.visibilite?.residence ?? [];
    const et: string[] = event.visibilite?.etage ?? [];
    const ch: string[] = event.visibilite?.chambre ?? [];
    if (res.length === 0 && et.length === 0 && ch.length === 0) return true; // aucun ciblage → visible pour tous
    return res.includes(profil.residence) || et.includes(profil.etage) || ch.includes(profil.chambre);
  });

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
        {(reminders.length > 0 || todayOffsiteEvents.length > 0) && (
          <div className="mb-4 space-y-1.5">
            {/* Événements du jour sans lieu résidence → rappel « Aujourd'hui » */}
            {todayOffsiteEvents.map((evt) => (
              <div
                key={`today-${evt.id}`}
                className="flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5"
              >
                <Bell className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />
                <span className="font-bold text-yellow-800 bg-yellow-100 rounded px-1.5 py-0.5 flex-shrink-0">Aujourd&apos;hui</span>
                <span className="text-yellow-800 font-medium truncate">{evt.titre}</span>
                {evt.heures && <span className="text-yellow-700/80 truncate">· {evt.heures}</span>}
                {formatLieu(evt.lieu) && <span className="text-yellow-700/80 truncate">· 📍 {formatLieu(evt.lieu)}</span>}
              </div>
            ))}
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

        {/* Intercalaires résidence — couleurs du logo (12 = jaune, 36 = rose) */}
        <div className="flex justify-center mb-4">
          {residences.map((res) => {
            const active = selectedResidenceValue === res.value;
            const activeColor =
              res.value === "12" ? "bg-yellow-400 border-yellow-400 text-amber-900" : "bg-pink-400 border-pink-400 text-white";
            return (
              <button
                key={res.value}
                onClick={() => {
                  setSelectedResidenceValue(res.value);
                  setSelectedResidenceLabel(res.label);
                }}
                className={`cursor-pointer flex items-center justify-center w-20 h-12 text-lg font-bold border rounded-t-xl transition-colors ${
                  active ? activeColor : "bg-white text-blue-800 border-gray-300 hover:bg-gray-100"
                }`}
              >
                {res.value}
              </button>
            );
          })}
        </div>

        {/* Carte ÉVÉNEMENTS — fond entièrement coloré à la couleur de la résidence (jaune/rose) */}
        <section className={`rounded-xl shadow-md border-2 p-4 mb-4 ${is12 ? "bg-yellow-100 border-yellow-300" : "bg-pink-100 border-pink-300"}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wide mb-3 ${is12 ? "text-amber-800" : "text-pink-800"}`}>Événements</h3>

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
                {formatLieu(e.lieu) && <p className="text-xs text-gray-500 mt-1">📍 {formatLieu(e.lieu)}</p>}
              </div>
            ))
          )}
        </section>

        {/* Carte REPAS du jour (lecture seule) */}
        <section className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-blue-800">Repas du jour</h3>
            <button
              onClick={() => router.push("/repasSemaine")}
              title="Modifier mes repas"
              className="p-1.5 rounded-full text-blue-600 hover:bg-blue-50 cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
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

          {invitesRepas.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-purple-500 mb-1">Mes invités</p>
              <div className="space-y-1">
                {invitesRepas.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-2 text-xs bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5">
                    <span className="text-purple-800 truncate">👤 {inv.prenom} {inv.nom} · {inv.type_repas === "dejeuner" ? "Midi" : "Soir"}{inv.option_label ? ` · ${inv.option_label}` : ""}</span>
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
        </section>
      </div>

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => { setIsInviteOpen(false); setEditingInvite(null); }}
        onInvited={loadInvites}
        editing={editingInvite}
      />
    </main>
  );
}
