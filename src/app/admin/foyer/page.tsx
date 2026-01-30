"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Moon, Search, Calendar, Building } from "lucide-react";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { Residence } from "@/types/Residence";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";

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
  const [residences, setResidences] = useState<Residence[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- Date persistée dans le localStorage ---
  useEffect(() => {
    const storedDate = localStorage.getItem("dateSelectionnee");
    if (storedDate) {
      setCurrentDate(parseDateKeyLocal(storedDate));
    } else {
      setCurrentDate(new Date());
    }
  }, []);

  // --- Sauvegarde de la date sélectionnée ---
  useEffect(() => {
    localStorage.setItem("dateSelectionnee", formatDateKeyLocal(currentDate));
    },[currentDate]);

  // --- Récupération des données ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // 1️⃣ Charger les résidences
      const { data: residencesData, error: resError } = await supabase
        .from("residences")
        .select("label, value")
        .order("label", { ascending: true });

      if (resError) {
        console.error("Erreur chargement résidences :", resError);
        setLoading(false);
        return;
      }

      setResidences(residencesData || []);

      // 2️⃣ Charger les habitantes (résidentes + invitées)
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

      // 3️⃣ Charger les absentes du jour
      const res = await fetch("/api/get-presence-foyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date : formatDateKeyLocal(currentDate) }),
      });

      const { absenteIds } = await res.json();

      const sorties = toutesPersonnes.filter((p) => absenteIds.includes(p.user_id));
      const presentes = toutesPersonnes.filter((p) => !absenteIds.includes(p.user_id));

      setPresentes(presentes);
      setSorties(sorties);
      setLoading(false);
    };

    fetchData();
  }, [currentDate]);

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

  const getParResidence = (resValue: string | number) => ({
    presentes: presentes.filter((p) => p.residence?.toString() === resValue.toString()),
    sorties: sorties.filter((p) => p.residence?.toString() === resValue.toString()),
  });

  // --- Palette de couleurs dynamiques ---
  const colorClasses = [
    { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", icon: "text-purple-600" },
    { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-800", icon: "text-indigo-600" },
    { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-800", icon: "text-pink-600" },
    { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", icon: "text-blue-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-10 px-6 transition-all">
      <div className="max-w-6xl mx-auto">
        {/* --- Header --- */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">
            Vue d&apos;ensemble des présences par résidence
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
              value={formatDateKeyLocal(currentDate)}
              onChange={(e) => setCurrentDate(parseDateKeyLocal(e.target.value))}
              className="bg-transparent outline-none text-gray-700 cursor-pointer"
            />
          </div>
        </div>

        {/* --- Tuiles par résidence --- */}
        <AnimatePresence mode="wait">
          <motion.div
            key={formatDateKeyLocal(currentDate)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {residences.map((res, index) => {
              const { presentes: pRes, sorties: sRes } = getParResidence(res.value);
              const toutes = [...pRes, ...sRes];
              const filtered = filterBySearch(toutes);
              const color = colorClasses[index % colorClasses.length];

              return (
                <div
                  key={res.value}
                  className={`rounded-2xl p-6 shadow-sm border ${color.bg} ${color.border}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Building className={`w-5 h-5 ${color.icon}`} />
                      <h2 className={`text-xl font-semibold ${color.text}`}>
                        {res.label}
                      </h2>
                    </div>
                    <span className={`text-sm font-medium ${color.text}`}>
                      {toutes.length} {toutes.length > 1 ? "personnes" : "personne"}
                    </span>
                  </div>

                  {filtered.length > 0 ? (
                    <ul className="space-y-2">
                      {filtered
                        .sort((a, b) => a.nom.localeCompare(b.nom))
                        .map((p) => {
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
                                {p.nom} {p.prenom}
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
