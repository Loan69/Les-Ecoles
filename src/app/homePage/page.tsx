"use client";

import { useState, useEffect } from "react";
import LogoutButton from "../components/logoutButton";
import PresenceButton from "../components/presenceButton";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import { Eye } from "lucide-react";
import InviteModal from "../components/inviteModal";
import { useRouter } from "next/navigation";

export default function HomePage() {
    const [dateJour, setDateJour] = useState("");
    const [repasDejeuner, setRepasDejeuner] = useState(false);
    const [repasDiner, setRepasDiner] = useState(false);
    const [nbDejeuner, setNbDejeuner] = useState<number | null>(null);
    const [nbDiner, setNbDiner] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirmationMsg, setConfirmationMsg] = useState("");
    const router = useRouter();
    const [locked, setLocked] = useState(false);

    // Gérer l'ouverture de modal d'invitation
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Format date en français
    useEffect(() => {
    const today = new Date();
    const formatted = today.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    setDateJour(formatted.charAt(0).toUpperCase() + formatted.slice(1));
    }, []);

    // --- Vérifie si modification possible (avant 8h30 heure FR) ---
  useEffect(() => {
    const now = new Date();
    const parisTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Paris" })
    );

    if (
      parisTime.getHours() > 8 ||
      (parisTime.getHours() === 8 && parisTime.getMinutes() >= 30)
    ) {
      setLocked(true);
      setConfirmationMsg("Les présences ne sont plus modifiables après 8h30.");
    } else {
      setLocked(false);
      setConfirmationMsg("");
    }
  }, []);

  // --- Récupération des présences globales et perso ---
  const fetchPresences = async () => {
    setLoading(true);
    const dateToday = new Date().toISOString().split("T")[0];

    // Récupère les présences totales
    const { data, error } = await supabase
      .from("presences")
      .select("user_id, type_repas, date_repas")
      .eq("date_repas", dateToday);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Compte pour affichage
    const dejeunerCount = data.filter((p) => p.type_repas === "dejeuner").length;
    const dinerCount = data.filter((p) => p.type_repas === "diner").length;
    setNbDejeuner(dejeunerCount);
    setNbDiner(dinerCount);

    // Récupère l’utilisateur courant
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const userPresences = data.filter((p) => p.user_id === user.id);
      setRepasDejeuner(userPresences.some((p) => p.type_repas === "dejeuner"));
      setRepasDiner(userPresences.some((p) => p.type_repas === "diner"));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPresences();
  }, []);

  // --- Fonction toggle repas (insert/delete) ---
  const handleToggleRepas = async (repas: "dejeuner" | "diner") => {
    if (locked) {
      setConfirmationMsg("Les présences ne sont plus modifiables après 8h30.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setConfirmationMsg("Vous devez être connectée pour modifier vos repas.");
      return;
    }

    const dateToday = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("presences")
      .select("id_repas")
      .eq("user_id", user.id)
      .eq("date_repas", dateToday)
      .eq("type_repas", repas)
      .maybeSingle();

    if (existing) {
      // 🔴 Supprime la présence
      const { error } = await supabase
        .from("presences")
        .delete()
        .eq("id_repas", existing.id_repas);

      if (error) {
        console.error(error);
        setConfirmationMsg("Erreur lors de la désinscription.");
        return;
      }
      if (repas === "dejeuner") setRepasDejeuner(false);
      else setRepasDiner(false);
    } else {
      // 🟢 Ajoute la présence
      const { error } = await supabase
        .from("presences")
        .insert({
            user_id: user.id,
            type_repas: repas,
            date_repas: dateToday,
        });

      if (error) {
        console.error(error);
        setConfirmationMsg("Erreur lors de l'enregistrement.");
        return;
      }
      if (repas === "dejeuner") setRepasDejeuner(true);
      else setRepasDiner(true);
    }

    // Actualise les compteurs
    fetchPresences();
  };


    return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-white px-4 pt-6">
        {/* Bouton de déconnexion */}
        <div className="w-full max-w-md">
            <div className="flex justify-end mb-4">
            <LogoutButton />
            </div>
        </div>

        {/* Logo */}
        <div className="flex w-full max-w-md items-center justify-between">
            <Image
                src="/logo.png"
                alt="Logo des écoles"
                width={400}   // ajuster selon la taille souhaitée
                height={400}
                className="mb-3"
            />
        </div>

        {/* Switch de présence au foyer */}
        <div className="flex flex-col items-center mt-4 space-y-2">
            <PresenceButton />
        </div>

        {/* Onglets statiques */}
        <div className="flex mt-6">
            <button className="px-4 py-1 rounded-t-lg bg-white border border-gray-300 text-blue-700 font-semibold">
                12
            </button>
            <button className="px-4 py-1 rounded-t-lg bg-yellow-400 text-white font-semibold ml-1 shadow">
                36
            </button>
        </div>

        {/* Date du jour */}
        <div className="bg-gray-50 rounded-b-xl shadow w-full max-w-md text-center py-4">
            <h2 className="text-lg font-semibold text-blue-800">{dateJour}</h2>
        </div>

        {/* Évènements */}
        <section className="mt-6 w-full max-w-md bg-gray-50 rounded-xl p-4 shadow text-left">
            <h2 className="text-lg font-semibold text-blue-700 mb-3">Évènements du jour</h2>
            <div className="flex items-center mb-2">
                <span className="w-3 h-3 bg-pink-400 rounded-full mr-2"></span>
                <p className="text-gray-700 text-sm flex-1">
                Anniversaire d’Agathe ! (n°36 à 18h)
                </p>
                <input type="checkbox" className="accent-green-500 scale-110" />
            </div>
            <div className="flex items-center">
                <span className="w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
                <p className="text-gray-700 text-sm flex-1">
                Lingerie : Descendre draps avant 8h
                </p>
                <input type="checkbox" className="accent-green-500 scale-110" checked readOnly/>
            </div>
        </section>

        {/* Présence aux repas */}
        <section className="mt-6 w-full max-w-md bg-gray-50 rounded-xl p-5 shadow text-center">
            <h2 className="text-lg font-semibold text-blue-800 mb-4">Présence aux repas</h2>

            {loading ? (
                <p className="text-gray-500">Chargement...</p>
            ) : (
                <>
                    {/* Déjeuner */}
                    <div className="flex items-center justify-between bg-blue-100 rounded-lg px-4 py-3 mb-3">
                    <div className="flex items-center space-x-2">
                        <p className="font-semibold text-blue-900">Déjeuner</p>
                        <div className="flex items-center text-blue-700">
                        <Eye className="w-4 h-4 mr-1" />
                        <span className="font-medium">{nbDejeuner}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => handleToggleRepas("dejeuner")}
                        className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
                            locked
                            ? "bg-gray-300 cursor-not-allowed":
                            repasDejeuner
                                ? "bg-blue-700"
                                : "bg-gray-300"
                        }`}
                    >
                        <span
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transform transition-transform duration-300 ${
                            repasDejeuner ? "translate-x-8" : "translate-x-0"
                        }`}
                        />
                    </button>
                    </div>

                    {/* Dîner */}
                    <div className="flex items-center justify-between bg-blue-100 rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                        <p className="font-semibold text-blue-900">Dîner</p>
                        <div className="flex items-center text-blue-700">
                        <Eye className="w-4 h-4 mr-1" />
                        <span className="font-medium">{nbDiner}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => handleToggleRepas("diner")}
                        className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
                            locked
                            ? "bg-gray-300 cursor-not-allowed":
                            repasDiner
                                ? "bg-blue-700"
                                : "bg-gray-300"
                        }`}
                    >
                        <span
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transform transition-transform duration-300 ${
                            repasDiner ? "translate-x-8" : "translate-x-0"
                        }`}
                        />
                    </button>
                    </div>
                </>
            )}

            {confirmationMsg && (
                <p className="mt-3 text-green-600 font-semibold text-sm">{confirmationMsg}</p>
            )}

            <div className="flex justify-between mt-6">
                <button
                    className="border border-blue-700 text-blue-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-50 cursor-pointer"
                    onClick={() => (router.push("/admin/repas"))}
                >
                Voir les inscriptions
                </button>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-900 cursor-pointer">
                    Inviter quelqu’un
                </button>
            </div>
            {/* Gestion des modales */}
            <button onClick={() => setIsModalOpen(true)} />
                <InviteModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
        </section>
    </main>
    );
}
