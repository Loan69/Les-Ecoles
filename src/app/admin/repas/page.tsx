"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/providers";
import { CalendarDays, Search, HouseHeart, UserRound } from "lucide-react";
import { Personne } from "@/types/Personne";
import { Repas } from "@/types/repas";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InviteRepas } from "@/types/InviteRepas";
import { Residence } from "@/types/Residence";

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

  // --- Formattage des dates (type mercredi 15 octobre 2025) ---
  const formatDateFR = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date
      .toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      .replace(/^./, (c) => c.toUpperCase());
  };

  // --- Fonction utilitaire pour obtenir YYYY-MM-DD ---
  const getTomorrowString = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  };

  // --- Initialisation des dates ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const today = new Date();
      setStartDate(localStorage.getItem("startDate") || today.toISOString().slice(0, 10));
      setEndDate(localStorage.getItem("endDate") || today.toISOString().slice(0, 10));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (startDate) localStorage.setItem("startDate", startDate);
      if (endDate) localStorage.setItem("endDate", endDate);
    }
  }, [startDate, endDate]);

  // --- Fetch résidentes, repas, invités et résidences ---
  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      setLoading(true);
      const tomorrowStr = getTomorrowString(endDate);

      const [{ data: repas, error: repasError }, { data: residentesData }, { data: invitesData }, { data: residencesData, error: resError }] =
        await Promise.all([
          supabase
            .from("presences")
            .select("id_repas, user_id, date_repas, type_repas, choix_repas, commentaire")
            .gte("date_repas", startDate)
            .lte("date_repas", tomorrowStr),
          supabase.from("residentes").select("user_id, nom, prenom, residence"),
          supabase
            .from("invites_repas")
            .select("id, nom, prenom, invite_par, lieu_repas, date_repas, type_repas")
            .gte("date_repas", startDate)
            .lte("date_repas", tomorrowStr),
          supabase.from("residences").select("value, label"),
        ]);

      if (repasError) console.error("Erreur repas :", repasError);
      if (resError) console.error("Erreur résidences :", resError);

      setRepasData(repas || []);
      setResidentes(residentesData || []);
      setInvites(invitesData || []);
      setResidences(residencesData || []);

      setLoading(false);
    };

    fetchData();
  }, [startDate, endDate]);

  // --- Type pour TypeScript pour distinguer résidente vs invitée ---
  type PersonneWithInvite = Personne & {
    estInvite: boolean;
    inviteParPrenom?: string;
    inviteParNom?: string;
  };

  // --- Toutes les personnes (résidentes + invités) ---
  const toutesPersonnes: PersonneWithInvite[] = [
    ...residentes.map((r) => ({ ...r, estInvite: false })),
    ...invites.map((i) => {
      const res = residentes.find((r) => r.user_id === i.invite_par);
      return {
        user_id: `invite-${i.id}`,
        nom: i.nom,
        prenom: i.prenom,
        residence: i.lieu_repas,
        estInvite: true,
        inviteParPrenom: res?.prenom || "",
        inviteParNom: res?.nom || "",
      };
    }),
  ];

  const findPerson = (user_id: string) => residentes.find((p) => p.user_id === user_id);

  // --- Initialisation dynamiques des objets résumé ---
  const summaryByLieu: Record<string, { dejeuner: number; diner: number; plateau: number; piqueNique: number }> = {};
  const comptaByResidence: Record<string, { nom: string; prenom: string; dejeuner: number; diner: number; total: number }[]> = {};

  residences.forEach((r) => {
    summaryByLieu[r.value] = { dejeuner: 0, diner: 0, plateau: 0, piqueNique: 0 };
    comptaByResidence[r.value] = [];
  });

  const tomorrowStr = getTomorrowString(startDate);

  // --- Comptage repas résidentes ---
  repasData.forEach((r) => {
    const personne = findPerson(r.user_id);
    if (!personne) return;
    const choix = r.choix_repas?.toLowerCase() || "";

    const lieuRepas =
      choix === "12" || choix === "36"
        ? choix
        : ["pn", "plateau"].some((kw) => choix.includes(kw))
        ? personne.residence?.toString()
        : undefined;

    if (!lieuRepas || !summaryByLieu[lieuRepas]) return;

    if (choix.includes("plateau") && r.date_repas === startDate) {
      summaryByLieu[lieuRepas].plateau++;
      return;
    }
    if (choix.includes("pn") && r.date_repas === tomorrowStr) {
      summaryByLieu[lieuRepas].piqueNique++;
      return;
    }
    if (r.date_repas === startDate) {
      if (r.type_repas === "dejeuner" && (choix.includes("36") || choix.includes("12"))) summaryByLieu[lieuRepas].dejeuner++;
      if (r.type_repas === "diner" && (choix.includes("36") || choix.includes("12"))) summaryByLieu[lieuRepas].diner++;
    }
  });

  // --- Comptage repas invités ---
  invites
    .filter((i) => i.date_repas === startDate)
    .forEach((inv) => {
      const lieu = inv.lieu_repas;
      if (!summaryByLieu[lieu]) return;
      if (inv.type_repas === "dejeuner") summaryByLieu[lieu].dejeuner++;
      if (inv.type_repas === "diner") summaryByLieu[lieu].diner++;
    });

  // --- Comptabilité par résidence ---
  residentes.forEach((p) => {
    const repasPerso = repasData.filter((r) => r.user_id === p.user_id);
    const invitesPerso = invites.filter((i) => i.invite_par === p.user_id);

    let dejeuner = 0;
    let diner = 0;

    repasPerso.forEach((r) => {
      const choix = r.choix_repas?.toLowerCase() || "";
      if (!choix.includes("non")) {
        if (r.type_repas === "dejeuner") dejeuner++;
        if (r.type_repas === "diner") diner++;
      }
    });

    invitesPerso.forEach((i) => {
      if (i.type_repas === "dejeuner") dejeuner++;
      if (i.type_repas === "diner") diner++;
    });

    if (p.residence && comptaByResidence[p.residence]) {
      comptaByResidence[p.residence].push({
        nom: p.nom,
        prenom: p.prenom,
        dejeuner,
        diner,
        total: dejeuner + diner,
      });
    } else {
      console.warn("Résidente avec résidence inconnue :", p);
    }
  });

  if (loading || !startDate || !endDate) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-white py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-amber-800 mb-2">Inscriptions aux repas</h1>
          <p className="text-gray-600">
            Consultez les inscriptions aux repas sur la période choisie.
          </p>
        </div>

        {/* Sélecteur de dates */}
        <div className="flex justify-center items-center mb-8 gap-3">
          <CalendarDays className="text-amber-600" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-amber-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 text-black"
          />
          <span className="text-gray-500 font-semibold">→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-amber-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 text-black"
          />
        </div>

        {/* Résumé par lieu */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <HouseHeart />
          Total des repas du {formatDateFR(startDate)}
        </h2>
        <div className="flex flex-col md:flex-row justify-center gap-8 mb-10">
          {residences.map((r) => {
            const s = summaryByLieu[r.value];
            return (
              <div
                key={r.value}
                className="relative bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm w-full md:w-1/3 text-center"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-2xl font-bold text-orange-800">{r.label}</h3>
                  <button
                    onClick={() => setOpenLieu(r.value)}
                    className="cursor-pointer text-orange-700 hover:text-orange-900 transition-colors"
                  >
                    <Search size={22} />
                  </button>
                </div>

                <div className="flex flex-col items-center text-orange-700 space-y-1">
                  <div className="flex justify-between w-48">
                    <span>Déjeuner</span>
                    <span className="font-semibold">{s.dejeuner}</span>
                  </div>
                  <div className="flex justify-between w-48">
                    <span>Dîner</span>
                    <span className="font-semibold">{s.diner}</span>
                  </div>
                  <div className="flex justify-between w-48">
                    <span>Plateaux repas</span>
                    <span className="font-semibold">{s.plateau}</span>
                  </div>
                  <div className="flex justify-between w-48">
                    <span>Pique-niques (à venir)</span>
                    <span className="font-semibold">{s.piqueNique}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comptabilité */}
        <div className="space-y-10">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <UserRound />
            Total par lieu de résidence des utilisatrices
          </h2>
          {residences.map((r) => (
            <div key={r.value} className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-amber-800 mb-4">
                Comptabilité - {r.label}
              </h3>
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
                  {comptaByResidence[r.value].map((p, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{p.prenom} {p.nom}</td>
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

        {/* Popup détail */}
        <Dialog open={!!openLieu} onOpenChange={() => setOpenLieu(null)}>
          <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails des repas - Résidence {openLieu}</DialogTitle>
            </DialogHeader>

            {(() => {
              const repasFiltres = repasData.filter(
                (r) => r.date_repas >= startDate && r.date_repas <= endDate
              );
              const datesAffichees = Array.from(
                new Set([...repasFiltres.map(r => r.date_repas), ...invites.map(i => i.date_repas)])
              ).sort();

              return datesAffichees.map(date => (
                <div key={date} className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    📅 {new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
                  </h3>

                  {["dejeuner", "diner"].map(type => (
                    <div key={type} className="mb-4">
                      <h4 className="text-md font-medium text-gray-700 mb-2 capitalize">
                        {type === "dejeuner" ? "☀️ Déjeuner" : "🌙 Dîner"}
                      </h4>

                      <table className="min-w-full border text-sm bg-white">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2 font-semibold">Nom</th>
                            <th className="text-left p-2 font-semibold">Repas</th>
                            <th className="text-left p-2 font-semibold">Commentaire</th>
                          </tr>
                        </thead>
                        <tbody>
                          {toutesPersonnes.map((p) => {
                            let lieuRepas: string | undefined;
                            let label = "Non";
                            let couleur = "bg-red-100 text-red-800";
                            let commentaire = "-";

                            if (p.estInvite) {
                              const inv = invites.find(
                                i => `invite-${i.id}` === p.user_id && i.date_repas === date && i.type_repas === type
                              );
                              if (!inv) return null;
                              lieuRepas = inv.lieu_repas;
                              label = "Oui";
                              couleur = "bg-green-100 text-green-800";
                              commentaire = "-";
                            } else {
                              const repas = repasFiltres.find(
                                r => r.user_id === p.user_id && r.date_repas === date && r.type_repas === type
                              );
                              if (repas) {
                                const choix = repas.choix_repas?.toLowerCase() || "";
                                if (choix === "12" || choix === "36") {
                                  lieuRepas = choix;
                                  label = "Oui";
                                  couleur = "bg-green-100 text-green-800";
                                } else if (choix.includes("pn")) {
                                  lieuRepas = p.residence;
                                  label = choix.includes("chaud") ? "Pique-nique chaud" : "Pique-nique froid";
                                  couleur = "bg-yellow-100 text-yellow-800";
                                } else if (choix.includes("plateau")) {
                                  lieuRepas = p.residence;
                                  label = "Plateau repas";
                                  couleur = "bg-blue-100 text-blue-800";
                                }
                                commentaire = repas.commentaire ?? "-";
                              } else {
                                lieuRepas = p.residence;
                                label = "Non";
                                couleur = "bg-red-100 text-red-800";
                                commentaire = "-";
                              }
                            }

                            if (lieuRepas !== openLieu) return null;

                            return (
                              <tr key={p.user_id + date + type} className="border-b">
                                <td className="p-2 font-medium">
                                  {p.prenom} {p.nom}
                                  {p.estInvite && p.inviteParPrenom && (
                                    <span className="text-xs text-green-600 ml-1">
                                      (invitée par {p.inviteParPrenom})
                                    </span>
                                  )}
                                </td>
                                <td className={`p-2`}>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${couleur}`}>
                                    {label}
                                  </span>
                                </td>
                                <td className="p-2 text-gray-700">{commentaire}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
