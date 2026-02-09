"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState, useMemo } from "react";
import { useSupabase } from "@/app/providers";
import { CalendarDays, Search, HouseHeart, UserRound, Scale, Soup, CalendarCheck } from "lucide-react";
import { Personne } from "@/types/Personne";
import { Repas } from "@/types/repas";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InviteRepas } from "@/types/InviteRepas";
import { Residence } from "@/types/Residence";
import { formatDateKeyLocal } from "@/lib/utilDate";

// --- Définition des Types Stricts ---

interface SpecialOption {
  label: string;
  count: number;
}

interface DayStats {
  dejeuner: number;
  diner: number;
  plateau: number;
  piqueNique: number;
  specialOptions: SpecialOption[];
}

type DailySummaryMap = Record<string, DayStats>;

interface ExtendedPersonne extends Partial<Personne> {
  user_id: string;
  nom: string;
  prenom: string;
  residence?: string;
  estInvite: boolean;
  inviteParPrenom?: string;
  inviteParNom?: string;
}

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
  const [residentes, setResidentes] = useState<Personne[]>([]);
  const [invites, setInvites] = useState<InviteRepas[]>([]);
  const [loading, setLoading] = useState(true);
  const [openLieu, setOpenLieu] = useState<string | null>(null);
  const [residences, setResidences] = useState<Residence[]>([]);

  // --- Helpers de date ---
  const formatDateFR = (dateString: string, short = false): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: short ? "short" : "long",
    }).replace(/^./, (c) => c.toUpperCase());
  };

  const getNextDayStr = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  // --- Initialisation ---
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const endDateDef = new Date(today)
    endDateDef.setDate(endDateDef.getDate() + 7) // Par défaut la date de fin est 7 jours après la date du jour
    setStartDate(localStorage.getItem("startDate") || today);
    setEndDate(formatDateKeyLocal(endDateDef));
  }, []);

  // --- Fetch avec sécurité Loading + J+1 ---
  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // IMPORTANT : On va jusqu'au lendemain de la date de fin pour les PN
        const extraDayForPN = getNextDayStr(endDate);

        const [{ data: rData }, { data: resData }, { data: invData }, { data: residData }] =
          await Promise.all([
            supabase.from("presences").select("*").gte("date_repas", startDate).lte("date_repas", extraDayForPN),
            supabase.from("residentes").select("*"),
            supabase.from("invites_repas").select("*").gte("date_repas", startDate).lte("date_repas", endDate),
            supabase.from("residences").select("*"),
          ]);

        setRepasData(rData || []);
        setResidentes(resData || []);
        setInvites(invData || []);
        setResidences(residData || []);
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false); // S'assure que le spinner s'arrête toujours
      }
    };

    fetchData();
    localStorage.setItem("startDate", startDate);
    localStorage.setItem("endDate", endDate);
  }, [startDate, endDate, supabase]);

  // --- Mémos de calcul ---
  const toutesPersonnes = useMemo<ExtendedPersonne[]>(() => {
    const list: ExtendedPersonne[] = residentes.map((r) => ({
      ...r,
      estInvite: false
    }));

    invites.forEach((i) => {
      const parent = residentes.find((r) => r.user_id === i.invite_par);
      list.push({
        user_id: `invite-${i.id}`,
        nom: i.nom,
        prenom: i.prenom,
        residence: i.lieu_repas,
        estInvite: true,
        inviteParPrenom: parent?.prenom || "",
        inviteParNom: parent?.nom || "",
      });
    });
    return list;
  }, [residentes, invites]);

  // FONCTION DE RÉSUMÉ : La logique PN Lendemain est ici
  const getDailySummary = (currentDate: string): DailySummaryMap => {
    const summary: DailySummaryMap = {};
    residences.forEach(r => {
      summary[r.value] = { dejeuner: 0, diner: 0, plateau: 0, piqueNique: 0, specialOptions: [] };
    });

    const tomorrowStr = getNextDayStr(currentDate);

    repasData.forEach(r => {
      const p = residentes.find(res => res.user_id === r.user_id);
      if (!p) return;
      const choix = (r.choix_repas || "").toLowerCase();

      // CAS 1 : Repas du jour même (Midi, Soir, Plateau, Spécial)
      if (r.date_repas === currentDate) {
        if (choix.startsWith("special:")) {
          const [_, residence, label] = choix.split(":");
          if (summary[residence]) {
            const opt = summary[residence].specialOptions.find((o: SpecialOption) => o.label === label);
            opt ? opt.count++ : summary[residence].specialOptions.push({ label, count: 1 });
          }
        } else {
          const lieu = (choix === "12" || choix === "36") ? choix : (choix.includes("plateau") ? p.residence : null);
          if (lieu && summary[lieu]) {
            if (choix.includes("plateau")) summary[lieu].plateau++;
            else if (r.type_repas === "dejeuner") summary[lieu].dejeuner++;
            else if (r.type_repas === "diner") summary[lieu].diner++;
          }
        }
      }

      // CAS 2 : Pique-niques du LENDEMAIN à préparer AUJOURD'HUI
      if (r.date_repas === tomorrowStr && choix.includes("pn")) {
        const lieu = p.residence; // Les PN sont préparés dans la résidence de la personne
        if (lieu && summary[lieu]) {
          summary[lieu].piqueNique++;
        }
      }
    });

    // Invités (Jour même)
    invites.filter(i => i.date_repas === currentDate).forEach(i => {
      if (summary[i.lieu_repas]) {
        if (i.type_repas === "dejeuner") summary[i.lieu_repas].dejeuner++;
        if (i.type_repas === "diner") summary[i.lieu_repas].diner++;
      }
    });

    return summary;
  };

  const comptaByResidence = useMemo<ComptaByResidenceMap>(() => {
    const compta: ComptaByResidenceMap = {};
    residences.forEach(r => compta[r.value] = []);
    residentes.forEach(p => {
      const count = { dejeuner: 0, diner: 0 };
      repasData.filter(r => r.user_id === p.user_id && r.date_repas <= endDate).forEach(r => {
        if (!r.choix_repas?.toLowerCase().includes("non")) {
          if (r.type_repas === "dejeuner") count.dejeuner++;
          if (r.type_repas === "diner") count.diner++;
        }
      });
      invites.filter(i => i.invite_par === p.user_id).forEach(i => {
        if (i.type_repas === "dejeuner") count.dejeuner++;
        if (i.type_repas === "diner") count.diner++;
      });
      if (p.residence && compta[p.residence]) {
        compta[p.residence].push({ ...p, ...count, total: count.dejeuner + count.diner });
      }
    });
    return compta;
  }, [residences, residentes, repasData, invites, endDate]);

  const daysInRange = useMemo(() => {
    if (!startDate) return [];
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [startDate]);

  if (loading) return <main className="flex items-center justify-center min-h-screen"><LoadingSpinner /></main>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-white py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-amber-800 text-center mb-10">Inscriptions aux repas</h1>

        <Tabs defaultValue="sum" className="w-full">
          <div className="flex justify-center w-full mb-12">
            <TabsList className="
              inline-flex items-center justify-center 
              bg-orange-100/50 p-2 rounded-3xl shadow-inner
              h-20 sm:h-24 w-full max-w-2xl
            ">
              <TabsTrigger
                value="sum"
                className="
                  flex-1 flex items-center justify-center gap-3
                  px-6 py-4 rounded-2xl text-lg sm:text-xl font-bold
                  transition-all duration-300
                  text-orange-900/60
                  data-[state=active]:bg-white 
                  data-[state=active]:text-orange-800 
                  data-[state=active]:shadow-lg 
                  data-[state=active]:scale-105
                  hover:bg-white/50
                "
              >
                <Soup className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
                <span>Inscriptions</span>
              </TabsTrigger>

              <TabsTrigger
                value="compta"
                className="
                  flex-1 flex items-center justify-center gap-3
                  px-6 py-4 rounded-2xl text-lg sm:text-xl font-bold
                  transition-all duration-300
                  text-orange-900/60
                  data-[state=active]:bg-amber-600 
                  data-[state=active]:text-white 
                  data-[state=active]:shadow-lg 
                  data-[state=active]:scale-105
                  hover:bg-amber-500/20
                "
              >
                <Scale className="w-6 h-6 sm:w-8 sm:h-8" />
                <span>Comptabilité</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Filtre CALENDRIER */}
          <div className="flex justify-center items-center gap-3">
            <CalendarDays className="text-amber-600" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-amber-300 rounded-lg px-3 py-1 text-black" />
            <span>→</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-amber-300 rounded-lg px-3 py-1 text-black" />
          </div>

          {/* Onglet Récap par RESIDENCE */}
          <TabsContent value="sum" className="space-y-12">
           {/* RÉSUMÉ DE LA SEMAINE */}
            <section className="mt-12">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <CalendarCheck className="text-orange-600" /> 
                Planning Hebdomadaire
              </h2>
              
              <div className="overflow-x-auto pb-6">
                <div className="flex gap-6 min-w-max">
                  {daysInRange.map((date) => {
                    const daily = getDailySummary(date);
                    const estAujourdhui = date === startDate;

                    return (
                      <div 
                        key={date} 
                        className={`
                          w-72 rounded-3xl border-2 transition-all
                          ${estAujourdhui 
                            ? 'bg-orange-50 border-orange-300 shadow-md ring-2 ring-orange-200 ring-offset-2' 
                            : 'bg-white border-gray-100 shadow-sm'}
                        `}
                      >
                        {/* Header du jour */}
                        <div className={`
                          p-4 rounded-t-[22px] border-b text-center
                          ${estAujourdhui ? 'bg-orange-100/50' : 'bg-gray-50/50'}
                        `}>
                          <p className="text-sm font-bold text-orange-900 uppercase tracking-wider">
                            {formatDateFR(date, true)}
                          </p>
                        </div>

                        <div className="p-5 space-y-6">
                          {residences.map((res) => {
                            const s = daily[res.value];
                            return (
                              <div key={res.value}>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-1 h-4 bg-orange-400 rounded-full"></div>
                                  <p className="font-bold text-gray-700 text-sm uppercase">{res.label}</p>
                                  {estAujourdhui && 
                                    <button 
                                      onClick={() => setOpenLieu(res.value)}
                                      className="px-3 bg-orange-50 rounded-full hover:bg-orange-100 transition-transform hover:scale-110">
                                        <Search className="text-orange-600" />
                                    </button>
                                  }
                                </div>

                                {/* Grille 2x2 pour les repas */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-orange-50/50 p-2 rounded-xl flex flex-col items-center">
                                    <span className="text-[10px] text-orange-600 font-bold uppercase">Midi</span>
                                    <span className="text-lg font-black text-orange-900">{s.dejeuner}</span>
                                  </div>
                                  <div className="bg-blue-50/50 p-2 rounded-xl flex flex-col items-center">
                                    <span className="text-[10px] text-blue-600 font-bold uppercase">Soir</span>
                                    <span className="text-lg font-black text-blue-900">{s.diner}</span>
                                  </div>
                                  <div className="bg-purple-50/50 p-2 rounded-xl flex flex-col items-center">
                                    <span className="text-[10px] text-purple-600 font-bold uppercase">
                                      P.N <span className="text-[7px]">(du lendemain)</span>
                                    </span>
                                    <span className="text-lg font-black text-purple-900">{s.piqueNique}</span>
                                  </div>
                                  <div className="bg-emerald-50/50 p-2 rounded-xl flex flex-col items-center">
                                    <span className="text-[10px] text-emerald-600 font-bold uppercase">Plateau</span>
                                    <span className="text-lg font-black text-emerald-900">{s.plateau}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Total du jour en pied de carte */}
                        <div className="px-5 py-3 bg-gray-50/50 rounded-b-[22px] border-t border-gray-100 text-center">
                          <p className="text-xs text-gray-500 font-medium">
                            Total Jour : <span className="text-orange-800 font-bold">
                              {residences.reduce((acc, r) => acc + daily[r.value].dejeuner + daily[r.value].diner + daily[r.value].plateau + daily[r.value].piqueNique, 0)}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </TabsContent>

          {/* Popup Détails */}
          <Dialog open={!!openLieu} onOpenChange={() => setOpenLieu(null)}>
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Détails des repas - Résidence {openLieu}</DialogTitle></DialogHeader>
              {daysInRange.map(date => (
                <div key={date} className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">📅 {formatDateFR(date)}</h3>
                  {["dejeuner", "diner"].map(type => (
                    <div key={type} className="mb-4">
                      <h4 className="text-md font-medium text-gray-700 mb-2 capitalize">{type === "dejeuner" ? "☀️ Déjeuner" : "🌙 Dîner"}</h4>
                      <table className="min-w-full border text-sm bg-white mb-4">
                        <thead className="bg-gray-50">
                          <tr><th className="p-2 text-left">Nom</th><th className="p-2 text-left">Repas</th><th className="p-2 text-left">Commentaire</th></tr>
                        </thead>
                        <tbody>
                          {toutesPersonnes.filter(p => p.residence === openLieu).sort((a,b) => a.nom.localeCompare(b.nom)).map(p => {
                            const repas = repasData.find(r => r.user_id === p.user_id && r.date_repas === date && r.type_repas === type);
                            const inv = invites.find(i => `invite-${i.id}` === p.user_id && i.date_repas === date && i.type_repas === type);
                            
                            if (!repas && !inv && !p.estInvite) return null; // On n'affiche que ceux qui ont une action
                            
                            const label = repas?.choix_repas || (inv ? "Oui" : "Non");
                            const color = label.includes("Non") ? "bg-red-100" : "bg-green-100";
                            
                            return (
                              <tr key={p.user_id + date + type} className="border-b">
                                <td className="p-2">{p.nom} {p.prenom} {p.estInvite && <span className="text-[10px] text-blue-500">(Invité)</span>}</td>
                                <td className="p-2"><span className={`px-2 py-1 rounded-full ${color}`}>{label}</span></td>
                                <td className="p-2">{repas?.commentaire || "-"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))}
            </DialogContent>
          </Dialog>
          
          {/* Onglet COMPTABILITE */}
          <TabsContent value="compta">
            <div className="space-y-10">
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
                      {comptaByResidence[r.value]?.sort((a,b) => a.nom.localeCompare(b.nom)).map((p, idx) => (
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
    </div>
  );
}