"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSupabase } from "@/app/providers";
import { CalendarDays, Home, Moon, Plus, Table2, Download } from "lucide-react";
import { toast } from "sonner";
import { AdminDaysSkeleton } from "@/app/components/Skeleton";
import { labelResidenceDefaut } from "@/lib/residences";
import { Absence } from "@/types/Absence";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import { PersonneAdmin, sortAdminPeople, estCompteActive } from "@/lib/adminPeople";
import { downloadCSV } from "@/lib/csvExport";
import AbsenceAdminModal, { MarquagePayload } from "@/app/components/admin/AbsenceAdminModal";
import DetailTable, { DetailColumn } from "@/app/components/admin/DetailTable";
import DetailListModal from "@/app/components/admin/DetailListModal";
import AbsenceEditModal from "@/app/components/admin/AbsenceEditModal";
import FoyerLockSettings from "@/app/components/admin/FoyerLockSettings";
import { useMyRights } from "@/lib/useMyRights";
import { useResidences } from "@/lib/useResidences";
import TopBar from "@/app/components/TopBar";

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
  const [allPeople, setAllPeople] = useState<PersonneAdmin[]>([]);
  // Un encadré par bloc du foyer (Résidence 12, Résidence 36, Corail…) : la liste vient
  // de la table `residences`, un bloc ajouté depuis l'Administration apparaît ici aussitôt.
  const { residences, labelEtage, ordreStructure } = useResidences();
  // La présence au foyer, c'est « qui dort ici cette nuit ». Un bloc d'intendance
  // regroupe des personnes qui travaillent au foyer sans y loger : la question n'a pas
  // de sens pour elles, on n'affiche donc que les blocs d'habitation (R-RES-02, R-RES-06).
  const blocsHabitation = useMemo(() => residences.filter((r) => r.kind === "chambre"), [residences]);
  const blocsPostes = useMemo(() => new Set(residences.filter((r) => r.kind === "poste").map((r) => r.value)), [residences]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const canEdit = useMyRights().canEdit("absences");
  const [modalOpen, setModalOpen] = useState(false); // ajout absence
  const [tableOpen, setTableOpen] = useState(false); // tableau de détail (loupe unique)
  // Contexte de la popup (people calculés en direct depuis les données).
  const [listModal, setListModal] = useState<{ date: string; residence: string; residenceLabel: string; kind: "present" | "absent"; title: string } | null>(null);

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

    const [{ data: residentesData }, { data: inviteesData }, { data: optionsData }, { data: placesData }] =
      await Promise.all([
        // Tous les comptes (archivés compris, hors compte technique jamais listé) : ceux qui
        // ne sont pas activés sortent des listes via `horsSuivi`, mais restent visibles les
        // jours où ils ont une absence déclarée — l'historique n'est pas réécrit (R-ADM-02).
        supabase.from("residentes").select("user_id, nom, prenom, residence, etage, chambre, place_id, statut, niveau_absences").eq("is_technique", false),
        supabase.from("invitees").select("user_id, nom, prenom, residence"),
        supabase.from("select_options_residence").select("value, label"),
        supabase.from("places").select("id, label, residence, etage"),
      ]);

    // Code chambre/étage → libellé lisible (ex. "grand_palais" → "Grand Palais")
    const optionLabels: Record<string, string> = {};
    (optionsData || []).forEach((o) => {
      if (o.value) optionLabels[o.value] = o.label;
    });
    // Libellé de chambre propre depuis `places` (source de vérité), via place_id :
    // residentes.chambre peut contenir un code brut legacy (« r36_etage6_la_rochelle »).
    const placeLabels: Record<string, string> = {};
    // Étage et bloc viennent eux aussi de la place : `residentes.etage` est une copie
    // héritée qui peut avoir dérivé (un « r12_etage3 » face au « 3 » de la place), ce qui
    // sortait la personne du classement par étage et affichait sa clé technique.
    const placeById: Record<string, { residence: string; etage: string | null }> = {};
    (placesData || []).forEach((p) => {
      if (!p.id) return;
      if (p.label) placeLabels[p.id] = p.label;
      placeById[p.id] = { residence: String(p.residence), etage: p.etage };
    });

    setAllPeople([
      ...(residentesData?.map((r) => ({
        id: r.user_id,
        nom: r.nom,
        prenom: r.prenom,
        residence: (r.place_id && placeById[r.place_id]?.residence) || (r.residence != null ? String(r.residence) : undefined),
        etage: (r.place_id && placeById[r.place_id]?.etage) || r.etage,
        chambre: (r.place_id && placeLabels[r.place_id]) || (r.chambre ? optionLabels[r.chambre] ?? r.chambre : r.chambre),
        isInvite: false,
        // Hors du suivi si le compte n'est pas activé (R-ADM-02) ou si Absences = Masquée
        // (R-NIV-11). La règle des blocs d'intendance s'ajoute au rendu, où la liste des
        // blocs est disponible — elle arrive après ce chargement.
        horsSuivi: !estCompteActive(r) || Number(r.niveau_absences ?? 1) === 0,
      })) || []),
      ...(inviteesData?.map((i) => ({
        id: i.user_id,
        nom: i.nom,
        prenom: i.prenom,
        residence: i.residence != null ? String(i.residence) : undefined,
        isInvite: true,
        horsSuivi: true, // invitée : compte hors gestion des chambres, jamais dans les listes (R-ADM-02)
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

  // Personnes affichées : les comptes activés suivant les absences, PLUS ceux qui en sont
  // hors (départ, invitée, Absences = Aucun) mais gardent une absence déclarée sur la
  // période — on ne réécrit pas l'historique.
  // Quelqu'un d'un bloc d'intendance ne dort pas au foyer : la présence de nuit ne le
  // concerne pas. Même traitement que les autres cas « hors suivi ».
  const horsPresences = useCallback(
    (p: PersonneAdmin) => p.horsSuivi || blocsPostes.has(p.residence ?? ""),
    [blocsPostes]
  );

  const people = useMemo(
    () => allPeople.filter((p) => !horsPresences(p) || absences.some((a) => a.user_id === p.id)),
    [allPeople, absences, horsPresences]
  );

  // Comptes activés seuls : vivier pour enregistrer une NOUVELLE absence (R-ADM-02).
  const peopleActives = useMemo(() => allPeople.filter((p) => !horsPresences(p)), [allPeople, horsPresences]);

  // Blocs affichés : ceux du foyer, PLUS tout rattachement rencontré dans les données qui
  // n'y figure pas (bloc désactivé, compte sans bloc). Personne ne disparaît d'un décompte
  // faute d'encadré où la ranger.
  const blocsAffiches = useMemo(() => {
    const list = [...blocsHabitation];
    const connus = new Set(residences.map((r) => r.value));
    people.forEach((p) => {
      const v = p.residence ?? "";
      if (connus.has(v)) return;
      connus.add(v);
      list.push({
        value: v,
        label: v ? `${labelResidenceDefaut(v)} (hors foyer)` : "Sans bloc",
        kind: "chambre", ordre: 900, couleur: "blue", is_active: false,
      });
    });
    return list;
  }, [residences, blocsHabitation, people]);

  const isAbsentOn = useCallback(
    (personId: string, dateKey: string) =>
      absences.some((a) => a.user_id === personId && a.date_debut <= dateKey && a.date_fin >= dateKey),
    [absences]
  );

  // Une personne hors suivi n'apparaît QUE les jours couverts par son absence : elle ne doit
  // jamais gonfler le compteur « au foyer » d'un jour où elle n'habite plus là.
  const visibleOn = useCallback(
    (p: PersonneAdmin, dateKey: string) => !horsPresences(p) || isAbsentOn(p.id, dateKey),
    [isAbsentOn, horsPresences]
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
    return <AdminDaysSkeleton tone="blue" withLockCard days={4} />;
  }

  const tableColumns: DetailColumn[] = daysInRange.map((d) => ({ key: d, label: formatColDay(d) }));

  const exportDetail = () => {
    const header = ["Résidence", "Étage", "Nom", "Prénom", ...tableColumns.map((c) => c.label)];
    const rows: (string | number)[][] = [header];
    sortAdminPeople(people, ordreStructure).forEach((p) => {
      const cells = tableColumns.map((c) => (!visibleOn(p, c.key) ? "" : isAbsentOn(p.id, c.key) ? "Sortie" : "Au foyer"));
      rows.push([p.residence ?? "", labelEtage(p.etage) ?? "", p.nom, p.prenom, ...cells]);
    });
    downloadCSV(`presences_${startDate}_${endDate}.csv`, rows);
  };

  // Popup : personnes de la liste courante + personnes du statut opposé (pour l'ajout).
  const inModalRes = listModal ? people.filter((p) => p.residence === listModal.residence && visibleOn(p, listModal.date)) : [];
  const modalPeople = listModal ? inModalRes.filter((p) => (listModal.kind === "absent" ? isAbsentOn(p.id, listModal.date) : !isAbsentOn(p.id, listModal.date))) : [];
  const modalAddable = listModal ? inModalRes.filter((p) => (listModal.kind === "absent" ? !isAbsentOn(p.id, listModal.date) : isAbsentOn(p.id, listModal.date))) : [];

  // Bascule présence/absence d'une personne pour UN jour (via l'API absences).
  const setAbsentOnDay = async (userId: string, absent: boolean) => {
    if (!listModal) return;
    const res = await fetch("/api/admin/absences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: absent ? "absent" : "present", user_id: userId, date_debut: listModal.date, date_fin: listModal.date }),
    });
    const j = await res.json();
    if (!res.ok) { toast.error(j.error || "Erreur."); return; }
    await fetchData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <TopBar />
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Présences au foyer</h1>
          <p className="text-gray-600">Qui est au foyer ou sortie, par résidence, jour par jour.</p>
        </div>

        <FoyerLockSettings />

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
                    {blocsAffiches.map((res) => {
                      const inRes = people.filter((p) => p.residence === res.value && visibleOn(p, date));
                      const absent = inRes.filter((p) => isAbsentOn(p.id, date));
                      const present = inRes.filter((p) => !isAbsentOn(p.id, date));
                      return (
                        <div key={res.value} className="border border-gray-100 rounded-xl p-3">
                          <p className="text-sm font-bold text-gray-700 uppercase mb-2">{res.label}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                setListModal({
                                  date, residence: res.value, residenceLabel: res.label, kind: "present",
                                  title: `Au foyer — ${res.label} · ${formatJourLong(date)}`,
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
                                  date, residence: res.value, residenceLabel: res.label, kind: "absent",
                                  title: `Sorties — ${res.label} · ${formatJourLong(date)}`,
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
        <DialogContent className="sm:max-w-6xl lg:max-w-[92vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-8">
              <DialogTitle>Détail des présences — période</DialogTitle>
              <button onClick={exportDetail} className="flex items-center gap-1 border border-blue-600 text-blue-700 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-50 cursor-pointer shrink-0">
                <Download className="w-4 h-4" /> Exporter (CSV)
              </button>
            </div>
          </DialogHeader>
          <p className="text-xs text-gray-500 mb-3">
            <span className="font-bold text-green-600">P</span> = au foyer ·{" "}
            <span className="font-bold text-red-600">A</span> = sortie
          </p>
          <DetailTable
            people={people}
            columns={tableColumns}
            renderCell={(p, dayKey) =>
              !visibleOn(p, dayKey) ? (
                <span className="text-gray-300" title="Hors foyer à cette date">—</span>
              ) : isAbsentOn(p.id, dayKey) ? (
                <span className="font-bold text-red-600" title="Sortie">A</span>
              ) : (
                <span className="font-bold text-green-600" title="Au foyer">P</span>
              )
            }
          />
        </DialogContent>
      </Dialog>

      {/* Liste derrière un nombre — éditable (section Absences ≥ Édition) ou lecture seule */}
      {canEdit ? (
        <AbsenceEditModal
          open={!!listModal}
          onClose={() => setListModal(null)}
          title={listModal?.title ?? ""}
          kind={listModal?.kind ?? "present"}
          people={modalPeople}
          addable={modalAddable}
          onSet={setAbsentOnDay}
        />
      ) : (
        <DetailListModal
          open={!!listModal}
          onClose={() => setListModal(null)}
          title={listModal?.title ?? ""}
          people={modalPeople}
        />
      )}

      <AbsenceAdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        people={peopleActives}
        residences={blocsHabitation}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
