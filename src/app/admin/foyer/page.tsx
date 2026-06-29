"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSupabase } from "@/app/providers";
import { CalendarDays, Search, Home, Moon, Plus } from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { Residence } from "@/types/Residence";
import { Absence } from "@/types/Absence";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import AbsenceAdminModal, { FoyerPersonne, MarquagePayload } from "@/app/components/admin/AbsenceAdminModal";

function formatJourCourt(dateKey: string): string {
  return parseDateKeyLocal(dateKey)
    .toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
    .replace(/^./, (c) => c.toUpperCase());
}

function formatJourLong(dateKey: string): string {
  return parseDateKeyLocal(dateKey)
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/^./, (c) => c.toUpperCase());
}

export default function AdminFoyerView() {
  const { supabase } = useSupabase();
  const [people, setPeople] = useState<FoyerPersonne[]>([]);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Popup détail (jour + résidence) et modale d'ajout
  const [openDetail, setOpenDetail] = useState<{ date: string; residence: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  // --- Période par défaut : aujourd'hui → +7 jours ---
  useEffect(() => {
    const today = formatDateKeyLocal(new Date());
    const saved = localStorage.getItem("startDate") || today;
    const end = new Date(parseDateKeyLocal(saved));
    end.setDate(end.getDate() + 7);
    setStartDate(saved);
    setEndDate(formatDateKeyLocal(end));
  }, []);

  // --- Chargement des données ---
  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);

    const [{ data: residencesData }, { data: residentesData }, { data: inviteesData }] =
      await Promise.all([
        supabase.from("residences").select("label, value").neq("value", "corail").order("label"),
        supabase.from("residentes").select("user_id, nom, prenom, residence").neq("nom", "Admin"),
        supabase.from("invitees").select("user_id, nom, prenom, residence"),
      ]);

    setResidences(residencesData || []);
    setPeople([
      ...(residentesData?.map((r) => ({ ...r, type: "Résidente" as const })) || []),
      ...(inviteesData?.map((i) => ({ ...i, type: "Invitée" as const })) || []),
    ]);

    const res = await fetch(`/api/admin/absences?start=${startDate}&end=${endDate}`);
    const result = await res.json();
    if (res.ok) {
      setAbsences(result.absences ?? []);
    } else {
      console.error(result.error);
      toast.error("Impossible de charger les absences.");
    }

    setLoading(false);
  }, [startDate, endDate, supabase]);

  useEffect(() => {
    fetchData();
    if (startDate) localStorage.setItem("startDate", startDate);
  }, [fetchData, startDate]);

  // --- Jours de la période (bornes incluses) ---
  const daysInRange = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return [];
    const days: string[] = [];
    const cursor = parseDateKeyLocal(startDate);
    const end = parseDateKeyLocal(endDate);
    while (cursor <= end) {
      days.push(formatDateKeyLocal(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [startDate, endDate]);

  // Renvoie l'ensemble des user_id absents à une date donnée.
  const absentIdsOn = useCallback(
    (dateKey: string) =>
      new Set(
        absences
          .filter((a) => a.date_debut <= dateKey && a.date_fin >= dateKey)
          .map((a) => a.user_id)
      ),
    [absences]
  );

  // --- Marquage (création absence ou forçage présence) ---
  const handleSubmit = async (payload: MarquagePayload) => {
    const res = await fetch("/api/admin/absences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || "Erreur lors de l'enregistrement.");
      return;
    }
    toast.success(payload.mode === "absent" ? "Absence enregistrée." : "Présence rétablie.");
    await fetchData();
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );
  }

  const detailPeople = openDetail
    ? people
        .filter((p) => p.residence?.toString() === openDetail.residence)
        .filter(
          (p) =>
            !search ||
            p.nom.toLowerCase().includes(search.toLowerCase()) ||
            p.prenom.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => a.nom.localeCompare(b.nom))
    : [];
  const detailAbsentIds = openDetail ? absentIdsOn(openDetail.date) : new Set<string>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Présences au foyer</h1>
          <p className="text-gray-600">Qui est au foyer ou sortie, par résidence, sur la période choisie.</p>
        </div>

        {/* Période + ajout */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 mb-10">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-blue-600" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-blue-300 rounded-lg px-3 py-1 text-black"
            />
            <span>→</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-blue-300 rounded-lg px-3 py-1 text-black"
            />
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-900 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Ajouter une absence
          </button>
        </div>

        {/* Cartes par jour */}
        {daysInRange.length === 0 ? (
          <p className="text-center text-gray-500 italic">Période invalide.</p>
        ) : (
          <div className="overflow-x-auto pb-6">
            <div className="flex gap-6 min-w-max">
              {daysInRange.map((date) => {
                const absentIds = absentIdsOn(date);
                const estAujourdhui = date === formatDateKeyLocal(new Date());
                return (
                  <div
                    key={date}
                    className={`w-64 rounded-3xl border-2 transition-all ${
                      estAujourdhui
                        ? "bg-blue-50 border-blue-300 shadow-md ring-2 ring-blue-200 ring-offset-2"
                        : "bg-white border-gray-100 shadow-sm"
                    }`}
                  >
                    <div className={`p-4 rounded-t-[22px] border-b text-center ${estAujourdhui ? "bg-blue-100/50" : "bg-gray-50/50"}`}>
                      <p className="text-sm font-bold text-blue-900 uppercase tracking-wider">{formatJourCourt(date)}</p>
                    </div>

                    <div className="p-5 space-y-5">
                      {residences.map((res) => {
                        const total = people.filter((p) => p.residence?.toString() === res.value);
                        const absentes = total.filter((p) => absentIds.has(p.user_id)).length;
                        const presentes = total.length - absentes;
                        return (
                          <div key={res.value}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-1 h-4 bg-blue-400 rounded-full" />
                              <p className="font-bold text-gray-700 text-sm uppercase">{res.label}</p>
                              <button
                                onClick={() => {
                                  setSearch("");
                                  setOpenDetail({ date, residence: res.value });
                                }}
                                className="ml-auto px-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-transform hover:scale-110 cursor-pointer"
                                title="Voir le détail"
                              >
                                <Search className="text-blue-600 w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-green-50 p-2 rounded-xl flex flex-col items-center">
                                <span className="text-[10px] text-green-700 font-bold uppercase">Au foyer</span>
                                <span className="text-lg font-black text-green-800">{presentes}</span>
                              </div>
                              <div className="bg-red-50 p-2 rounded-xl flex flex-col items-center">
                                <span className="text-[10px] text-red-700 font-bold uppercase">Sorties</span>
                                <span className="text-lg font-black text-red-800">{absentes}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Popup détail jour + résidence */}
      <Dialog open={!!openDetail} onOpenChange={() => setOpenDetail(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {openDetail && `${formatJourLong(openDetail.date)} — Résidence ${openDetail.residence}`}
            </DialogTitle>
          </DialogHeader>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher une habitante…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 outline-none"
            />
          </div>

          {detailPeople.length === 0 ? (
            <p className="text-gray-500 italic text-sm">Aucune habitante.</p>
          ) : (
            <ul className="space-y-2">
              {detailPeople.map((p) => {
                const absente = detailAbsentIds.has(p.user_id);
                return (
                  <li key={p.user_id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm">
                    <span className="text-sm text-gray-800">
                      {p.nom} {p.prenom}
                      {p.type === "Invitée" && <span className="ml-1 text-[10px] text-blue-500">(invitée)</span>}
                    </span>
                    {absente ? (
                      <span className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full flex items-center gap-1">
                        <Moon className="w-3 h-3" /> sortie
                      </span>
                    ) : (
                      <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                        <Home className="w-3 h-3" /> au foyer
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <AbsenceAdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        people={people}
        residences={residences}
        onSubmit={handleSubmit}
        defaultResidence={openDetail?.residence}
      />
    </div>
  );
}
