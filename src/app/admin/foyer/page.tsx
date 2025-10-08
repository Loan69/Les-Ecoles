"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { motion } from "framer-motion";
import { Home, Moon, Search, Calendar } from "lucide-react";

type Personne = {
  user_id: string;
  nom: string;
  prenom: string;
  type: "Résidente" | "Invitée";
};

export default function AdminFoyerView() {
    const [presentes, setPresentes] = useState<Personne[]>([]);
    const [sorties, setSorties] = useState<Personne[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [search, setSearch] = useState("");

    useEffect(() => {
    const fetchData = async () => {
        setLoading(true);

        // --- Récupération des résidentes ---
        const { data: residentesData } = await supabase
        .from("residentes")
        .select("user_id, nom, prenom");

        // --- Récupération des invitées ---
        const { data: inviteesData } = await supabase
        .from("invitees")
        .select("user_id, nom, prenom");

        const toutesPersonnes: Personne[] = [
            ...(residentesData?.map((r) => ({ ...r, type: "Résidente" as const})) || []),
            ...(inviteesData?.map((i) => ({ ...i, type: "Invitée" as const})) || []),
        ];


        // --- Récupération des absentes du jour sélectionné ---
        const { data: absentes } = await supabase
        .from("absences")
        .select("user_id")
        .eq("date_absence", date);


        const absenteIds = absentes?.map((a) => a.user_id) || [];

        // --- Filtrage des présentes / sorties ---
        const sorties = toutesPersonnes.filter((p) => absenteIds.includes(p.user_id));
        const presentes = toutesPersonnes.filter((p) => !absenteIds.includes(p.user_id));

        setPresentes(presentes);
        setSorties(sorties);
        setLoading(false);

    };

    fetchData();
    }, [date]);

    // --- Filtrage recherche ---
    const filterBySearch = (list: Personne[]) =>
    list.filter(
        (p) =>
        p.nom.toLowerCase().includes(search.toLowerCase()) ||
        p.prenom.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
    return (
        <div className="flex justify-center bg-white items-center h-screen text-black text-lg">
            Chargement des données…
        </div>
    );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-10 px-6">
            <div className="max-w-6xl mx-auto">
            {/* --- Header --- */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-blue-800 mb-2">
                Vue d’ensemble des présences
                </h1>
                <p className="text-gray-600">
                Consultez en un coup d’œil qui est au foyer et qui est sortie.
                </p>
            </div>

            {/* --- Filtres --- */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                {/* Recherche */}
                <div className="relative w-full md:w-1/2">
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Rechercher une habitante..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 text-blackdfv rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                    />
                </div>

                {/* Sélecteur de date */}
                <div className="relative flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm">
                    <Calendar className="text-gray-500 w-5 h-5 mr-2" />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-transparent outline-none text-gray-700"
                    />
                </div>
            </div>

            {/* --- Grille principale --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* --- Présentes --- */}
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Home className="text-green-600 w-5 h-5" />
                    <h2 className="text-xl font-semibold text-green-800">
                    Présentes au foyer
                    </h2>
                </div>

                {filterBySearch(presentes).length > 0 ? (
                    <motion.ul
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-2"
                    >
                    {filterBySearch(presentes).map((p) => (
                        <li
                        key={p.user_id}
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
                        <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                            au foyer
                        </span>
                        </li>
                    ))}
                    </motion.ul>
                ) : (
                    <p className="text-gray-500 italic">Aucune habitante trouvée.</p>
                )}
                </div>

                {/* --- Sorties --- */}
                <div className="bg-pink-50 border border-pink-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Moon className="text-pink-600 w-5 h-5" />
                    <h2 className="text-xl font-semibold text-pink-800">
                    Sorties ce soir
                    </h2>
                </div>

                {filterBySearch(sorties).length > 0 ? (
                    <motion.ul
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-2"
                    >
                        {filterBySearch(sorties).map((p) => (
                            <li
                            key={p.user_id}
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
                            <span className="text-xs text-pink-700 bg-pink-100 px-2 py-1 rounded-full">
                                sortie
                            </span>
                            </li>
                        ))}
                    </motion.ul>
                ) : (
                    <p className="text-gray-500 italic">Aucune habitante trouvée.</p>
                )}
                </div>
            </div>
            </div>
        </div>
    );
}
