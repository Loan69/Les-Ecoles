"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSupabase } from "@/app/providers";
import { CalendarDays, Table2, Scale, Soup, Moon as MoonIcon, CalendarCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { Residence } from "@/types/Residence";
import { Absence } from "@/types/Absence";
import { PresenceV2, MealOptionCatalog, Service } from "@/types/MealOption";
import { PersonneDetail, sortAdminPeople, formatEtage } from "@/lib/adminPeople";
import { isAwayForMeal } from "@/lib/mealCompta";
import { downloadCSV } from "@/lib/csvExport";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import DetailTable, { DetailColumn } from "@/app/components/admin/DetailTable";
import DetailListModal from "@/app/components/admin/DetailListModal";

function formatJourLong(dateKey: string): string {
  return parseDateKeyLocal(dateKey).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase());
}
function formatColDay(dateKey: string): string {
  return parseDateKeyLocal(dateKey).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }).replace(/^./, (c) => c.toUpperCase());
}

type InviteMeal = { invite_par: string; nom: string; prenom: string; date_repas: string; type_repas: "dejeuner" | "diner" };
type OpenServiceOption = { date: string; service: Service; option_id: string; label: string; residence: string };
type OptionGroup = { option_id: string; label: string; people: PersonneDetail[] };
type ServiceDetail = { open: boolean; options: OptionGroup[] };

export default function AdminRepasV2Page() {
  const { supabase } = useSupabase();
  const [people, setPeople] = useState<PersonneDetail[]>([]);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [presences, setPresences] = useState<PresenceV2[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [mealOptions, setMealOptions] = useState<MealOptionCatalog[]>([]);
  const [invites, setInvites] = useState<InviteMeal[]>([]);
  const [openServiceOptions, setOpenServiceOptions] = useState<OpenServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tableOpen, setTableOpen] = useState(false);
  const [listModal, setListModal] = useState<{ title: string; people: PersonneDetail[]; notes?: Record<string, string> } | null>(null);

  useEffect(() => {
    const today = formatDateKeyLocal(new Date());
    const saved = localStorage.getItem("startDate") || today;
    const end = new Date(parseDateKeyLocal(saved));
    end.setDate(end.getDate() + 7);
    setStartDate(saved);
    setEndDate(formatDateKeyLocal(end));
  }, []);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);

    const [{ data: residencesData }, { data: residentesData }, { data: inviteesData }, { data: optionsData }, { data: optsRes }, { data: invitesData }] =
      await Promise.all([
        supabase.from("residences").select("label, value").neq("value", "corail").order("label"),
        // Exclut le super-admin (compte technique) ; garde les archivées pour l'historique de compta.
        supabase.from("residentes").select("user_id, nom, prenom, residence, etage, chambre").eq("is_super_admin", false),
        supabase.from("invitees").select("user_id, nom, prenom, residence"),
        supabase.from("meal_options").select("*"),
        supabase.from("select_options_residence").select("value, label"),
        supabase.from("invites_repas").select("invite_par, nom, prenom, date_repas, type_repas").gte("date_repas", startDate).lte("date_repas", endDate),
      ]);
    setInvites((invitesData as InviteMeal[]) || []);

    const { data: soData } = await supabase
      .from("meal_service_options")
      .select("date, service, option:meal_options(id, label, residence)")
      .gte("date", startDate)
      .lte("date", endDate);
    setOpenServiceOptions(
      (soData ?? [])
        .map((so) => {
          const o = so.option as unknown as { id: string; label: string; residence: string } | null;
          return o ? { date: so.date as string, service: so.service as Service, option_id: o.id, label: o.label, residence: o.residence } : null;
        })
        .filter(Boolean) as OpenServiceOption[]
    );

    const optionLabels: Record<string, string> = {};
    (optsRes || []).forEach((o) => { if (o.value) optionLabels[o.value] = o.label; });

    setResidences(residencesData || []);
    setMealOptions((optionsData as MealOptionCatalog[]) || []);
    setPeople([
      ...(residentesData?.map((r) => ({
        id: r.user_id, nom: r.nom, prenom: r.prenom,
        residence: r.residence != null ? String(r.residence) : undefined,
        etage: r.etage, chambre: r.chambre ? optionLabels[r.chambre] ?? r.chambre : r.chambre, isInvite: false,
      })) || []),
      ...(inviteesData?.map((i) => ({
        id: i.user_id, nom: i.nom, prenom: i.prenom,
        residence: i.residence != null ? String(i.residence) : undefined, isInvite: true,
      })) || []),
    ]);

    const [presRes, absRes] = await Promise.all([
      fetch(`/api/admin/presences-v2?start=${startDate}&end=${endDate}`),
      fetch(`/api/admin/absences?start=${startDate}&end=${endDate}`),
    ]);
    const presJson = await presRes.json();
    const absJson = await absRes.json();
    if (presRes.ok) setPresences(presJson.presences ?? []);
    else toast.error(presJson.error || "Erreur inscriptions.");
    if (absRes.ok) setAbsences(absJson.absences ?? []);
    else toast.error(absJson.error || "Erreur absences.");

    setLoading(false);
  }, [startDate, endDate, supabase]);

  useEffect(() => {
    fetchData();
    if (startDate) localStorage.setItem("startDate", startDate);
  }, [fetchData, startDate]);

  const daysInRange = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return [];
    const days: string[] = [];
    const cursor = parseDateKeyLocal(startDate);
    const end = parseDateKeyLocal(endDate);
    while (cursor <= end) { days.push(formatDateKeyLocal(cursor)); cursor.setDate(cursor.getDate() + 1); }
    return days;
  }, [startDate, endDate]);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const optionsById = useMemo(() => new Map(mealOptions.map((o) => [o.id, o])), [mealOptions]);

  // Résidence de compta d'une inscription (option 12/36, ou résidence de la personne)
  const comptaResidence = useCallback(
    (p: PresenceV2): string | undefined => {
      const opt = optionsById.get(p.option_id);
      if (!opt) return undefined;
      if (opt.residence === "personne") return peopleById.get(p.user_id)?.residence;
      return opt.residence;
    },
    [optionsById, peopleById]
  );

  // Détail d'un jour par service : options OUVERTES (même à 0 inscrit) + inscrits par option.
  const getDayOptionDetail = useCallback(
    (dateKey: string): Record<string, { dejeuner: ServiceDetail; diner: ServiceDetail }> => {
      const res: Record<string, { dejeuner: ServiceDetail; diner: ServiceDetail }> = {};
      residences.forEach((r) => (res[r.value] = { dejeuner: { open: false, options: [] }, diner: { open: false, options: [] } }));
      (["dejeuner", "diner"] as Service[]).forEach((svc) => {
        const openOpts = openServiceOptions.filter((so) => so.date === dateKey && so.service === svc);
        residences.forEach((r) => {
          // Options ouvertes pertinentes pour ce lieu (résidence de l'option, ou « personne »).
          const relevant = new Map<string, OpenServiceOption>();
          openOpts.forEach((so) => { if (so.residence === r.value || so.residence === "personne") relevant.set(so.option_id, so); });
          if (relevant.size === 0) return; // service fermé pour cette résidence
          const options: OptionGroup[] = [...relevant.values()]
            .map((so) => ({
              option_id: so.option_id,
              label: so.label,
              people: presences
                .filter((p) => p.date === dateKey && p.service === svc && p.option_id === so.option_id && !isAwayForMeal(absences, p.user_id, p.date) && comptaResidence(p) === r.value)
                .map((p) => peopleById.get(p.user_id))
                .filter(Boolean) as PersonneDetail[],
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
          res[r.value][svc] = { open: true, options };
        });
      });
      return res;
    },
    [residences, openServiceOptions, presences, absences, peopleById, comptaResidence]
  );

  // Invités d'un jour (avec noms), rattachés à la résidence de l'inviteur.
  const guestsForDay = useCallback(
    (dateKey: string): Record<string, { dejeuner: PersonneDetail[]; diner: PersonneDetail[] }> => {
      const res: Record<string, { dejeuner: PersonneDetail[]; diner: PersonneDetail[] }> = {};
      residences.forEach((r) => (res[r.value] = { dejeuner: [], diner: [] }));
      invites.forEach((inv, idx) => {
        if (inv.date_repas !== dateKey) return;
        const rk = peopleById.get(inv.invite_par)?.residence;
        if (!rk || !res[rk]) return;
        const person: PersonneDetail = { id: `guest-${dateKey}-${inv.type_repas}-${idx}`, nom: inv.nom, prenom: inv.prenom, isInvite: true };
        if (inv.type_repas === "dejeuner") res[rk].dejeuner.push(person);
        else res[rk].diner.push(person);
      });
      return res;
    },
    [residences, invites, peopleById]
  );

  // Agrégat par personne (compta fin de mois) : nb de déjeuners/dîners mangés sur la période,
  // groupé par résidence de la personne (déductions d'absences incluses).
  const comptaByResidence = useMemo(() => {
    const map: Record<string, { person: PersonneDetail; dejeuner: number; diner: number; total: number }[]> = {};
    residences.forEach((r) => (map[r.value] = []));
    people.forEach((person) => {
      const rk = person.residence;
      if (!rk || !map[rk]) return;
      let dej = 0, din = 0;
      daysInRange.forEach((date) => {
        (["dejeuner", "diner"] as Service[]).forEach((service) => {
          if (isAwayForMeal(absences, person.id, date)) return;
          const pres = presences.find((x) => x.user_id === person.id && x.date === date && x.service === service);
          if (pres) { if (service === "dejeuner") dej++; else din++; }
        });
      });
      // Repas des invités de cette personne : comptés à l'inviteur (pas de ligne séparée).
      invites.forEach((inv) => {
        if (inv.invite_par !== person.id) return;
        if (inv.type_repas === "dejeuner") dej++; else din++;
      });
      map[rk].push({ person, dejeuner: dej, diner: din, total: dej + din });
    });

    // Compta : ordre par étage puis alphabétique (nom, prénom), au sein de chaque résidence.
    const byEtageNom = (a: { person: PersonneDetail }, b: { person: PersonneDetail }) =>
      (a.person.etage || "").localeCompare(b.person.etage || "", "fr", { numeric: true }) ||
      (a.person.nom || "").localeCompare(b.person.nom || "", "fr", { sensitivity: "base" }) ||
      (a.person.prenom || "").localeCompare(b.person.prenom || "", "fr", { sensitivity: "base" });
    Object.keys(map).forEach((k) => map[k].sort(byEtageNom));
    return map;
  }, [residences, people, daysInRange, absences, presences, invites]);

  // Totaux du récap = par résidence de la personne (cohérent avec l'agrégat, pour la facturation)
  const comptaTotals = useMemo(() => {
    const t: Record<string, { dejeuner: number; diner: number }> = {};
    residences.forEach((r) => {
      const rows = comptaByResidence[r.value] ?? [];
      t[r.value] = { dejeuner: rows.reduce((a, x) => a + x.dejeuner, 0), diner: rows.reduce((a, x) => a + x.diner, 0) };
    });
    return t;
  }, [residences, comptaByResidence]);

  const comptaGrand = useMemo(() => {
    let dej = 0, din = 0;
    Object.values(comptaTotals).forEach((v) => { dej += v.dejeuner; din += v.diner; });
    return { dej, din };
  }, [comptaTotals]);

  const tableColumns: DetailColumn[] = daysInRange.flatMap((d) => [
    { key: `${d}|dejeuner`, label: formatColDay(d), sublabel: "Déj" },
    { key: `${d}|diner`, label: formatColDay(d), sublabel: "Dîner" },
  ]);

  // Valeur texte d'une cellule du détail (même logique que l'affichage).
  const detailCell = (p: PersonneDetail, date: string, service: string): string => {
    if (isAwayForMeal(absences, p.id, date)) return "Absente";
    const pres = presences.find((x) => x.user_id === p.id && x.date === date && x.service === service);
    if (!pres) return "Non";
    return optionsById.get(pres.option_id)?.label ?? "Oui";
  };

  const exportDetail = () => {
    const header = ["Résidence", "Étage", "Nom", "Prénom", ...tableColumns.map((c) => `${c.label} ${c.sublabel}`)];
    const rows: (string | number)[][] = [header];
    sortAdminPeople(people).forEach((p) => {
      const cells = tableColumns.map((c) => {
        const [date, service] = c.key.split("|");
        return detailCell(p, date, service);
      });
      rows.push([p.residence ?? "", formatEtage(p.etage) ?? "", p.nom, p.prenom, ...cells]);
    });
    downloadCSV(`inscriptions_${startDate}_${endDate}.csv`, rows);
  };

  const exportCompta = () => {
    const rows: (string | number)[][] = [["Résidence", "Étage", "Nom", "Prénom", "Déjeuners", "Dîners", "Total"]];
    residences.forEach((r) => {
      (comptaByResidence[r.value] ?? []).forEach((row) => {
        rows.push([r.label, formatEtage(row.person.etage) ?? "", row.person.nom, row.person.prenom, row.dejeuner, row.diner, row.total]);
      });
      const t = comptaTotals[r.value] ?? { dejeuner: 0, diner: 0 };
      rows.push([r.label, "", "TOTAL", "", t.dejeuner, t.diner, t.dejeuner + t.diner]);
    });
    downloadCSV(`compta_${startDate}_${endDate}.csv`, rows);
  };

  if (loading) {
    return <main className="flex items-center justify-center min-h-screen bg-white"><LoadingSpinner /></main>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-white py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-800 mb-1">Repas — comptabilité</h1>
          <p className="text-gray-600 text-sm">Inscriptions & comptabilité · absences déduites</p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-amber-600" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-amber-300 rounded-lg px-3 py-1 text-black" />
            <span>→</span>
            <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="border border-amber-300 rounded-lg px-3 py-1 text-black" />
          </div>
          <button onClick={() => setTableOpen(true)} className="flex items-center gap-1 border border-amber-600 text-amber-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-50 cursor-pointer">
            <Table2 className="w-4 h-4" /> Voir le détail
          </button>
        </div>

        <Tabs defaultValue="orga" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="inline-flex items-center justify-center bg-orange-100/50 p-2 rounded-3xl shadow-inner h-16 w-full max-w-lg">
              <TabsTrigger value="orga" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-base font-bold transition-all text-orange-900/60 data-[state=active]:bg-white data-[state=active]:text-orange-800 data-[state=active]:shadow">
                <CalendarCheck className="w-5 h-5 text-orange-600" /> Organisation
              </TabsTrigger>
              <TabsTrigger value="compta" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-base font-bold transition-all text-orange-900/60 data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow">
                <Scale className="w-5 h-5" /> Comptabilité
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ORGANISATION : jours empilés, compteurs cliquables (qui prépare quoi) */}
          <TabsContent value="orga">
            <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
              <Soup className="w-4 h-4 text-orange-600" /> Repas à préparer, par jour et par résidence.
            </div>
            <div className="space-y-3">
              {daysInRange.map((date) => {
                const optDetail = getDayOptionDetail(date);
                const guests = guestsForDay(date);
                return (
                  <div key={date} className="rounded-2xl border-2 border-gray-100 bg-white shadow-sm p-4">
                    <p className="text-sm font-bold text-orange-900 uppercase tracking-wide mb-3">{formatJourLong(date)}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {residences.map((r) => {
                        const det = optDetail[r.value];
                        const gst = guests[r.value];
                        const anyContent = det.dejeuner.open || det.diner.open || gst.dejeuner.length > 0 || gst.diner.length > 0;
                        return (
                          <div key={r.value} className="border border-gray-100 rounded-xl p-3">
                            <p className="font-bold text-gray-700 text-sm uppercase mb-2">{r.label}</p>
                            {!anyContent ? (
                              <p className="text-xs text-gray-400 italic">Service fermé.</p>
                            ) : (
                              <div className="space-y-3">
                                {(["dejeuner", "diner"] as Service[]).map((svc) => {
                                  const sd = det[svc];
                                  const gpeople = gst[svc];
                                  if (!sd.open && gpeople.length === 0) return null;
                                  const isMidi = svc === "dejeuner";
                                  return (
                                    <div key={svc}>
                                      <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${isMidi ? "text-orange-500" : "text-blue-500"}`}>{isMidi ? "Midi" : "Soir"}</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        {sd.options.map((grp) => (
                                          <button
                                            key={grp.option_id}
                                            onClick={() => setListModal({ title: `${grp.label} (${isMidi ? "Midi" : "Soir"}) — ${r.label} · ${formatJourLong(date)}`, people: grp.people })}
                                            className={`flex flex-col items-center rounded-xl py-2 px-1 transition cursor-pointer ${isMidi ? "bg-orange-50 hover:bg-orange-100 text-orange-900" : "bg-blue-50 hover:bg-blue-100 text-blue-900"}`}
                                            title="Voir la liste"
                                          >
                                            <span className="text-[10px] font-bold uppercase text-center leading-tight">{grp.label}</span>
                                            <span className="text-lg font-black">{grp.people.length}</span>
                                          </button>
                                        ))}
                                        {gpeople.length > 0 && (
                                          <button
                                            onClick={() => setListModal({ title: `Invités (${isMidi ? "Midi" : "Soir"}) — ${r.label} · ${formatJourLong(date)}`, people: gpeople })}
                                            className="flex flex-col items-center rounded-xl py-2 px-1 bg-purple-50 hover:bg-purple-100 text-purple-800 transition cursor-pointer"
                                            title="Voir la liste des invités"
                                          >
                                            <span className="text-[10px] font-bold uppercase text-center leading-tight">👤 Invités</span>
                                            <span className="text-lg font-black">{gpeople.length}</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* COMPTABILITÉ : récap + agrégat par personne (fin de mois) */}
          <TabsContent value="compta" className="space-y-8">
            <div className="flex justify-end">
              <button onClick={exportCompta} className="flex items-center gap-1 bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-700 cursor-pointer">
                <Download className="w-4 h-4" /> Télécharger la compta (CSV)
              </button>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Scale className="text-amber-600" /> Récapitulatif de la période</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {residences.map((r) => (
                  <div key={r.value} className="rounded-2xl bg-white border border-amber-100 shadow-sm p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">{r.label}</p>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400" /> Déjeuners <span className="font-bold text-orange-800 ml-2">{comptaTotals[r.value]?.dejeuner ?? 0}</span></div>
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400" /> Dîners <span className="font-bold text-blue-800 ml-2">{comptaTotals[r.value]?.diner ?? 0}</span></div>
                      </div>
                      <p className="text-2xl font-black text-amber-800">{(comptaTotals[r.value]?.dejeuner ?? 0) + (comptaTotals[r.value]?.diner ?? 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 p-5 flex items-center justify-between shadow-md text-white">
                <p className="text-lg font-semibold">{comptaGrand.dej} déjeuners · {comptaGrand.din} dîners</p>
                <p className="text-3xl font-black">{comptaGrand.dej + comptaGrand.din}</p>
              </div>
            </div>

            {/* Agrégat par personne, par résidence */}
            {residences.map((r) => (
              <div key={r.value} className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-amber-800 mb-4">Comptabilité — {r.label}</h3>
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
                    {(() => {
                      const rows = comptaByResidence[r.value] ?? [];
                      if (rows.length === 0) return <tr><td colSpan={4} className="p-3 text-gray-400 italic text-center">Aucune inscription sur la période.</td></tr>;
                      const items: ({ header: string } | { row: (typeof rows)[number] })[] = [];
                      let last: string | null = null;
                      rows.forEach((row) => {
                        const et = formatEtage(row.person.etage) ?? "Étage ?";
                        if (et !== last) { items.push({ header: et }); last = et; }
                        items.push({ row });
                      });
                      return items.map((it, i) =>
                        "header" in it ? (
                          <tr key={`h-${i}`} className="bg-amber-50">
                            <td colSpan={4} className="p-2 text-xs font-bold uppercase tracking-wide text-amber-700">{it.header}</td>
                          </tr>
                        ) : (
                          <tr key={it.row.person.id} className="border-b">
                            <td className="p-2">
                              {it.row.person.nom} {it.row.person.prenom}
                              {it.row.person.isInvite && <span className="ml-1 text-[10px] text-blue-500">(invitée)</span>}
                            </td>
                            <td className="text-center p-2">{it.row.dejeuner}</td>
                            <td className="text-center p-2">{it.row.diner}</td>
                            <td className="text-center p-2 font-semibold text-amber-800">{it.row.total}</td>
                          </tr>
                        )
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Tableau de détail */}
      {tableOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setTableOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl lg:max-w-[92vw] max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 gap-2">
              <h3 className="text-lg font-semibold text-amber-800">Détail des repas — période</h3>
              <div className="flex items-center gap-2">
                <button onClick={exportDetail} className="flex items-center gap-1 border border-amber-600 text-amber-700 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-amber-50 cursor-pointer">
                  <Download className="w-4 h-4" /> Exporter (CSV)
                </button>
                <button onClick={() => setTableOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer text-xl leading-none">✕</button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Repas choisi · <span className="text-red-600 font-semibold">Non</span> = ne mange pas · <span className="inline-flex items-center text-orange-500 align-middle"><MoonIcon className="w-3 h-3" /></span> = absente (absence déduite)
            </p>
            <DetailTable
              people={people}
              columns={tableColumns}
              renderCell={(p, key) => {
                const [date, service] = key.split("|");
                if (isAwayForMeal(absences, p.id, date)) {
                  return <span className="text-orange-500 flex items-center justify-center gap-0.5"><MoonIcon className="w-3 h-3" /></span>;
                }
                const pres = presences.find((x) => x.user_id === p.id && x.date === date && x.service === service);
                if (!pres) return <span className="text-red-600 font-semibold">Non</span>;
                const opt = optionsById.get(pres.option_id);
                return <span className="text-green-700 whitespace-nowrap">{opt?.label ?? "Oui"}</span>;
              }}
            />
          </div>
        </div>
      )}

      <DetailListModal open={!!listModal} onClose={() => setListModal(null)} title={listModal?.title ?? ""} people={listModal?.people ?? []} notes={listModal?.notes} />
    </div>
  );
}
