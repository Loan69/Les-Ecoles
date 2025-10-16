"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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

type RepasDetail = Personne & {
  choix_repas: string | null;
  commentaire: string | null;
};

export default function AdminRepasView() {
  const supabase = createClientComponentClient()
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [repasData, setRepasData] = useState<Repas[]>([]);
  const [residentes, setResidentes] = useState<Personne[]>([]);
  const [invitees, setInvitees] = useState<Personne[]>([]);
  const [loading, setLoading] = useState(true);
  const [openLieu, setOpenLieu] = useState<"12" | "36" | null>(null);

 // --- Initialisation des dates ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const today = new Date();
      setStartDate(
        localStorage.getItem("startDate") || today.toISOString().slice(0, 10)
      );
      setEndDate(
        localStorage.getItem("endDate") || today.toISOString().slice(0, 10)
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (startDate) localStorage.setItem("startDate", startDate);
      if (endDate) localStorage.setItem("endDate", endDate);
    }
  }, [startDate, endDate]);

  // --- Fetch repas ---
  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchRepas = async () => {
      setLoading(true);

      // On récupère aussi les repas du lendemain
      const dateObj = new Date(endDate);
      const tomorrow = new Date(dateObj);
      tomorrow.setDate(dateObj.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);

      const { data: repas, error: repasError } = await supabase
        .from("presences")
        .select("id_repas, user_id, date_repas, type_repas, choix_repas, commentaire")
        .gte("date_repas", startDate)
        .lte("date_repas", tomorrowStr); // 🟢 inclut le lendemain
      

      if (repasError) console.error("Erreur repas :", repasError);

      const { data: residentesData } = await supabase
        .from("residentes")
        .select("user_id, nom, prenom, residence");

      const { data: inviteesData } = await supabase
        .from("invitees")
        .select("user_id, nom, prenom");

      setRepasData(repas || []);
      setResidentes(
        residentesData?.map((r) => ({ ...r, type: "Résidente" as const })) || []
      );
      setInvitees(
        inviteesData?.map((i) => ({ ...i, type: "Invitée" as const })) || []
      );

      setLoading(false);
    };

    fetchRepas();
  }, [startDate, endDate]);

  const toutesPersonnes: Personne[] = [...residentes, ...invitees];
  const findPerson = (id_user: string) =>
    toutesPersonnes.find((p) => p.user_id === id_user);

  // --- Agrégation par lieu ---
  const summaryByLieu = (["12", "36"] as const).reduce(
    (acc, lieu) => ({
      ...acc,
      [lieu]: { dejeuner: 0, diner: 0, plateau: 0, piqueNique: 0 },
    }),
    {} as Record<
      "12" | "36",
      { dejeuner: number; diner: number; plateau: number; piqueNique: number }
    >
  );

  // --- 🧮 Comptage ---
  repasData.forEach((r) => {
    const personne = findPerson(r.user_id);
    if (!personne) return;

    const choix = r.choix_repas?.toLowerCase() || "";
    const dateRepas = r.date_repas;

    // 🕐 Calcul des dates utiles
    const today = startDate; // date du jour affiché
    const dateObj = new Date(today);
    const tomorrow = new Date(dateObj);
    tomorrow.setDate(dateObj.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // 🟢 Détermine le lieu du repas
    const lieuRepas =
      choix === "12" || choix === "36"
        ? choix
        : ["pique", "plateau"].some((kw) => choix.includes(kw))
        ? personne.residence?.toString()
        : undefined;

    if (!lieuRepas || (lieuRepas !== "12" && lieuRepas !== "36")) return;

    // 🟢 Cas plateau → compte toujours pour la date du jour
    if (choix.includes("plateau") && dateRepas === today) {
      summaryByLieu[lieuRepas].plateau++;
      return;
    }

    // 🟢 Cas pique-nique → compte UNIQUEMENT si c’est pour le lendemain
    if (choix.includes("pique") && dateRepas === tomorrowStr) {
      summaryByLieu[lieuRepas].piqueNique++;
      return;
    }

    // 🟢 Repas normaux : déjeuner/dîner du jour uniquement
    if (dateRepas === today && (choix.includes("oui") || choix === "12" || choix === "36")) {
      if (r.type_repas === "dejeuner") summaryByLieu[lieuRepas].dejeuner++;
      if (r.type_repas === "diner") summaryByLieu[lieuRepas].diner++;
    }
  });


  // VUE COMPTA PAR FOYER
  const comptaByResidence = (["12", "36"] as const).reduce(
    (acc, res) => ({
      ...acc,
      [res]: [] as { nom: string; prenom: string; dejeuner: number; diner: number; total: number }[],
    }),
    {} as Record<"12" | "36", { nom: string; prenom: string; dejeuner: number; diner: number; total: number }[]>
  );

  residentes.forEach((p) => {
    const repasPerso = repasData.filter((r) => r.user_id === p.user_id);
    let dejeuner = 0;
    let diner = 0;

    repasPerso.forEach((r) => {
      const choix = r.choix_repas?.toLowerCase() || "";
      // Tout sauf "non" est considéré comme un repas pour la compta
      if (!choix.includes("non")) {
        if (r.type_repas === "dejeuner") dejeuner++;
        if (r.type_repas === "diner") diner++;
      }
    });

    comptaByResidence[p.residence as "12" | "36"].push({
      nom: p.nom,
      prenom: p.prenom,
      dejeuner,
      diner,
      total: dejeuner + diner,
    });
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
          <h1 className="text-3xl font-bold text-amber-800 mb-2">
            Inscriptions aux repas
          </h1>
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

        {/* Résumé par lieu effectif (12 et 36) */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <HouseHeart />
            Total par lieu du repas
        </h2>
        <div className="flex flex-col md:flex-row justify-center gap-8 mb-10">
          {(["12", "36"] as const).map((lieu) => {
            const s = summaryByLieu[lieu];
            return (
              <div
                key={lieu}
                className="relative bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm w-full md:w-1/3 text-center"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-2xl font-bold text-orange-800">
                    Résidence {lieu}
                  </h3>
                  <button
                    onClick={() => setOpenLieu(lieu)}
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
        {/* VUE COMPTA PAR FOYER */}
        <div className="space-y-10">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <UserRound />
              Total par lieu de résidence des utilisatrices
          </h2>
          {(["12", "36"] as const).map((res) => (
            <div key={res} className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-amber-800 mb-4">
                Comptabilité - Résidence {res}
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
                  {comptaByResidence[res].map((p, idx) => (
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

        {/* Popup de détail */}
        <Dialog open={!!openLieu} onOpenChange={() => setOpenLieu(null)}>
          <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails des repas - Résidence {openLieu}</DialogTitle>
            </DialogHeader>

            {/* 🟢 On filtre les repas selon la plage sélectionnée */}
            {(() => {
              const repasFiltres = repasData.filter(
                (r) => r.date_repas >= startDate && r.date_repas <= endDate
              );

              const datesAffichees = Array.from(
                new Set(repasFiltres.map((r) => r.date_repas))
              ).sort();

              return datesAffichees.map((date) => (
                <div key={date} className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    📅{" "}
                    {new Date(date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })}
                  </h3>

                  {["dejeuner", "diner"].map((type) => (
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
                            // 🟢 Récupère les repas de cette personne pour ce jour et ce type
                            const repasJour = repasFiltres.filter(
                              (r) =>
                                r.user_id === p.user_id &&
                                r.date_repas === date &&
                                r.type_repas === type
                            );

                            // 🟢 Calcule le lieu du repas
                            const repasValide = repasJour.find((r) => {
                              const choix = r.choix_repas?.toLowerCase() || "";
                              const lieuRepas = ["pique", "plateau"].some((kw) =>
                                choix.includes(kw)
                              )
                                ? p.residence?.toString()
                                : choix;
                              return lieuRepas === openLieu;
                            });

                            let label = "Non";
                            let couleur = "bg-red-100 text-red-800";
                            let commentaire = "-";

                            if (repasValide) {
                              const choix = repasValide.choix_repas?.toLowerCase() || "";
                              commentaire = repasValide.commentaire ?? "-";

                              if (choix === openLieu) {
                                label = "Oui";
                                couleur = "bg-green-100 text-green-800";
                              } else if (choix.includes("pique")) {
                                label = choix.includes("chaud")
                                  ? "Pique-nique chaud"
                                  : "Pique-nique froid";
                                couleur = "bg-yellow-100 text-yellow-800";
                              } else if (choix.includes("plateau")) {
                                label = "Plateau repas";
                                couleur = "bg-blue-100 text-blue-800";
                              }
                            }

                            return (
                              <tr key={`${p.user_id}-${date}-${type}`} className="border-b">
                                <td className="p-2 font-medium">
                                  {p.prenom} {p.nom}
                                </td>
                                <td className="p-2">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs ${couleur}`}
                                  >
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
