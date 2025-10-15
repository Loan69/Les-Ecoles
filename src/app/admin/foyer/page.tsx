"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Moon, Search, Calendar, Building } from "lucide-react";
import LoadingSpinner from "@/app/components/LoadingSpinner";

type Personne = {
  user_id: string;
  nom: string;
  prenom: string;
  residence?: string | number;
  type: "Résidente" | "Invitée";
};

export default function AdminFoyerView() {
  const [presentes, setPresentes] = useState<Personne[]>([]);
  const [sorties, setSorties] = useState<Personne[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // --- Date persistée dans le localStorage ---
  const [date, setDate] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dateSelectionnee") || new Date().toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });

  // --- Sauvegarde de la date sélectionnée ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dateSelectionnee", date);
    }
  }, [date]);

  // --- Récupération des données ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: residentesData } = await supabase
        .from("residentes")
        .select("user_id, nom, prenom, residence");

      const { data: inviteesData } = await supabase
        .from("invitees")
        .select("user_id, nom, prenom, residence");

      const toutesPersonnes: Personne[] = [
        ...(residentesData?.map((r) => ({ ...r, type: "Résidente" as const })) || []),
        ...(inviteesData?.map((i) => ({ ...i, type: "Invitée" as const })) || []),
      ];

      const res = await fetch("/api/get-presence-foyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });

      const { absenteIds } = await res.json();

      const sorties = toutesPersonnes.filter((p) => absenteIds.includes(p.user_id));
      const presentes = toutesPersonnes.filter((p) => !absenteIds.includes(p.user_id));

      setPresentes(presentes);
      setSorties(sorties);
      setLoading(false);
    };

    fetchData();
  }, [date]);

  const filterBySearch = (list: Personne[]) =>
    list.filter(
      (p) =>
        p.nom.toLowerCase().includes(search.toLowerCase()) ||
        p.prenom.toLowerCase().includes(search.toLowerCase())
    );

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );
  }

  // --- Groupement par résidence ---
  const residences = ["12", "36"];
  const getParResidence = (res: string) => ({
    presentes: presentes.filter((p) => p.residence?.toString() === res),
    sorties: sorties.filter((p) => p.residence?.toString() === res),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-10 px-6 transition-all">
      <div className="max-w-6xl mx-auto">
        {/* --- Header --- */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">
            Vue d’ensemble des présences par résidence
          </h1>
          <p className="text-gray-600">
            Consultez qui est au foyer ou sortie pour chaque résidence — à la date choisie.
          </p>
        </div>

        {/* --- Filtres --- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          {/* Recherche */}
          <div className="relative w-full md:w-1/2">
            <Search className="absolute left-3 top-2.5 text-black w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher une habitante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
            />
          </div>

          {/* Sélecteur de date */}
          <div className="relative flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm">
            <Calendar className="text-gray-500 w-5 h-5 mr-2" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent outline-none text-gray-700 cursor-pointer"
            />
          </div>
        </div>

        {/* --- Tuiles par résidence --- */}
        <AnimatePresence mode="wait">
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {residences.map((res) => {
              const { presentes: pRes, sorties: sRes } = getParResidence(res);
              const toutes = [...pRes, ...sRes];
              const filtered = filterBySearch(toutes);

              return (
                <div
                  key={res}
                  className={`rounded-2xl p-6 shadow-sm border ${
                    res === "12"
                      ? "bg-purple-50 border-purple-200"
                      : "bg-indigo-50 border-indigo-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Building
                        className={`w-5 h-5 ${
                          res === "12" ? "text-purple-600" : "text-indigo-600"
                        }`}
                      />
                      <h2
                        className={`text-xl font-semibold ${
                          res === "12" ? "text-purple-800" : "text-indigo-800"
                        }`}
                      >
                        Résidence {res}
                      </h2>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        res === "12" ? "text-purple-700" : "text-indigo-700"
                      }`}
                    >
                      {toutes.length} {toutes.length > 1 ? "personnes" : "personne"}
                    </span>
                  </div>

                  {filtered.length > 0 ? (
                    <ul className="space-y-2">
                      {filtered.map((p) => {
                        const isPresente = pRes.some((x) => x.user_id === p.user_id);
                        return (
                          <motion.li
                            key={p.user_id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white rounded-xl px-4 py-2 shadow-sm flex justify-between items-center"
                          >
                            <div>
                              <span className="font-medium text-gray-800">
                                {p.prenom} {p.nom}
                              </span>
                              <span className="ml-2 text-xs text-gray-500 italic">
                                ({p.type})
                              </span>
                            </div>
                            {isPresente ? (
                              <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                                <Home className="w-3 h-3" /> au foyer
                              </span>
                            ) : (
                              <span className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full flex items-center gap-1">
                                <Moon className="w-3 h-3" /> sortie
                              </span>
                            )}
                          </motion.li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Aucune habitante trouvée.</p>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
