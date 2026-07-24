"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSupabase } from "@/app/providers";
import { CalendarDays, Home, Moon, Plus, Table2 } from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { Residence } from "@/types/Residence";
import { Absence } from "@/types/Absence";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import { PersonneDetail } from "@/lib/adminPeople";
import AbsenceAdminModal, { MarquagePayload } from "@/app/components/admin/AbsenceAdminModal";
import DetailTable, { DetailColumn } from "@/app/components/admin/DetailTable";
import DetailListModal from "@/app/components/admin/DetailListModal";
import { useMyRights } from "@/lib/useMyRights";

function formatJourLong(dateKey: string): string {
  return parseDateKeyLocal(dateKey)
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/^./, (c) => c.toUpperCase());
}

function formatColDay(dateKey: string): string {
  return parseDateKeyLocal(dateKey)
    .toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
}

export default function AdminFoyerView() {
  const { supabase } = useSupabase();
  const [people, setPeople] = useState<PersonneDetail[]>([]);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { canEdit } = useMyRights();
  const [modalOpen, setModalOpen] = useState(false); // ajout absence
  const [tableOpen, setTableOpen] = useState(false); // tableau de détail (loupe unique)
  const [listModal, setListModal] = useState<{ title: string; people: PersonneDetail[] } | null>(null);

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

    const [{ data: residencesData }, { data: residentesData }, { data: inviteesData }, { data: optionsData }] =
      await Promise.all([
        supabase.from("residences").select("label, value").neq("value", "corail").order("label"),
        supabase.from("residentes").select("user_id, nom, prenom, residence, etage, chambre").eq("statut", "active").eq("is_technique", false),
        supabase.from("invitees").select("user_id, nom, prenom, residence"),
        supabase.from("select_options_residence").select("value, label"),
      ]);

    // Code chambre/étage → libellé lisible (ex. "grand_palais" → "Grand Palais")
    const optionLabels: Record<string, string> = {};
    (optionsData || []).forEach((o) => {
      if (o.value) optionLabels[o.value] = o.label;
    });

    setResidences(residencesData || []);
    setPeople([
      ...(residentesData?.map((r) => ({
        id: r.user_id,
        nom: r.nom,
        prenom: r.prenom,
        residence: r.residence != null ? String(r.residence) : undefined,
        etage: r.etage,
        chambre: r.chambre ? optionLabels[r.chambre] ?? r.chambre : r.chambre,
        isInvite: false,
      })) || []),
      ...(inviteesData?.map((i) => ({
        id: i.user_id,
        nom: i.nom,
        prenom: i.prenom,
        residence: i.residence != null ? String(i.residence) : undefined,
        isInvite: true,
      })) || []),
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

  const isAbsentOn = useCallback(
    (personId: string, dateKey: string) =>
      absences.some((a) => a.user_id === personId && a.date_debut <= dateKey && a.date_fin >= dateKey),
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

  const tableColumns: DetailColumn[] = daysInRange.map((d) => ({ key: d, label: formatColDay(d) }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Présences au foyer</h1>
          <p className="text-gray-600">Qui est au foyer ou sortie, par résidence, jour par jour.</p>
        </div>

        {/* Période + actions */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 mb-8">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTableOpen(true)}
              className="flex items-center gap-1 border border-blue-700 text-blue-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-50 cursor-pointer"
            >
              <Table2 className="w-4 h-4" /> Voir le détail
            </button>
            {canEdit && (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1 bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-900 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Ajouter une absence
              </button>
            )}
          </div>
        </div>

        {/* Jours empilés verticalement */}
        {daysInRange.length === 0 ? (
          <p className="text-center text-gray-500 italic">Période invalide.</p>
        ) : (
          <div className="space-y-3">
            {daysInRange.map((date) => {
              const estAujourdhui = date === formatDateKeyLocal(new Date());
              return (
                <div
                  key={date}
                  className={`rounded-2xl border-2 p-4 ${
                    estAujourdhui ? "bg-blue-50 border-blue-300" : "bg-white border-gray-100 shadow-sm"
                  }`}
                >
                  <p className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-3">{formatJourLong(date)}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {residences.map((res) => {
                      const inRes = people.filter((p) => p.residence === res.value);
                      const absent = inRes.filter((p) => isAbsentOn(p.id, date));
                      const present = inRes.filter((p) => !isAbsentOn(p.id, date));
                      return (
                        <div key={res.value} className="border border-gray-100 rounded-xl p-3">
                          <p className="text-sm font-bold text-gray-700 uppercase mb-2">{res.label}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                setListModal({
                                  title: `Au foyer — ${res.label} · ${formatJourLong(date)}`,
                                  people: present,
                                })
                              }
                              className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-800 rounded-xl py-2 transition cursor-pointer"
                              title="Voir la liste"
                            >
                              <Home className="w-4 h-4" />
                              <span className="text-lg font-black">{present.length}</span>
                              <span className="text-xs font-medium">au foyer</span>
                            </button>
                            <button
                              onClick={() =>
                                setListModal({
                                  title: `Sorties — ${res.label} · ${formatJourLong(date)}`,
                                  people: absent,
                                })
                              }
                              className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-800 rounded-xl py-2 transition cursor-pointer"
                              title="Voir la liste"
                            >
                              <Moon className="w-4 h-4" />
                              <span className="text-lg font-black">{absent.length}</span>
                              <span className="text-xs font-medium">sorties</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tableau de détail (loupe unique) */}
      <Dialog open={tableOpen} onOpenChange={() => setTableOpen(false)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détail des présences — période</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 mb-3">
            <span className="font-bold text-green-600">P</span> = au foyer ·{" "}
            <span className="font-bold text-red-600">A</span> = sortie
          </p>
          <DetailTable
            people={people}
            columns={tableColumns}
            renderCell={(p, dayKey) =>
              isAbsentOn(p.id, dayKey) ? (
                <span className="font-bold text-red-600" title="Sortie">A</span>
              ) : (
                <span className="font-bold text-green-600" title="Au foyer">P</span>
              )
            }
          />
        </DialogContent>
      </Dialog>

      {/* Liste derrière un nombre */}
      <DetailListModal
        open={!!listModal}
        onClose={() => setListModal(null)}
        title={listModal?.title ?? ""}
        people={listModal?.people ?? []}
      />

      <AbsenceAdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        people={people}
        residences={residences}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
