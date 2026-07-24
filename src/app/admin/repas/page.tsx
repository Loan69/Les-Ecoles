"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useSupabase } from "@/app/providers";
import { CalendarDays, Scale, Soup, CalendarCheck, Table2 } from "lucide-react";
import TopBar from "@/app/components/TopBar";
import { Personne } from "@/types/Personne";
import { Repas } from "@/types/repas";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { InviteRepas } from "@/types/InviteRepas";
import { Residence } from "@/types/Residence";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import { PersonneDetail } from "@/lib/adminPeople";
import DetailTable, { DetailColumn } from "@/app/components/admin/DetailTable";
import DetailListModal from "@/app/components/admin/DetailListModal";

// --- Types ---
type ResidenteRow = Personne & { etage?: string | null; chambre?: string | null };

interface DayResidenceDetail {
  dejeuner: PersonneDetail[];
  diner: PersonneDetail[];
  plateau: PersonneDetail[];
  piqueNique: PersonneDetail[];
  special: { label: string; people: PersonneDetail[] }[];
}
type DayDetailMap = Record<string, DayResidenceDetail>;

interface UserCompta extends Personne {
  dejeuner: number;
  diner: number;
  total: number;
}
type ComptaByResidenceMap = Record<string, UserCompta[]>;

export default function AdminRepasView() {
  const { supabase } = useSupabase();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [repasData, setRepasData] = useState<Repas[]>([]);
  const [residentes, setResidentes] = useState<ResidenteRow[]>([]);
  const [invites, setInvites] = useState<InviteRepas[]>([]);
  const [loading, setLoading] = useState(true);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [optionLabels, setOptionLabels] = useState<Record<string, string>>({});

  const [tableOpen, setTableOpen] = useState(false);
  const [listModal, setListModal] = useState<{ title: string; people: PersonneDetail[] } | null>(null);

  // --- Helpers de date ---
  const formatDateFR = (dateString: string, short = false): string => {
    if (!dateString) return "";
    const date = parseDateKeyLocal(dateString);
    return date
      .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: short ? "short" : "long" })
      .replace(/^./, (c) => c.toUpperCase());
  };

  const formatColDay = (dateString: string): string =>
    parseDateKeyLocal(dateString)
      .toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })
      .replace(/^./, (c) => c.toUpperCase());

  const getNextDayStr = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  // Étiquette lisible d'un choix de repas (modèle actuel ; sera revu au Lot 2)
  const mealLabel = (choix?: string | null): string | null => {
    if (!choix) return null;
    const c = choix.toLowerCase();
    if (c.includes("non")) return null;
    if (c.startsWith("special:")) return choix.split(":")[2] || "Spécial";
    if (c.includes("plateau")) return "Plateau";
    if (c.includes("pn")) return "P.N.";
    if (c === "12" || c === "36" || c === "corail") return `Oui au ${choix}`;
    if (c === "oui") return "Oui";
    return choix;
  };

  const toDetail = useCallback(
    (p: ResidenteRow): PersonneDetail => ({
      id: p.user_id,
      nom: p.nom,
      prenom: p.prenom,
      residence: p.residence != null ? String(p.residence) : undefined,
      etage: p.etage,
      chambre: p.chambre ? optionLabels[p.chambre] ?? p.chambre : p.chambre,
      isInvite: false,
    }),
    [optionLabels]
  );

  // --- Initialisation période ---
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const savedStart = localStorage.getItem("startDate") || today;
    const endDateObj = new Date(savedStart);
    endDateObj.setDate(new Date(savedStart).getDate() + 7);
    setStartDate(savedStart);
    setEndDate(formatDateKeyLocal(endDateObj));
  }, []);

  // --- Fetch ---
  useEffect(() => {
    if (!startDate || !endDate) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const extraDayForPN = getNextDayStr(endDate);
        const [{ data: rData }, { data: resData }, { data: invData }, { data: residData }, { data: optionsData }] =
          await Promise.all([
            supabase.from("presences").select("*").gte("date_repas", startDate).lte("date_repas", extraDayForPN),
            supabase.from("residentes").select("*"),
            supabase.from("invites_repas").select("*").gte("date_repas", startDate).lte("date_repas", endDate),
            supabase.from("residences").select("*"),
            supabase.from("select_options_residence").select("value, label"),
          ]);
        setRepasData(rData || []);
        setResidentes(resData || []);
        setInvites(invData || []);
        setResidences(residData || []);
        const labels: Record<string, string> = {};
        (optionsData || []).forEach((o) => {
          if (o.value) labels[o.value] = o.label;
        });
        setOptionLabels(labels);
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    localStorage.setItem("startDate", startDate);
    localStorage.setItem("endDate", endDate);
  }, [startDate, endDate, supabase]);

  // --- Détail d'un jour : listes de personnes par résidence et catégorie ---
  const getDayDetail = (currentDate: string): DayDetailMap => {
    const summary: DayDetailMap = {};
    residences.forEach((r) => {
      summary[r.value] = { dejeuner: [], diner: [], plateau: [], piqueNique: [], special: [] };
    });
    const tomorrowStr = getNextDayStr(currentDate);

    repasData.forEach((r) => {
      const p = residentes.find((res) => res.user_id === r.user_id);
      if (!p) return;
      const person = toDetail(p);
      const choix = (r.choix_repas || "").toLowerCase();

      if (r.date_repas === currentDate) {
        if (choix.startsWith("special:")) {
          const [, residence, label] = choix.split(":");
          if (summary[residence]) {
            const opt = summary[residence].special.find((o) => o.label === label);
            if (opt) opt.people.push(person);
            else summary[residence].special.push({ label, people: [person] });
          }
        } else {
          const lieu =
            choix === "12" || choix === "36" || choix === "corail"
              ? choix
              : choix.includes("plateau")
              ? p.residence
              : null;
          if (lieu && summary[lieu]) {
            if (choix.includes("plateau")) summary[lieu].plateau.push(person);
            else if (r.type_repas === "dejeuner") summary[lieu].dejeuner.push(person);
            else if (r.type_repas === "diner") summary[lieu].diner.push(person);
          }
        }
      }

      if (r.date_repas === tomorrowStr && choix.includes("pn")) {
        const lieu = p.residence;
        if (lieu && summary[lieu]) summary[lieu].piqueNique.push(person);
      }
    });

    invites
      .filter((i) => i.date_repas === currentDate)
      .forEach((i) => {
        if (summary[i.lieu_repas]) {
          const person: PersonneDetail = {
            id: `invite-${i.id}`,
            nom: i.nom,
            prenom: i.prenom,
            residence: i.lieu_repas,
            isInvite: true,
          };
          if (i.type_repas === "dejeuner") summary[i.lieu_repas].dejeuner.push(person);
          if (i.type_repas === "diner") summary[i.lieu_repas].diner.push(person);
        }
      });

    return summary;
  };

  // --- Comptabilité par personne / résidence ---
  const comptaByResidence = useMemo<ComptaByResidenceMap>(() => {
    const compta: ComptaByResidenceMap = {};
    residences.forEach((r) => (compta[r.value] = []));
    residentes.forEach((p) => {
      const count = { dejeuner: 0, diner: 0 };
      repasData
        .filter((r) => r.user_id === p.user_id && r.date_repas <= endDate)
        .forEach((r) => {
          if (!r.choix_repas?.toLowerCase().includes("non")) {
            if (r.type_repas === "dejeuner") count.dejeuner++;
            if (r.type_repas === "diner") count.diner++;
          }
        });
      invites
        .filter((i) => i.invite_par === p.user_id)
        .forEach((i) => {
          if (i.type_repas === "dejeuner") count.dejeuner++;
          if (i.type_repas === "diner") count.diner++;
        });
      if (p.residence && compta[p.residence]) {
        compta[p.residence].push({ ...p, ...count, total: count.dejeuner + count.diner });
      }
    });
    return compta;
  }, [residences, residentes, repasData, invites, endDate]);

  const totauxParResidence = useMemo(() => {
    return residences.map((r) => {
      const personnes = comptaByResidence[r.value] || [];
      const totalDejeuners = personnes.reduce((acc, p) => acc + p.dejeuner, 0);
      const totalDiners = personnes.reduce((acc, p) => acc + p.diner, 0);
      return { label: r.label, value: r.value, totalDejeuners, totalDiners, totalRepas: totalDejeuners + totalDiners };
    });
  }, [residences, comptaByResidence]);

  const grandTotal = useMemo(
    () => ({
      dejeuners: totauxParResidence.reduce((acc, r) => acc + r.totalDejeuners, 0),
      diners: totauxParResidence.reduce((acc, r) => acc + r.totalDiners, 0),
      repas: totauxParResidence.reduce((acc, r) => acc + r.totalRepas, 0),
    }),
    [totauxParResidence]
  );

  const daysInRange = useMemo(() => {
    if (!startDate) return [];
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [startDate]);

  const residentesDetail = useMemo<PersonneDetail[]>(() => residentes.map(toDetail), [residentes, toDetail]);

  const openList = (title: string, people: PersonneDetail[]) => setListModal({ title, people });

  // Une tuile de comptage cliquable → liste des personnes comptées
  const tile = (label: string, people: PersonneDetail[], title: string, cls: string, span2 = false) => (
    <button
      onClick={() => openList(title, people)}
      className={`${span2 ? "col-span-2" : ""} flex flex-col items-center rounded-xl p-2 transition cursor-pointer ${cls}`}
      title="Voir la liste"
    >
      <span className="text-[10px] font-bold uppercase leading-tight text-center">{label}</span>
      <span className="text-lg font-black">{people.length}</span>
    </button>
  );

  if (loading)
    return (
      <main className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </main>
    );

  // Colonnes du tableau de détail : 2 par jour (déjeuner / dîner)
  const tableColumns: DetailColumn[] = daysInRange.flatMap((d) => [
    { key: `${d}|dejeuner`, label: formatColDay(d), sublabel: "Déj" },
    { key: `${d}|diner`, label: formatColDay(d), sublabel: "Dîner" },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-white py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <TopBar />
        <h1 className="text-3xl font-bold text-amber-800 text-center mb-10">Inscriptions aux repas</h1>

        <Tabs defaultValue="sum" className="w-full">
          <div className="flex justify-center w-full mb-10">
            <TabsList className="inline-flex items-center justify-center bg-orange-100/50 p-2 rounded-3xl shadow-inner h-20 sm:h-24 w-full max-w-2xl">
              <TabsTrigger
                value="sum"
                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-lg sm:text-xl font-bold transition-all duration-300 text-orange-900/60 data-[state=active]:bg-white data-[state=active]:text-orange-800 data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-white/50"
              >
                <Soup className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
                <span>Inscriptions</span>
              </TabsTrigger>
              <TabsTrigger
                value="compta"
                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-lg sm:text-xl font-bold transition-all duration-300 text-orange-900/60 data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-amber-500/20"
              >
                <Scale className="w-6 h-6 sm:w-8 sm:h-8" />
                <span>Comptabilité</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Filtre période */}
          <div className="flex justify-center items-center gap-3 mb-8">
            <CalendarDays className="text-amber-600" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-amber-300 rounded-lg px-3 py-1 text-black" />
            <span>→</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-amber-300 rounded-lg px-3 py-1 text-black" />
          </div>

          {/* Onglet INSCRIPTIONS : jours empilés + nombres cliquables + tableau de détail */}
          <TabsContent value="sum" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                <CalendarCheck className="text-orange-600" /> Planning
              </h2>
              <button
                onClick={() => setTableOpen(true)}
                className="flex items-center gap-1 border border-amber-600 text-amber-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-50 cursor-pointer"
              >
                <Table2 className="w-4 h-4" /> Voir le détail
              </button>
            </div>

            <div className="space-y-3">
              {daysInRange.map((date) => {
                const detail = getDayDetail(date);
                return (
                  <div key={date} className="rounded-2xl border-2 border-gray-100 bg-white shadow-sm p-4">
                    <p className="text-sm font-bold text-orange-900 uppercase tracking-wide mb-3">{formatDateFR(date)}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {residences.map((res) => {
                        const d = detail[res.value];
                        const total =
                          d.dejeuner.length + d.diner.length + d.plateau.length + d.piqueNique.length + d.special.reduce((s, o) => s + o.people.length, 0);
                        return (
                          <div key={res.value} className="border border-gray-100 rounded-xl p-3">
                            <p className="font-bold text-gray-700 text-sm uppercase mb-2">{res.label}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {tile("Midi", d.dejeuner, `Midi — ${res.label} · ${formatDateFR(date)}`, "bg-orange-50 hover:bg-orange-100 text-orange-900")}
                              {tile("Soir", d.diner, `Soir — ${res.label} · ${formatDateFR(date)}`, "bg-blue-50 hover:bg-blue-100 text-blue-900")}
                              {tile("P.N. (lendemain)", d.piqueNique, `Pique-niques — ${res.label} · ${formatDateFR(date)}`, "bg-purple-50 hover:bg-purple-100 text-purple-900")}
                              {tile("Plateau", d.plateau, `Plateaux — ${res.label} · ${formatDateFR(date)}`, "bg-emerald-50 hover:bg-emerald-100 text-emerald-900")}
                              {d.special.map((opt) =>
                                tile(opt.label, opt.people, `${opt.label} — ${res.label} · ${formatDateFR(date)}`, "bg-amber-50 hover:bg-amber-100 text-amber-900", true)
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-right">
                              Total jour : <span className="font-bold text-orange-800">{total}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Onglet COMPTABILITÉ (inchangé) */}
          <TabsContent value="compta">
            <div className="space-y-10">
              <div className="mt-2">
                <h2 className="text-2xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
                  <Scale className="text-amber-600" /> Récapitulatif de la période
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {totauxParResidence.map((r) => (
                    <div key={r.value} className="relative overflow-hidden rounded-2xl bg-white border border-amber-100 shadow-sm p-5">
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-l-2xl" />
                      <div className="pl-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">{r.label}</p>
                        <div className="flex items-end justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>
                              <span className="text-sm text-gray-500">Déjeuners</span>
                              <span className="text-sm font-bold text-orange-800 ml-auto">{r.totalDejeuners}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                              <span className="text-sm text-gray-500">Dîners</span>
                              <span className="text-sm font-bold text-blue-800 ml-auto">{r.totalDiners}</span>
                            </div>
                          </div>
                          <div className="text-right ml-6">
                            <p className="text-2xl font-black text-amber-800 leading-none">{r.totalRepas}</p>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-1">repas total</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 p-5 flex items-center justify-between shadow-md">
                  <div>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Toutes résidences</p>
                    <p className="text-white text-lg font-semibold">
                      {grandTotal.dejeuners} déjeuners · {grandTotal.diners} dîners
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-white leading-none">{grandTotal.repas}</p>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wide mt-1">repas au total</p>
                  </div>
                </div>
              </div>

              {residences.map((r) => (
                <div key={r.value} className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-amber-800 mb-4">Comptabilité - {r.label}</h3>
                  <table className="min-w-full border text-sm bg-white">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 font-semibold">Nom</th>
                        <th className="text-center p-2 font-semibold">Déjeuners</th>
                        <th className="text-center p-2 font-semibold">Dîners</th>
                        <th className="text-center p-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comptaByResidence[r.value]?.sort((a, b) => a.nom.localeCompare(b.nom)).map((p, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">{p.nom} {p.prenom}</td>
                          <td className="text-center p-2">{p.dejeuner}</td>
                          <td className="text-center p-2">{p.diner}</td>
                          <td className="text-center p-2 font-semibold text-amber-800">{p.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Tableau de détail (loupe unique) — mêmes structure et classement que les présences */}
      <Dialog open={tableOpen} onOpenChange={() => setTableOpen(false)}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détail des repas — période</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 mb-3">Repas choisi par personne et par service.</p>
          <DetailTable
            people={residentesDetail}
            columns={tableColumns}
            renderCell={(p, key) => {
              const [date, service] = key.split("|");
              const r = repasData.find((x) => x.user_id === p.id && x.date_repas === date && x.type_repas === service);
              const label = mealLabel(r?.choix_repas);
              return label ? (
                <span className="text-green-700 whitespace-nowrap">{label}</span>
              ) : (
                <span className="text-red-600 font-semibold">Non</span>
              );
            }}
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
    </div>
  );
}
