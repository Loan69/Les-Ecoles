"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { CalendarDays, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

type Personne = {
  id_user: string;
  nom: string;
  prenom: string;
  type: "Résidente" | "Invitée";
};

type Repas = {
  id: number;
  date_repas: string;
  type_repas: "midi" | "soir";
  id_user: string;
};

export default function AdminRepasView() {
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [repasData, setRepasData] = useState<Repas[]>([]);
  const [residentes, setResidentes] = useState<Personne[]>([]);
  const [invitees, setInvitees] = useState<Personne[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRepas = async () => {
      setLoading(true);

      // --- Récupération des inscriptions ---
      const { data: repas, error: repasError } = await supabase
        .from("repas")
        .select("id, id_user, date_repas, type_repas")
        .eq("date_repas", date);

      if (repasError) console.error("Erreur repas :", repasError);

      // --- Récupération des personnes ---
      const { data: residentesData } = await supabase
        .from("résidentes")
        .select("id_user, nom, prenom");

      const { data: inviteesData } = await supabase
        .from("invitées")
        .select("id_user, nom, prenom");

      // --- Formatage des personnes ---
      const residentesFormatted: Personne[] =
        residentesData?.map((r) => ({ ...r, type: "Résidente" as const })) || [];
      const inviteesFormatted: Personne[] =
        inviteesData?.map((i) => ({ ...i, type: "Invitée" as const })) || [];

      setRepasData(repas || []);
      setResidentes(residentesFormatted);
      setInvitees(inviteesFormatted);
      setLoading(false);
    };

    fetchRepas();
  }, [date]);

  // --- Fusion personnes ---
  const toutesPersonnes: Personne[] = [...residentes, ...invitees];

  // --- Groupement par type de repas ---
  const repasMidi = repasData.filter((r) => r.type_repas === "midi");
  const repasSoir = repasData.filter((r) => r.type_repas === "soir");

  const findPerson = (id_user: string) =>
    toutesPersonnes.find((p) => p.id_user === id_user);

  const personnesMidi = repasMidi.map((r) => findPerson(r.id_user)).filter(Boolean);
  const personnesSoir = repasSoir.map((r) => findPerson(r.id_user)).filter(Boolean);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        Chargement des données…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-white py-10 px-6">
      <div className="max-w-5xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-amber-800 mb-2">
            Inscriptions aux repas
          </h1>
          <p className="text-gray-600">
            Consultez le nombre de personnes inscrites aux repas du jour.
          </p>
        </div>

        {/* Sélecteur de date */}
        <div className="flex justify-center items-center mb-8 gap-3">
          <CalendarDays className="text-amber-600" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-amber-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Grille repas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Repas du midi */}
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sun className="text-orange-600 w-5 h-5" />
              <h2 className="text-xl font-semibold text-orange-800">
                Repas du midi
              </h2>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Total :{" "}
              <span className="font-bold text-orange-700">
                {personnesMidi.length}
              </span>{" "}
              personne{personnesMidi.length > 1 ? "s" : ""}
            </p>

            {personnesMidi.length > 0 ? (
              <motion.ul
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-2"
              >
                {personnesMidi.map((p) => (
                  <li
                    key={p?.id_user}
                    className="bg-white rounded-xl px-4 py-2 shadow-sm flex justify-between items-center"
                  >
                    <span className="font-medium text-gray-800">
                      {p?.prenom} {p?.nom}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        p?.type === "Résidente"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {p?.type}
                    </span>
                  </li>
                ))}
              </motion.ul>
            ) : (
              <p className="text-gray-500 italic">
                Aucun inscrit pour le repas du midi.
              </p>
            )}
          </div>

          {/* Repas du soir */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Moon className="text-amber-600 w-5 h-5" />
              <h2 className="text-xl font-semibold text-amber-800">
                Repas du soir
              </h2>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Total :{" "}
              <span className="font-bold text-amber-700">
                {personnesSoir.length}
              </span>{" "}
              personne{personnesSoir.length > 1 ? "s" : ""}
            </p>

            {personnesSoir.length > 0 ? (
              <motion.ul
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-2"
              >
                {personnesSoir.map((p) => (
                  <li
                    key={p?.id_user}
                    className="bg-white rounded-xl px-4 py-2 shadow-sm flex justify-between items-center"
                  >
                    <span className="font-medium text-gray-800">
                      {p?.prenom} {p?.nom}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        p?.type === "Résidente"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {p?.type}
                    </span>
                  </li>
                ))}
              </motion.ul>
            ) : (
              <p className="text-gray-500 italic">
                Aucun inscrit pour le repas du soir.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
