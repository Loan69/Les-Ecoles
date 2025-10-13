"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { CalendarDays, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { Personne } from "@/types/Personne";
import { Repas } from "@/types/repas";
import LoadingSpinner from "@/app/components/LoadingSpinner";

type RepasDetail = Personne & {
  choix_repas: string | null;
  commentaire: string | null;
};


export default function AdminRepasView() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [repasData, setRepasData] = useState<Repas[]>([]);
  const [residentes, setResidentes] = useState<Personne[]>([]);
  const [invitees, setInvitees] = useState<Personne[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Initialisation des dates ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const today = new Date();
      const weekLater = new Date();
      weekLater.setDate(today.getDate() + 6);
      setStartDate(localStorage.getItem("startDate") || today.toISOString().slice(0, 10));
      setEndDate(localStorage.getItem("endDate") || weekLater.toISOString().slice(0, 10));
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

      const { data: repas, error: repasError } = await supabase
        .from("presences")
        .select("user_id, date_repas, type_repas, choix_repas, commentaire")
        .gte("date_repas", startDate)
        .lte("date_repas", endDate);

      if (repasError) console.error("Erreur repas :", repasError);

      const { data: residentesData } = await supabase
        .from("residentes")
        .select("user_id, nom, prenom");

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

  // --- Agrégation par jour ---
  const summary: Record<string, { midi: number; soir: number }> = {};
  const details: Record<string, { midi: RepasDetail[]; soir: RepasDetail[] }> = {};

  repasData.forEach((r) => {
    if (!summary[r.date_repas]) summary[r.date_repas] = { midi: 0, soir: 0 };
    if (!details[r.date_repas]) details[r.date_repas] = { midi: [], soir: [] };

    const personne = findPerson(r.user_id);
    if (!personne) return;

    if (r.type_repas === "dejeuner") {
      summary[r.date_repas].midi++;
      details[r.date_repas].midi.push({ ...personne, choix_repas: r.choix_repas, commentaire: r.commentaire ?? null });
    } else {
      summary[r.date_repas].soir++;
      details[r.date_repas].soir.push({ ...personne, choix_repas: r.choix_repas, commentaire: r.commentaire ?? null});
    }
  });

  // --- Agrégation par lieu (12 et 36) ---
  type LieuSummary = {
    dejeuner: number;
    diner: number;
    plateau: number;
    piqueNique: number;
  };

  const summaryByLieu: Record<"12" | "36", LieuSummary> = {
    "12": { dejeuner: 0, diner: 0, plateau: 0, piqueNique: 0 },
    "36": { dejeuner: 0, diner: 0, plateau: 0, piqueNique: 0 },
  };

  repasData.forEach((r) => {
    const is12 = r.choix_repas === "12";
    const is36 = r.choix_repas === "36";
    const isPlateau = r.choix_repas?.toLowerCase().includes("plateau");
    const isPiqueNique = r.choix_repas?.toLowerCase().includes("pique nique");

    if (is12) {
      if (r.type_repas === "dejeuner") summaryByLieu["12"].dejeuner++;
      else summaryByLieu["12"].diner++;
    }

    if (is36) {
      if (r.type_repas === "dejeuner") summaryByLieu["36"].dejeuner++;
      else summaryByLieu["36"].diner++;
    }

    if (isPlateau) {
      if (r.type_repas === "dejeuner") summaryByLieu["12"].plateau++;
      else summaryByLieu["36"].plateau++;
    }

    if (isPiqueNique) {
      if (r.type_repas === "dejeuner") summaryByLieu["12"].piqueNique++;
      else summaryByLieu["36"].piqueNique++;
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

        {/* Résumé par lieu (12 et 36) */}
        <div className="flex flex-col md:flex-row justify-center gap-8 mb-10">
          {(["12", "36"] as const).map((lieu) => {
            const s = summaryByLieu[lieu];
            return (
              <div
                key={lieu}
                className="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm w-full md:w-1/3 text-center"
              >
                <h3 className="text-2xl font-bold text-orange-800 mb-3">
                  Résidence {lieu}
                </h3>
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
                    <span>Pique-niques</span>
                    <span className="font-semibold">{s.piqueNique}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>



        {/* Détails par jour */}
        {Object.entries(details).map(([date, d]) => (
          <div key={date} className="mb-8">
            <h3 className="text-xl font-bold text-amber-800 mb-4">{date}</h3>

            {/* Déjeuner */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="text-orange-600 w-5 h-5" />
                <h4 className="text-orange-800 font-semibold">Déjeuner</h4>
                <span className="ml-auto font-bold text-orange-700">{d.midi.length} personne{d.midi.length > 1 ? "s" : ""}</span>
              </div>
              {d.midi.length > 0 ? (
                <motion.ul
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  {d.midi.map((p) => (
                    <li key={p.user_id} className="bg-white rounded-xl px-4 py-2 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center">
                      <div className="flex items-center gap-2 mb-1 md:mb-0">
                        <span className="font-medium text-gray-800">{p.prenom} {p.nom}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          p.type === "Résidente" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                        }`}>{p.type}</span>
                      </div>
                      <div className="text-gray-600 text-sm flex flex-col md:flex-row md:items-center gap-2">
                        <span>Choix : {p.choix_repas}</span>
                        {p.commentaire && <span className="italic">({p.commentaire})</span>}
                      </div>
                    </li>
                  ))}
                </motion.ul>
              ) : (
                <p className="text-gray-500 italic">Aucun inscrit pour ce repas.</p>
              )}
            </div>

            {/* Dîner */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="text-orange-600 w-5 h-5" />
                <h4 className="text-orange-800 font-semibold">Dîner</h4>
                <span className="ml-auto font-bold text-orange-700">{d.soir.length} personne{d.soir.length > 1 ? "s" : ""}</span>
              </div>
              {d.soir.length > 0 ? (
                <motion.ul
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  {d.soir.map((p) => (
                    <li key={p.user_id} className="bg-white rounded-xl px-4 py-2 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center">
                      <div className="flex items-center gap-2 mb-1 md:mb-0">
                        <span className="font-medium text-gray-800">{p.prenom} {p.nom}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          p.type === "Résidente" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                        }`}>{p.type}</span>
                      </div>
                      <div className="text-gray-600 text-sm flex flex-col md:flex-row md:items-center gap-2">
                        <span>Choix : {p.choix_repas}</span>
                        {p.commentaire && <span className="italic">({p.commentaire})</span>}
                      </div>
                    </li>
                  ))}
                </motion.ul>
              ) : (
                <p className="text-gray-500 italic">Aucun inscrit pour ce repas.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
